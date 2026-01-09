import { defineWorker } from "#processor"
import { MetricsTime, type Job } from "bullmq"
import type { IndexerJobData } from "../queues/indexer"
import { QUEUE_NAME, indexerJobDataSchema } from "../queues/indexer"
import { db } from "../utils/db"
import { serieIndex } from "../utils/meilisearch"
import type { SerieField } from "../utils/serie"
import { resolveMultiLanguage, resolveMultiLanguageArray } from "../utils/serie"
import type { MultiLanguage } from "../utils/sources/core"

async function processUpdate(job: Job<IndexerJobData>, serieId: string) {
	job.log(`Indexing serie ${serieId}`)

	// 1. Load serie with all sources and relations
	const serie = await db.serie.findUnique({
		where: { id: serieId },
		include: {
			sources: { orderBy: { is_primary: "desc" } },
			genres: { select: { title: true } },
			authors: { select: { name: true } },
			artists: { select: { name: true } },
			_count: { select: { chapters: { where: { enabled: true } } } },
		},
	})

	if (!serie || serie.sources.length === 0) {
		// No sources, remove from index
		job.log("No sources found, removing from index")
		await serieIndex.deleteDocument(serieId)
		return
	}

	const primarySource = serie.sources[0]
	if (!primarySource) {
		job.log("No primary source found, removing from index")
		await serieIndex.deleteDocument(serieId)
		return
	}

	await job.updateProgress(30)

	const lockedFields = new Set(serie.locked_fields as SerieField[])

	// 2. Build updates for non-locked fields
	const updates: {
		title?: string
		synopsis?: string | null
		status?: typeof serie.status
		type?: typeof serie.type
		cover?: string | null
	} = {}

	if (!lockedFields.has("title")) {
		updates.title = resolveMultiLanguage(primarySource.title as MultiLanguage)
	}
	if (!lockedFields.has("synopsis")) {
		const synopsis = resolveMultiLanguage(primarySource.synopsis as MultiLanguage | null, "")
		updates.synopsis = synopsis || null
	}
	if (!lockedFields.has("status")) {
		updates.status = primarySource.status
	}
	if (!lockedFields.has("type")) {
		updates.type = primarySource.type
	}

	// Cover logic:
	// - If locked with custom_cover: use custom_cover
	// - If locked without custom_cover: don't change
	// - If not locked: use primary source's S3 URL
	if (lockedFields.has("cover")) {
		if (serie.custom_cover) {
			updates.cover = serie.custom_cover
		}
		// else: locked but no custom_cover = don't update, keep existing
	}
	else {
		// Use S3 URL from primary source (set by Cover Update worker)
		// Fallback to source URL if S3 not yet processed
		updates.cover = primarySource.cover ?? primarySource.cover_source_url
	}

	await job.updateProgress(50)

	// 3. Update PostgreSQL
	const updated = await db.serie.update({
		where: { id: serieId },
		data: {
			...updates,
			refreshed_at: new Date(),
		},
	})

	await job.updateProgress(70)

	// 4. Build search data from all sources (for comprehensive search)
	const allTitles: string[] = []
	const allAlternateTitles: string[] = []
	const allSynopses: string[] = []

	for (const source of serie.sources) {
		// Collect all language variants for search
		const titles = resolveMultiLanguageArray(source.title as MultiLanguage)
		if (titles) allTitles.push(...titles)

		const alternates = resolveMultiLanguageArray(source.alternates_titles as MultiLanguage | null)
		if (alternates) allAlternateTitles.push(...alternates)

		const synopses = resolveMultiLanguageArray(source.synopsis as MultiLanguage | null)
		if (synopses) allSynopses.push(...synopses)
	}

	// Deduplicate
	const uniqueTitles = [...new Set(allTitles)]
	const uniqueAlternateTitles = [...new Set(allAlternateTitles)]
	const uniqueSynopses = [...new Set(allSynopses)]

	// 5. Update Meilisearch
	await serieIndex.updateDocuments(
		[
			{
				id: updated.id,
				// Primary display values
				title_En: [updated.title],
				synopsis_En: uniqueSynopses,
				// All searchable content from all sources
				title_Jp: uniqueTitles.filter(t => t !== updated.title),
				alternates_titles_En: uniqueAlternateTitles,
				// Metadata
				artists: serie.artists.map(a => a.name),
				authors: serie.authors.map(a => a.name),
				genres: serie.genres.map(g => g.title),
				status: updated.status,
				type: updated.type,
				poster: updated.cover ?? "",
				// Source info - use first source for backwards compatibility
				external_id: primarySource.external_id,
				source_id: primarySource.source_id,
			},
		],
		{ primaryKey: "id" },
	)

	await job.updateProgress(100)
	job.log(`Serie indexed successfully: ${updated.title}`)
}

async function processDelete(job: Job<IndexerJobData>, serieId: string) {
	job.log(`Deleting serie ${serieId} from index`)
	await serieIndex.deleteDocument(serieId)
	await job.updateProgress(100)
	job.log("Serie removed from index")
}

export default defineWorker<typeof QUEUE_NAME, IndexerJobData, undefined>({
	name: QUEUE_NAME,
	options: {
		concurrency: 100,
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job) {
		const { serie_id, type } = indexerJobDataSchema.parse(job.data)

		await job.updateProgress(10)

		if (type === "DELETE") {
			await processDelete(job, serie_id)
		}
		else if (type === "UPDATE") {
			await processUpdate(job, serie_id)
		}
	},
})
