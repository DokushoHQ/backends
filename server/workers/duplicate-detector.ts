import { defineWorker } from "#processor"
import { MetricsTime, type Job } from "bullmq"
import {
	type DuplicateDetectorJobData,
	duplicateDetectorJobDataSchema,
	QUEUE_NAME,
} from "../queues/duplicate-detector"
import { db } from "../utils/db"
import { serieIndex } from "../utils/meilisearch"
import type { DuplicateGroupMember } from "../utils/prisma-json"
import type { MultiLanguage } from "../utils/sources/core"

// Extract all titles from a serie's sources for searching
function extractAllTitles(sources: Array<{
	title: unknown
	alternates_titles: unknown
}>): string[] {
	const titles: string[] = []

	for (const source of sources) {
		const titleMl = source.title as MultiLanguage
		const altMl = source.alternates_titles as MultiLanguage | null

		// Get main titles from all languages
		if (titleMl) {
			for (const values of Object.values(titleMl)) {
				titles.push(...values)
			}
		}

		// Get alternate titles from all languages
		if (altMl) {
			for (const values of Object.values(altMl)) {
				titles.push(...values)
			}
		}
	}

	return [...new Set(titles)]
}

async function finalize(
	job: Job<DuplicateDetectorJobData>,
	duplicatePairs: Map<string, Map<string, number>>,
): Promise<number> {
	job.log("Finalizing duplicate detection...")

	if (duplicatePairs.size === 0) {
		job.log("No duplicates found")
		return 0
	}

	// Collect all unique serie IDs from pairs
	const allSerieIds = new Set<string>()
	for (const [id1, others] of duplicatePairs) {
		allSerieIds.add(id1)
		for (const id2 of others.keys()) {
			allSerieIds.add(id2)
		}
	}

	// Fetch existing dismissed/merged groups to avoid recreating them
	const existingGroups = await db.duplicateGroup.findMany({
		where: {
			status: { in: ["Dismissed", "Merged"] },
		},
		select: { members: true },
	})

	// Build a set of already-handled pairs (normalized as "id1:id2" where id1 < id2)
	const handledPairs = new Set<string>()
	for (const group of existingGroups) {
		const members = group.members as DuplicateGroupMember[]
		if (members.length === 2) {
			const [id1, id2] = [members[0].serieId, members[1].serieId].sort()
			handledPairs.add(`${id1}:${id2}`)
		}
	}

	job.log(`Found ${handledPairs.size} already handled pairs (dismissed/merged)`)

	// Fetch serie data for all members
	const seriesData = await db.serie.findMany({
		where: { id: { in: [...allSerieIds] } },
		select: {
			id: true,
			title: true,
			cover: true,
			sources: {
				select: { is_primary: true },
				orderBy: { is_primary: "desc" },
			},
			_count: {
				select: { chapters: { where: { enabled: true } } },
			},
		},
	})
	const seriesMap = new Map(seriesData.map(s => [s.id, s]))

	// Create one DuplicateGroup per pair (no transitive clustering)
	const groupsToCreate: Array<{
		confidence: number
		members: DuplicateGroupMember[]
		suggested_primary_id: string
	}> = []

	let skippedCount = 0
	for (const [id1, others] of duplicatePairs) {
		for (const [id2, similarity] of others) {
			// Skip pairs that were already dismissed or merged
			const pairKey = `${id1}:${id2}` // Already sorted in detection loop
			if (handledPairs.has(pairKey)) {
				skippedCount++
				continue
			}

			const serie1 = seriesMap.get(id1)
			const serie2 = seriesMap.get(id2)
			if (!serie1 || !serie2) continue

			// Determine which should be suggested as primary (most chapters, or has primary source)
			const chapters1 = serie1._count.chapters
			const chapters2 = serie2._count.chapters
			const hasPrimary1 = serie1.sources.some(s => s.is_primary)

			let suggestedPrimaryId: string
			if (chapters1 > chapters2) {
				suggestedPrimaryId = id1
			}
			else if (chapters2 > chapters1) {
				suggestedPrimaryId = id2
			}
			else if (hasPrimary1) {
				suggestedPrimaryId = id1
			}
			else {
				suggestedPrimaryId = id2
			}

			const members: DuplicateGroupMember[] = [
				{ serieId: id1, similarity, titles: [serie1.title] },
				{ serieId: id2, similarity, titles: [serie2.title] },
			]

			groupsToCreate.push({
				confidence: similarity,
				members,
				suggested_primary_id: suggestedPrimaryId,
			})
		}
	}

	if (skippedCount > 0) {
		job.log(`Skipped ${skippedCount} pairs (already dismissed/merged)`)
	}
	job.log(`Creating ${groupsToCreate.length} duplicate pair groups`)

	// Batch create duplicate groups
	if (groupsToCreate.length > 0) {
		await db.duplicateGroup.createMany({
			data: groupsToCreate.map(g => ({
				confidence: g.confidence,
				members: g.members,
				suggested_primary_id: g.suggested_primary_id,
				status: "Pending",
			})),
		})
		job.log(`Created ${groupsToCreate.length} duplicate groups`)
	}

	return groupsToCreate.length
}

