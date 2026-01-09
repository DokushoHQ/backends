import { defineWorker } from "#processor"
import { MetricsTime, type FlowChildJob } from "bullmq"
import type { ChapterDataJobData } from "../queues/chapter-data"
import type { CoverUpdateJobData } from "../queues/cover-update"
import type { IndexerJobData } from "../queues/indexer"
import type { SerieInserterJobData, SerieInserterJobResult } from "../queues/serie-inserter"
import { QUEUE_NAME, serieInserterJobDataSchema } from "../queues/serie-inserter"
import { db } from "../utils/db"
import { getFlowProducer } from "../utils/flow-producer"
import type { Language, Prisma } from "../utils/db"
import { resolveMultiLanguage } from "../utils/serie"
import { createSources, getSourceById } from "../utils/sources"

export default defineWorker<typeof QUEUE_NAME, SerieInserterJobData, SerieInserterJobResult>({
	name: QUEUE_NAME,
	options: {
		concurrency: 2,
		limiter: { max: 2, duration: 5000 },
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job) {
		const log = (msg: string) => job.log(`[Attempt ${job.attemptsMade + 1}] ${msg}`)
		const { source_id: sourceId, source_serie_id: sourceSerieId } = serieInserterJobDataSchema.parse(job.data)

		await job.updateProgress(5)

		// Check if this source+external_id combination already exists
		const existingSerieSource = await db.serieSource.findUnique({
			where: {
				source_id_external_id: { source_id: sourceId, external_id: sourceSerieId },
			},
			select: { id: true, serie_id: true },
		})

		if (existingSerieSource) {
			log(`SerieSource ${sourceSerieId} already exists, running in update mode`)
		}

		const sourceRecord = await db.source.findUniqueOrThrow({
			where: { id: sourceId },
		})

		// Get source instance
		const config = useRuntimeConfig()
		const enabledLanguages = config.enabledLanguages
			?.split(",")
			.map((lang: string) => lang.trim())
			.filter(Boolean) as ("En" | "Fr")[]
		const sources = await createSources({
			ENABLED_LANGUAGE: enabledLanguages?.length ? enabledLanguages : ["En"],
			BYPARR_URL: config.byparrUrl,
			SUWAYOMI_URL: config.suwayomiUrl,
		})
		const source = getSourceById(sources, sourceRecord.external_id)

		await job.updateProgress(10)

		try {
			const [serieData, chaptersResult] = await Promise.all([
				source.fetchSerieDetail(sourceSerieId),
				source.fetchSerieChapters(sourceSerieId),
			])

			await job.updateProgress(30)
			const serieTitle = resolveMultiLanguage(serieData.title)
			log(`Fetched serie: ${serieTitle} with ${chaptersResult.chapters.length} chapters`)

			const { chapter_ids, serie_id, serie_source_id } = await db.$transaction(async (tx) => {
				// Create genres, artists, authors first (skip duplicates)
				if (serieData.genres.length > 0) {
					await tx.genre.createMany({
						data: serieData.genres.map(g => ({ title: g })),
						skipDuplicates: true,
					})
				}
				await tx.artist.createMany({
					data: serieData.artists.map(a => ({ name: a })),
					skipDuplicates: true,
				})
				await tx.author.createMany({
					data: serieData.authors.map(a => ({ name: a })),
					skipDuplicates: true,
				})

				// Fetch the created/existing records to connect
				const genres = await tx.genre.findMany({
					select: { id: true },
					where: { title: { in: serieData.genres } },
				})
				const artists = await tx.artist.findMany({
					select: { id: true },
					where: { name: { in: serieData.artists } },
				})
				const authors = await tx.author.findMany({
					select: { id: true },
					where: { name: { in: serieData.authors } },
				})

				// Upsert scanlation groups
				const allGroups = chaptersResult.chapters.flatMap(c => c.groups)
				const uniqueGroups = new Map(allGroups.map(g => [g.id, g]))

				for (const group of uniqueGroups.values()) {
					await tx.scanlationGroup.upsert({
						where: {
							source_id_external_id: {
								source_id: sourceId,
								external_id: group.id,
							},
						},
						update: {
							name: group.name,
							...(group.url && { url: group.url.toString() }),
						},
						create: {
							source_id: sourceId,
							external_id: group.id,
							name: group.name,
							...(group.url && { url: group.url.toString() }),
						},
					})
				}

				// Build group ID map (external_id -> db id)
				const groupRecords = await tx.scanlationGroup.findMany({
					where: {
						source_id: sourceId,
						external_id: { in: [...uniqueGroups.keys()] },
					},
					select: { id: true, external_id: true },
				})
				const groupMap = new Map(groupRecords.map(g => [g.external_id, g.id]))

				let serieId: string
				let serieSourceId: string

				if (existingSerieSource) {
					// UPDATE PATH
					serieId = existingSerieSource.serie_id
					serieSourceId = existingSerieSource.id

					await tx.serieSource.update({
						where: { id: existingSerieSource.id },
						data: {
							title: serieData.title as Prisma.InputJsonValue,
							alternates_titles: serieData.alternatesTitles as Prisma.InputJsonValue,
							synopsis: serieData.synopsis as Prisma.InputJsonValue,
							cover_source_url: serieData.cover.toString(),
							status: serieData.status,
							type: serieData.type,
							updated_at: new Date(),
							...(serieData.externalUrl && { external_url: serieData.externalUrl.toString() }),
						},
					})
				}
				else {
					// CREATE PATH
					const newSerie = await tx.serie.create({
						data: {
							title: resolveMultiLanguage(serieData.title),
							synopsis: resolveMultiLanguage(serieData.synopsis, "") || null,
							type: serieData.type,
							status: serieData.status,
						},
					})
					serieId = newSerie.id

					const newSerieSource = await tx.serieSource.create({
						data: {
							serie_id: newSerie.id,
							source_id: sourceId,
							external_id: sourceSerieId,
							title: serieData.title as Prisma.InputJsonValue,
							alternates_titles: serieData.alternatesTitles as Prisma.InputJsonValue,
							synopsis: serieData.synopsis as Prisma.InputJsonValue,
							cover_source_url: serieData.cover.toString(),
							status: serieData.status,
							type: serieData.type,
							is_primary: true,
							...(serieData.externalUrl && { external_url: serieData.externalUrl.toString() }),
						},
					})
					serieSourceId = newSerieSource.id
				}

				// Connect genres, authors, artists to Serie
				await tx.serie.update({
					where: { id: serieId },
					data: {
						genres: { set: genres.map(g => ({ id: g.id })) },
						artists: { set: artists.map(a => ({ id: a.id })) },
						authors: { set: authors.map(a => ({ id: a.id })) },
					},
				})

				// Get existing chapters
				const existingChapters = await tx.chapter.findMany({
					where: { serie_id: serieId, source_id: sourceId },
					select: { external_id: true, date_upload: true, source_removed_at: true },
				})
				const existingChapterMap = new Map(existingChapters.map(c => [c.external_id, c.date_upload]))

				// Check for new chapters
				const hasNewChapters = chaptersResult.chapters.some(c => !existingChapterMap.has(c.id))

				if (hasNewChapters) {
					await tx.serie.update({
						where: { id: serieId },
						data: { updated_at: new Date() },
					})
				}

				// Upsert all chapters
				const upsertedChapters = await Promise.all(
					chaptersResult.chapters.map((c) => {
						const chapterGroupIds = c.groups
							.map(g => groupMap.get(g.id))
							.filter((id): id is string => id !== undefined)

						const resolvedTitle = resolveMultiLanguage(c.title, "") || null

						return tx.chapter.upsert({
							where: {
								source_id_external_id: { source_id: sourceId, external_id: c.id },
							},
							update: {
								chapter_number: c.chapterNumber,
								date_upload: c.dateUpload,
								title: resolvedTitle,
								source_removed_at: null, // Clear if chapter reappears on source
								source_removal_acknowledged_at: null, // Clear acknowledgment too
								...(c.externalUrl && { external_url: c.externalUrl.toString() }),
								...(c.volumeName !== undefined && { volume_name: c.volumeName }),
								...(c.volumeNumber !== undefined && { volume_number: c.volumeNumber }),
								groups: { set: chapterGroupIds.map(id => ({ id })) },
							},
							create: {
								serie_id: serieId,
								source_id: sourceId,
								external_id: c.id,
								chapter_number: c.chapterNumber,
								date_upload: c.dateUpload,
								language: c.language as Language,
								title: resolvedTitle,
								...(c.externalUrl && { external_url: c.externalUrl.toString() }),
								...(c.volumeName !== undefined && { volume_name: c.volumeName }),
								...(c.volumeNumber !== undefined && { volume_number: c.volumeNumber }),
								groups: { connect: chapterGroupIds.map(id => ({ id })) },
							},
						})
					}),
				)

				// Mark chapters that no longer exist on source
				const sourceChapterIds = new Set(chaptersResult.chapters.map(c => c.id))
				const removedChapterIds = existingChapters
					.filter(c => !sourceChapterIds.has(c.external_id) && c.source_removed_at === null)
					.map(c => c.external_id)

				if (removedChapterIds.length > 0) {
					await tx.chapter.updateMany({
						where: {
							serie_id: serieId,
							source_id: sourceId,
							external_id: { in: removedChapterIds },
						},
						data: {
							source_removed_at: new Date(),
							source_removal_acknowledged_at: null, // Reset acknowledgment on new removal
						},
					})
					job.log(`Marked ${removedChapterIds.length} chapters as removed from source`)
				}

				// Identify chapters needing refresh
				const chaptersToRefresh = upsertedChapters.filter((c) => {
					const oldDate = existingChapterMap.get(c.external_id)
					return !oldDate || oldDate.getTime() !== c.date_upload.getTime()
				})

				return {
					serie_id: serieId,
					serie_source_id: serieSourceId,
					chapter_ids: chaptersToRefresh.map(c => c.id),
				}
			})

			await job.updateProgress(70)
			log(`${existingSerieSource ? "Updated" : "Created"} serie ${serie_id} with ${chapter_ids.length} chapters to process`)

			// Build child jobs: Chapter Data + Cover Update
			const children: FlowChildJob[] = [
				// Cover Update job for the SerieSource
				{
					name: `cover-source-${serie_source_id}`,
					queueName: "cover-update",
					data: {
						type: "SOURCE",
						serie_source_id,
					} as CoverUpdateJobData,
				},
				// Chapter Data jobs
				...chapter_ids.map(chapter_id => ({
					name: `chapter-${serie_id}-${chapter_id}`,
					queueName: "chapter-data",
					data: {
						serie_id,
						source_id: sourceId,
						chapter_id,
						type: "UPDATE",
					} as ChapterDataJobData,
				})),
			]

			// Indexer is parent - runs after ALL children complete
			const flowProducer = getFlowProducer()
			await flowProducer.add({
				name: `indexer-${serie_id}`,
				queueName: "indexer",
				data: { serie_id, type: "UPDATE" } as IndexerJobData,
				children,
			})

			// Update last_checked_at and reset consecutive_failures
			await db.serieSource.update({
				where: { id: serie_source_id },
				data: {
					last_checked_at: new Date(),
					consecutive_failures: 0,
				},
			})

			await job.updateProgress(100)
			log(`Spawned ${chapter_ids.length} chapter jobs, cover update, and indexer`)

			return { serie_id, chapters_queued: chapter_ids.length }
		}
		catch (error) {
			// Increment consecutive_failures on error
			if (existingSerieSource) {
				await db.serieSource.update({
					where: { id: existingSerieSource.id },
					data: {
						last_checked_at: new Date(),
						consecutive_failures: { increment: 1 },
					},
				})
			}
			log(`Error processing serie ${sourceSerieId}: ${error}`)
			throw error
		}
	},
})
