import { defineWorker } from "#processor"
import { DelayedError, MetricsTime } from "bullmq"
import type { SerieInserterJobData, SerieInserterJobResult } from "../queues/serie-inserter"
import { JOB_PRIORITY, QUEUE_NAME, serieInserterJobDataSchema } from "../queues/serie-inserter"
import type { Language } from "../utils/db"
import { db } from "../utils/db"
import { getFlowProducer } from "../utils/flow-producer"
import { resolveMultiLanguage } from "../utils/serie"
import { getSourceById } from "../utils/sources"
import { RateLimitError } from "../utils/sources/core"
import { buildSerieInserterFlow } from "../utils/workers/serie-inserter-flow"
import {
	buildSerieCreateData,
	buildSerieSourceCreateData,
	buildSerieSourceUpdateData,
} from "../utils/workers/serie-inserter-payloads"
import { maybeDelayForCacheRetry } from "../utils/workers/serie-inserter-retry"
import { upsertScanlationGroupsAndBuildMap } from "../utils/workers/serie-inserter-groups"

export default defineWorker<typeof QUEUE_NAME, SerieInserterJobData, SerieInserterJobResult>({
	name: QUEUE_NAME,
	options: {
		concurrency: 2,
		limiter: { max: 2, duration: 5000 },
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job, token) {
		const log = (msg: string) => job.log(`[Attempt ${job.attemptsMade + 1}] ${msg}`)
		const rateLimitMaxRetries = Number(useRuntimeConfig().rateLimitMaxRetries) || 5
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

				// Upsert scanlation groups and build group ID map (external_id -> db id)
				const groupMap = await upsertScanlationGroupsAndBuildMap(
					tx,
					sourceId,
					chaptersResult,
				)

				let serieId: string
				let serieSourceId: string

				if (existingSerieSource) {
					// UPDATE PATH - SerieSource already exists
					serieId = existingSerieSource.serie_id
					serieSourceId = existingSerieSource.id

					await tx.serieSource.update({
						where: { id: existingSerieSource.id },
						data: buildSerieSourceUpdateData(serieData),
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
						data: buildSerieSourceCreateData({
							serieId: targetSerieId,
							sourceId,
							sourceSerieId,
							serieData,
							isPrimary: isPrimaryValue,
						}),
					})
					serieSourceId = newSerieSource.id
				}
				else {
					// CREATE PATH - New Serie + SerieSource
					const newSerie = await tx.serie.create({
						data: buildSerieCreateData(serieData),
					})
					serieId = newSerie.id

					const isPrimaryValue = isPrimary ?? true
					const newSerieSource = await tx.serieSource.create({
						data: buildSerieSourceCreateData({
							serieId: newSerie.id,
							sourceId,
							sourceSerieId,
							serieData,
							isPrimary: isPrimaryValue,
						}),
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
			await maybeDelayForCacheRetry({
				job,
				token,
				hasNewChapters: has_new_chapters,
				hasExistingSerieSource: !!existingSerieSource,
				log,
			})

			const mode = existingSerieSource ? "Updated" : targetSerieId ? "Linked to" : "Created"
			log(`${mode} serie ${serie_id} with ${chapter_ids.length} chapters to process`)

			// Create a single unified flow to avoid race conditions
			// Execution order: cover+dedup -> indexer -> chapters -> dedup -> indexer (final)
			const flowProducer = getFlowProducer()
			// Inherit priority from parent job, default to NORMAL
			const priority = job.opts.priority ?? JOB_PRIORITY.NORMAL

			// Full flow when chapters exist:
			// indexer-final <- dedup-final <- chapters <- indexer-middle <- (cover + dedup-early)
			// Compact flow when no chapter jobs:
			// indexer-final <- dedup <- cover
			await flowProducer.add(buildSerieInserterFlow({
				serieId: serie_id,
				serieSourceId: serie_source_id,
				chapterIds: chapter_ids,
				sourceId,
				priority,
			}))

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

			// Handle 429 rate limits — delay the job without counting as a failure attempt
			if (error instanceof RateLimitError) {
				const retryAttempt = job.data.rate_limit_retry_attempt ?? 0

				if (retryAttempt < rateLimitMaxRetries) {
					log(`Rate limited (${error.retryAfterMs}ms). Retry ${retryAttempt + 1}/${rateLimitMaxRetries}`)
					await job.updateData({
						...job.data,
						rate_limit_retry_attempt: retryAttempt + 1,
					})
					await job.moveToDelayed(Date.now() + error.retryAfterMs, token)
					throw new DelayedError()
				}

				log(`Rate limited but exhausted ${rateLimitMaxRetries} retries, failing`)
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
