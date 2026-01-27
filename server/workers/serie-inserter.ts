import { defineWorker } from "#processor"
import { DelayedError, MetricsTime } from "bullmq"
import type { ChapterDataJobData } from "../queues/chapter-data"
import type { ChapterDedupJobData } from "../queues/chapter-dedup"
import type { CoverUpdateJobData } from "../queues/cover-update"
import type { IndexerJobData } from "../queues/indexer"
import type { SerieInserterJobData, SerieInserterJobResult } from "../queues/serie-inserter"
import { JOB_PRIORITY, QUEUE_NAME, serieInserterJobDataSchema } from "../queues/serie-inserter"
import type { Language, Prisma } from "../utils/db"
import { db } from "../utils/db"
import { getFlowProducer } from "../utils/flow-producer"
import { resolveMultiLanguage } from "../utils/serie"
import { getSourceById } from "../utils/sources"

export default defineWorker<typeof QUEUE_NAME, SerieInserterJobData, SerieInserterJobResult>({
	name: QUEUE_NAME,
	options: {
		concurrency: 2,
		limiter: { max: 2, duration: 5000 },
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job, token) {
		const log = (msg: string) => job.log(`[Attempt ${job.attemptsMade + 1}] ${msg}`)
		const {
			source_id: sourceId,
			source_serie_id: sourceSerieId,
			target_serie_id: targetSerieId,
			is_primary: isPrimary,
		} = serieInserterJobDataSchema.parse(job.data)

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
		const sources = await getSources()
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

			const { chapter_ids, serie_id, serie_source_id, has_new_chapters } = await db.$transaction(async (tx) => {
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
					// UPDATE PATH - SerieSource already exists
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
				else if (targetSerieId) {
					// LINK PATH - Create SerieSource linked to existing Serie
					// Validate that target serie exists
					const targetSerie = await tx.serie.findUnique({
						where: { id: targetSerieId },
						select: { id: true },
					})
					if (!targetSerie) {
						throw new Error(`Target serie ${targetSerieId} not found`)
					}

					serieId = targetSerieId
					const isPrimaryValue = isPrimary ?? false
					const newSerieSource = await tx.serieSource.create({
						data: {
							serie_id: targetSerieId,
							source_id: sourceId,
							external_id: sourceSerieId,
							title: serieData.title as Prisma.InputJsonValue,
							alternates_titles: serieData.alternatesTitles as Prisma.InputJsonValue,
							synopsis: serieData.synopsis as Prisma.InputJsonValue,
							cover_source_url: serieData.cover.toString(),
							status: serieData.status,
							type: serieData.type,
							is_primary: isPrimaryValue,
							priority: isPrimaryValue ? 1 : 5,
							...(serieData.externalUrl && { external_url: serieData.externalUrl.toString() }),
						},
					})
					serieSourceId = newSerieSource.id
				}
				else {
					// CREATE PATH - New Serie + SerieSource
					const newSerie = await tx.serie.create({
						data: {
							title: resolveMultiLanguage(serieData.title),
							synopsis: resolveMultiLanguage(serieData.synopsis, "") || null,
							type: serieData.type,
							status: serieData.status,
						},
					})
					serieId = newSerie.id

					const isPrimaryValue = isPrimary ?? true
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
							is_primary: isPrimaryValue,
							priority: isPrimaryValue ? 1 : 5,
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
					has_new_chapters: hasNewChapters,
				}
			})

			await job.updateProgress(70)

			// Handle source cache issues with delayed retry (applicable to any source)
			// Only retry for updates (existingSerieSource), not new imports
			if (!has_new_chapters && job.data.expect_new_chapters && existingSerieSource) {
				const retryAttempt = job.data.cache_retry_attempt ?? 0
				const MAX_CACHE_RETRIES = 4
				const RETRY_DELAYS_MS = [
					10 * 60 * 1000, // 10 minutes
					60 * 60 * 1000, // 1 hour
					2 * 60 * 60 * 1000, // 2 hours
					6 * 60 * 60 * 1000, // 6 hours
				]

				if (retryAttempt < MAX_CACHE_RETRIES) {
					const delayMs = RETRY_DELAYS_MS[retryAttempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!
					const delayDesc = retryAttempt === 0 ? "10 min" : retryAttempt === 1 ? "1h" : retryAttempt === 2 ? "2h" : "6h"
					log(`No new chapters found but expected (source cache issue?). Retry ${retryAttempt + 1}/${MAX_CACHE_RETRIES} in ${delayDesc}`)

					// Update job data with incremented retry count, then move to delayed
					// This preserves job metadata (logs, ID, parent/children relationships)
					await job.updateData({
						...job.data,
						cache_retry_attempt: retryAttempt + 1,
					})
					await job.moveToDelayed(Date.now() + delayMs, token)

					// Throw DelayedError to signal worker the job was intentionally deferred
					// Don't update last_checked_at yet, don't spawn child jobs
					throw new DelayedError()
				}
				else {
					log(`No new chapters after ${MAX_CACHE_RETRIES} cache retries`)
				}
			}

			const mode = existingSerieSource ? "Updated" : targetSerieId ? "Linked to" : "Created"
			log(`${mode} serie ${serie_id} with ${chapter_ids.length} chapters to process`)

			// Create a single unified flow to avoid race conditions
			// Execution order: cover+dedup -> indexer -> chapters -> dedup -> indexer (final)
			const flowProducer = getFlowProducer()
			// Inherit priority from parent job, default to NORMAL
			const priority = job.opts.priority ?? JOB_PRIORITY.NORMAL

			// Early jobs: cover update and optimistic deduplication
			const earlyChildren = [
				{
					name: `cover-${serie_source_id}`,
					queueName: "cover-update",
					data: {
						type: "SOURCE",
						serie_source_id,
					} as CoverUpdateJobData,
					opts: { priority },
				},
				{
					name: `dedup-early-${serie_id}`,
					queueName: "chapter-dedup",
					data: { serie_id } as ChapterDedupJobData,
					opts: { priority },
				},
			]

			if (chapter_ids.length > 0) {
				// Full flow: indexer-final <- dedup-final <- chapters <- indexer-middle <- (cover + dedup-early)
				// Two dedup passes: early (optimistic) and final (accurate after chapters complete)
				await flowProducer.add({
					name: `indexer-final-${serie_id}`,
					queueName: "indexer",
					data: { serie_id, type: "UPDATE" } as IndexerJobData,
					opts: { priority },
					children: [
						{
							name: `dedup-final-${serie_id}`,
							queueName: "chapter-dedup",
							data: { serie_id } as ChapterDedupJobData,
							opts: { priority },
							children: chapter_ids.map((chapter_id, index) => ({
								name: `chapter-${chapter_id}`,
								queueName: "chapter-data",
								data: {
									serie_id,
									source_id: sourceId,
									chapter_id,
									type: "UPDATE",
								} as ChapterDataJobData,
								opts: { priority },
								// First chapter waits for middle indexer (which waits for cover+dedup-early)
								...(index === 0 && {
									children: [
										{
											name: `indexer-middle-${serie_id}`,
											queueName: "indexer",
											data: { serie_id, type: "UPDATE" } as IndexerJobData,
											opts: { priority },
											children: earlyChildren,
										},
									],
								}),
							})),
						},
					],
				})
			}
			else {
				// No chapters to update: indexer-final <- dedup <- cover
				// Single dedup is enough when no new chapters
				await flowProducer.add({
					name: `indexer-final-${serie_id}`,
					queueName: "indexer",
					data: { serie_id, type: "UPDATE" } as IndexerJobData,
					opts: { priority },
					children: [
						{
							name: `dedup-${serie_id}`,
							queueName: "chapter-dedup",
							data: { serie_id } as ChapterDedupJobData,
							opts: { priority },
							children: [
								{
									name: `cover-${serie_source_id}`,
									queueName: "cover-update",
									data: {
										type: "SOURCE",
										serie_source_id,
									} as CoverUpdateJobData,
									opts: { priority },
								},
							],
						},
					],
				})
			}

			// Update last_checked_at and reset consecutive_failures
			await db.serieSource.update({
				where: { id: serie_source_id },
				data: {
					last_checked_at: new Date(),
					consecutive_failures: 0,
				},
			})

			await job.updateProgress(100)
			const flowDesc = chapter_ids.length > 0
				? `cover + dedup -> indexer -> ${chapter_ids.length} chapters -> dedup -> indexer`
				: `cover -> dedup -> indexer`
			log(`Spawned unified flow: ${flowDesc}`)

			return { serie_id, chapters_queued: chapter_ids.length }
		}
		catch (error) {
			// Re-throw DelayedError without treating it as a failure
			if (error instanceof DelayedError) {
				throw error
			}

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
