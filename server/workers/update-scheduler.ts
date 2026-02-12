import { defineWorker } from "#processor"
import { MetricsTime, type Job } from "bullmq"
import serieInserterQueue, { JOB_PRIORITY } from "../queues/serie-inserter"
import type { UpdateSchedulerJobData } from "../queues/update-scheduler"
import { QUEUE_NAME, updateSchedulerJobDataSchema } from "../queues/update-scheduler"
import { db } from "../utils/db"
import { findFingerprintPosition } from "../utils/fingerprint"
import { getSourceById } from "../utils/sources"
import type { SourceProvider } from "../utils/sources/core"
import { calculateStaggerIntervalMs, isEligibleForRefresh } from "../utils/workers/update-scheduler-policy"
import { handleRecomputeAllTask, handleRetryFailedPagesTask } from "../utils/workers/update-scheduler-tasks"

/**
 * FETCH_LATEST task: Check latest updates from each source and queue matching series.
 */
async function handleFetchLatest(
	job: Job<UpdateSchedulerJobData>,
	sourceId?: string,
) {
	const config = useRuntimeConfig()
	const MAX_PAGES = config.schedulerMaxPages
	const FINGERPRINT_SIZE = config.schedulerFingerprintSize
	const RECENTLY_CHECKED_THRESHOLD_MS = config.schedulerRecentlyCheckedMs

	job.log("Starting FETCH_LATEST task")
	await job.updateProgress(5)

	// Only fetch from enabled sources that have at least one tracked SerieSource
	const dbSources = await db.source.findMany({
		where: {
			enabled: true,
			...(sourceId && { id: sourceId }),
			serie_sources: { some: {} },
		},
		select: {
			id: true,
			external_id: true,
			rate_limit_max: true,
			rate_limit_duration: true,
			last_fetch_fingerprint: true,
		},
	})

	job.log(`Found ${dbSources.length} source(s) with tracked series to check${sourceId ? " (filtered by sourceId)" : ""}`)

	const sources = await getSources()

	let totalQueued = 0

	for (const dbSource of dbSources) {
		job.log(`Processing source: ${dbSource.external_id}`)

		let source: SourceProvider
		try {
			source = getSourceById(sources, dbSource.external_id)
		}
		catch {
			job.log(`Source ${dbSource.external_id} not found in sources, skipping`)
			continue
		}

		// Check if source supports fetchLatestUpdates
		if (!source.fetchLatestUpdates) {
			job.log(`Source ${dbSource.external_id} does not support fetchLatestUpdates, skipping`)
			continue
		}

		// Get tracked SerieSources for this source with their scheduling info
		const trackedSerieSources = await db.serieSource.findMany({
			where: { source_id: dbSource.id },
			select: {
				id: true,
				external_id: true,
				last_checked_at: true,
				consecutive_failures: true,
			},
		})

		const trackedExternalIds = new Set(trackedSerieSources.map(s => s.external_id))
		const trackedSerieSourceMap = new Map(trackedSerieSources.map(s => [s.external_id, s]))

		job.log(`Source ${dbSource.external_id} has ${trackedSerieSources.length} tracked series`)

		const existingFingerprint = (dbSource.last_fetch_fingerprint as string[] | null) ?? []
		const collectedIds: string[] = []
		let fingerprintFound = false
		let fingerprintPosition = -1

		for (let page = 1; page <= MAX_PAGES; page++) {
			try {
				const result = await source.fetchLatestUpdates(page)
				const pageIds = result.series.map(s => s.id)
				collectedIds.push(...pageIds)

				job.log(`Page ${page}: fetched ${pageIds.length} series`)

				if (existingFingerprint.length > 0) {
					fingerprintPosition = findFingerprintPosition(collectedIds, existingFingerprint)
					if (fingerprintPosition !== -1) {
						fingerprintFound = true
						job.log(`Fingerprint found at position ${fingerprintPosition}, early exit`)
						break
					}
				}

				if (!result.hasNextPage) {
					job.log("No more pages available")
					break
				}
			}
			catch (error) {
				job.log(`Error fetching page ${page}: ${error}`)
				break
			}
		}

		const newIds = fingerprintFound ? collectedIds.slice(0, fingerprintPosition) : collectedIds

		job.log(`Found ${newIds.length} new series IDs since last check`)

		const newFingerprint = collectedIds.slice(0, FINGERPRINT_SIZE)
		await db.source.update({
			where: { id: dbSource.id },
			data: { last_fetch_fingerprint: newFingerprint },
		})

		const now = Date.now()
		let sourceQueued = 0

		for (const externalId of newIds) {
			if (!trackedExternalIds.has(externalId)) continue

			const serieSource = trackedSerieSourceMap.get(externalId)
			if (!serieSource) continue

			// Skip if recently checked
			if (serieSource.last_checked_at) {
				const timeSinceLastCheck = now - serieSource.last_checked_at.getTime()
				if (timeSinceLastCheck < RECENTLY_CHECKED_THRESHOLD_MS) {
					continue
				}
			}

			await serieInserterQueue.add(
				"serie-inserter",
				{ source_id: dbSource.id, source_serie_id: externalId, expect_new_chapters: true },
				{ priority: JOB_PRIORITY.HIGH },
			)

			sourceQueued++
			totalQueued++
		}

		job.log(`Queued ${sourceQueued} series from ${dbSource.external_id}`)
	}

	job.log(`FETCH_LATEST complete. Total queued: ${totalQueued}`)
	await job.updateProgress(100)
}

