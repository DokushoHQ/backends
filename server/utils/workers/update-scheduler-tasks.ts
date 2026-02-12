import type { Job } from "bullmq"
import chapterDedupQueue, { JOB_PRIORITY as DEDUP_PRIORITY } from "../../queues/chapter-dedup"
import indexerQueue from "../../queues/indexer"
import pageRetryQueue from "../../queues/page-retry"
import serieInserterQueue, { JOB_PRIORITY } from "../../queues/serie-inserter"
import type { UpdateSchedulerJobData } from "../../queues/update-scheduler"
import { db } from "../db"
import {
	calculateRecomputeDedupDelayMs,
	calculateRecomputeDedupEstimatedMs,
	calculateRecomputeIndexDelayMs,
} from "./update-scheduler-recompute"
import { calculateStaggerIntervalMs, isEligibleForRefresh } from "./update-scheduler-policy"

/**
 * REFRESH_ALL task: Queue all tracked series with staggered delays.
 */
export async function handleRefreshAllTask(job: Job<UpdateSchedulerJobData>) {
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

/**
 * RETRY_FAILED_PAGES task: Queue page-retry jobs for chapters with failed pages.
 */
export async function handleRetryFailedPagesTask(job: Job<UpdateSchedulerJobData>) {
	job.log("Starting RETRY_FAILED_PAGES task")
	await job.updateProgress(5)

	// Find chapters with Partial or Failed status that have retryable pages
	const chapters = await db.chapter.findMany({
		where: {
			page_fetch_status: { in: ["Partial", "Failed"] },
			data: {
				some: {
					url: null,
					source_url: { not: null },
				},
			},
		},
		select: { id: true },
		take: 100,
	})

	job.log(`Found ${chapters.length} chapters with failed pages to retry`)

	// Queue page-retry jobs with staggered delays
	for (const [i, chapter] of chapters.entries()) {
		await pageRetryQueue.add(
			`scheduled-retry-${chapter.id}`,
			{ chapter_id: chapter.id },
			{
				delay: i * 5000,
			},
		)
	}

	job.log(`RETRY_FAILED_PAGES complete. Queued: ${chapters.length}`)
	await job.updateProgress(100)
}

/**
 * RECOMPUTE_ALL task: Run chapter deduplication and then reindex all series.
 * This ensures availability stats are up-to-date and search index reflects current state.
 */
export async function handleRecomputeAllTask(job: Job<UpdateSchedulerJobData>) {
	job.log("Starting RECOMPUTE_ALL task")
	await job.updateProgress(5)

	// Get all non-deleted series
	const series = await db.serie.findMany({
		where: { soft_deleted_at: null },
		select: { id: true },
	})

	job.log(`Found ${series.length} series to process`)

	// Phase 1: Queue dedup jobs (50ms apart)
	job.log("Phase 1: Queuing chapter deduplication jobs...")
	for (const [i, serie] of series.entries()) {
		await chapterDedupQueue.add(
			`recompute-dedup-${serie.id}`,
			{ serie_id: serie.id },
			{ delay: calculateRecomputeDedupDelayMs(i), priority: DEDUP_PRIORITY.LOW },
		)
	}
	job.log(`Queued ${series.length} dedup jobs`)
	await job.updateProgress(50)

	// Phase 2: Queue indexer jobs with offset to run after dedup completes
	// Add base delay to allow dedup jobs to finish first
	const dedupEstimatedMs = calculateRecomputeDedupEstimatedMs(series.length)
	job.log(`Phase 2: Queuing indexer jobs (starting after ${Math.round(dedupEstimatedMs / 1000)}s)...`)

	for (const [i, serie] of series.entries()) {
		await indexerQueue.add(
			`recompute-index-${serie.id}`,
			{ serie_id: serie.id, type: "UPDATE" },
			{ delay: calculateRecomputeIndexDelayMs(i, dedupEstimatedMs) },
		)
	}
	job.log(`Queued ${series.length} indexer jobs`)

	job.log(`RECOMPUTE_ALL complete. Total: ${series.length} series (dedup + index)`)
	await job.updateProgress(100)
}