export default defineWorker<typeof QUEUE_NAME, DuplicateDetectorJobData, undefined>({
	name: QUEUE_NAME,
	options: {
		concurrency: 1, // Only one detection job at a time
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
		lockDuration: 300000, // 5 minutes - hybrid search can be slow
	},
	async processor(job) {
		const { threshold, batchSize, forceRefresh } = duplicateDetectorJobDataSchema.parse(job.data)

		// Clear existing pending groups if forceRefresh
		if (forceRefresh) {
			const deleted = await db.duplicateGroup.deleteMany({
				where: { status: "Pending" },
			})
			job.log(`Cleared ${deleted.count} existing pending duplicate groups`)
		}

		// Get total count for progress calculation
		const totalCount = await db.serie.count({
			where: { soft_deleted_at: null },
		})

		job.log(`Starting duplicate detection for ${totalCount} series`)
		await job.updateProgress(5)

		// Store for accumulating duplicates (local to this job)
		const duplicatePairs = new Map<string, Map<string, number>>()
		const config = useRuntimeConfig()

		// Cache for series metadata (authors/artists)
		const seriesMetadata = new Map<string, { authors: string[], artists: string[] }>()

		// Helper to check if two sets have any overlap
		function hasOverlap(arr1: string[], arr2: string[]): boolean {
			const set1 = new Set(arr1.map(s => s.toLowerCase()))
			return arr2.some(s => set1.has(s.toLowerCase()))
		}

		let offset = 0
		let processedCount = 0

		// Process all batches in a single job
		while (true) {
			const series = await db.serie.findMany({
				skip: offset,
				take: batchSize,
				where: { soft_deleted_at: null },
				orderBy: { created_at: "asc" },
				select: {
					id: true,
					title: true,
					authors: { select: { name: true } },
					artists: { select: { name: true } },
					sources: {
						select: {
							title: true,
							alternates_titles: true,
							is_primary: true,
						},
					},
				},
			})

			if (series.length === 0) break

			job.log(`Processing batch: ${offset} - ${offset + series.length} of ${totalCount}`)

			for (const serie of series) {
				const allTitles = extractAllTitles(serie.sources)
				if (allTitles.length === 0) continue

				// Extract and cache authors/artists for this serie
				const authors = serie.authors.map(a => a.name)
				const artists = serie.artists.map(a => a.name)
				seriesMetadata.set(serie.id, { authors, artists })

				// Search Meilisearch for similar series using hybrid search if available
				const searchQuery = allTitles.slice(0, 5).join(" ")
				const searchOptions: Parameters<typeof serieIndex.search>[1] = {
					limit: 10,
					showRankingScore: true,
					filter: `soft_deleted = false`,
				}

				// Use hybrid search if embedder is configured
				// Lower semantic ratio to balance keyword matching (more precise for duplicates)
				if (config.openrouterApiKey) {
					searchOptions.hybrid = {
						embedder: "openrouter",
						semanticRatio: 0.5, // Balance between semantic and keyword matching
					}
				}

				const searchResult = await serieIndex.search(searchQuery, searchOptions)

				for (const hit of searchResult.hits) {
					if (hit.id === serie.id) continue
					const similarity = hit._rankingScore ?? 0
					if (similarity < threshold) continue

					// Additional validation: require author OR artist overlap
					// This filters out series with similar titles but different creators
					const hitAuthors = hit.authors ?? []
					const hitArtists = hit.artists ?? []
					const hasAuthorOverlap = hasOverlap(authors, hitAuthors)
					const hasArtistOverlap = hasOverlap(artists, hitArtists)

					// Skip if no creator overlap (unless both have no creators listed)
					const serieHasCreators = authors.length > 0 || artists.length > 0
					const hitHasCreators = hitAuthors.length > 0 || hitArtists.length > 0
					if (serieHasCreators && hitHasCreators && !hasAuthorOverlap && !hasArtistOverlap) {
						continue
					}

					// Store the pair (normalize order to avoid duplicates)
					const [id1, id2] = [serie.id, hit.id].sort()
					if (!duplicatePairs.has(id1)) {
						duplicatePairs.set(id1, new Map())
					}
					const existing = duplicatePairs.get(id1)!.get(id2) ?? 0
					duplicatePairs.get(id1)!.set(id2, Math.max(existing, similarity))
				}

				processedCount++

				// Update progress per serie (5-95% for scanning, 95-100% for finalization)
				const progress = Math.min(95, 5 + Math.round((processedCount / totalCount) * 90))
				await job.updateProgress(progress)
			}

			offset += series.length

			// Check if there are more batches
			if (series.length < batchSize) break
		}

		job.log(`Scanned ${processedCount} series, found ${duplicatePairs.size} potential duplicate pairs`)

		// Finalize - create groups for each pair
		const groupsCreated = await finalize(job, duplicatePairs)

		await job.updateProgress(100)
		job.log(`Duplicate detection complete. Created ${groupsCreated} groups.`)
	},
})