/**
 * REFRESH_ALL task: Queue all tracked series with staggered delays.
 */
async function handleRefreshAll(job: Job<UpdateSchedulerJobData>) {
	const config = useRuntimeConfig()
	const SPREAD_MS = config.schedulerRefreshSpreadMs

	job.log("Starting REFRESH_ALL task")
	await job.updateProgress(5)

	const dbSources = await db.source.findMany({
		where: { enabled: true },
		select: {
			id: true,
			external_id: true,
			rate_limit_max: true,
			rate_limit_duration: true,
		},
	})

	job.log(`Found ${dbSources.length} sources`)
	let totalQueued = 0

	for (const dbSource of dbSources) {
		job.log(`Processing source: ${dbSource.external_id}`)

		// Get tracked SerieSources for this source with their scheduling info
		const trackedSerieSources = await db.serieSource.findMany({
			where: { source_id: dbSource.id },
			select: {
				id: true,
				external_id: true,
				last_checked_at: true,
				consecutive_failures: true,
			},
		})

		job.log(`Source ${dbSource.external_id} has ${trackedSerieSources.length} tracked series`)

		const now = new Date()
		const seriesToRefresh = trackedSerieSources.filter((serieSource) => {
			return isEligibleForRefresh({
				lastCheckedAt: serieSource.last_checked_at,
				consecutiveFailures: serieSource.consecutive_failures,
				now,
			})
		})

		job.log(`${seriesToRefresh.length} series pass backoff filter`)

		const actualInterval = calculateStaggerIntervalMs({
			rateLimitDurationMs: dbSource.rate_limit_duration,
			rateLimitMax: dbSource.rate_limit_max,
			spreadMs: SPREAD_MS,
			totalItems: seriesToRefresh.length,
		})

		job.log(`Stagger interval: ${Math.round(actualInterval / 1000)}s between updates`)

		for (const [i, serieSource] of seriesToRefresh.entries()) {
			const delay = i * actualInterval

			await serieInserterQueue.add(
				"serie-inserter",
				{ source_id: dbSource.id, source_serie_id: serieSource.external_id },
				{ delay, priority: JOB_PRIORITY.NORMAL },
			)

			totalQueued++
		}

		job.log(`Queued ${seriesToRefresh.length} series from ${dbSource.external_id}`)
	}

	job.log(`REFRESH_ALL complete. Total queued: ${totalQueued}`)
	await job.updateProgress(100)
}

export default defineWorker<typeof QUEUE_NAME, UpdateSchedulerJobData, undefined>({
	name: QUEUE_NAME,
	options: {
		concurrency: 1,
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job) {
		const data = updateSchedulerJobDataSchema.parse(job.data)

		if (data.type === "FETCH_LATEST") {
			await handleFetchLatest(job, data.sourceId)
		}
		else if (data.type === "REFRESH_ALL") {
			await handleRefreshAll(job)
		}
		else if (data.type === "RETRY_FAILED_PAGES") {
			await handleRetryFailedPagesTask(job)
		}
		else if (data.type === "RECOMPUTE_ALL") {
			await handleRecomputeAllTask(job)
		}
	},
})
