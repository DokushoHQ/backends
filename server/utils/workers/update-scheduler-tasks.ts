import type { Job } from "bullmq"
import chapterDedupQueue, { JOB_PRIORITY as DEDUP_PRIORITY } from "../../queues/chapter-dedup"
import indexerQueue from "../../queues/indexer"
import pageRetryQueue from "../../queues/page-retry"
import type { UpdateSchedulerJobData } from "../../queues/update-scheduler"
import { db } from "../db"
import {
	calculateRecomputeDedupDelayMs,
	calculateRecomputeDedupEstimatedMs,
	calculateRecomputeIndexDelayMs,
} from "./update-scheduler-recompute"

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
