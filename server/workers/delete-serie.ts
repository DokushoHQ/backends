import { defineWorker } from "#processor"
import { MetricsTime, type Job } from "bullmq"
import deleteSerieQueue, {
	type DeleteSerieJobData,
	QUEUE_NAME,
	deleteSerieJobDataSchema,
} from "../queues/delete-serie"
import indexerQueue from "../queues/indexer"
import { db } from "../utils/db"
import { deleteByPrefix } from "../utils/s3"

async function processSoftDelete(
	job: Job<DeleteSerieJobData>,
	serieId: string,
) {
	const config = useRuntimeConfig()
	job.log(`Soft deleting serie ${serieId}`)

	// Verify serie exists
	const serie = await db.serie.findUnique({ where: { id: serieId } })
	if (!serie) {
		throw new Error(`Serie not found: ${serieId}`)
	}

	if (serie.soft_deleted_at) {
		job.log(`Serie ${serieId} is already soft deleted`)
		return
	}

	await job.updateProgress(20)

	// Calculate delay in milliseconds (days -> ms)
	const delayMs = config.softDeleteDelayDays * 24 * 60 * 60 * 1000

	// Schedule hard delete job with delay
	const hardDeleteJob = await deleteSerieQueue.add(
		"delete-serie",
		{ serie_id: serieId, type: "HARD_DELETE" },
		{ jobId: `${serieId}-hard_delete`, delay: delayMs },
	)

	await job.updateProgress(50)
	job.log(
		`Scheduled hard delete job ${hardDeleteJob.id} with ${config.softDeleteDelayDays} day delay`,
	)

	// Update serie with soft delete timestamp and job ID
	await db.serie.update({
		where: { id: serieId },
		data: {
			soft_deleted_at: new Date(),
			pending_delete_job_id: hardDeleteJob.id,
		},
	})

	await job.updateProgress(100)
	job.log(`Soft delete completed for serie ${serieId}`)
}

async function processHardDelete(
	job: Job<DeleteSerieJobData>,
	serieId: string,
) {
	job.log(`Hard deleting serie ${serieId}`)

	// Verify serie exists and is soft deleted
	const serie = await db.serie.findUnique({ where: { id: serieId } })
	if (!serie) {
		job.log(
			`Serie ${serieId} not found - may have been restored and re-deleted`,
		)
		return
	}

	if (!serie.soft_deleted_at) {
		job.log(
			`Serie ${serieId} is not soft deleted - skipping hard delete (likely restored)`,
		)
		return
	}

	await job.updateProgress(10)

	// 1. Delete from Meilisearch index
	await indexerQueue.add("indexer", { serie_id: serieId, type: "DELETE" })
	job.log("Queued search index deletion")
	await job.updateProgress(20)

	// 2. Delete S3 files (all files under {serie_id}/ prefix)
	const deletedFiles = await deleteByPrefix(`${serieId}/`)
	job.log(`Deleted ${deletedFiles} files from S3`)
	await job.updateProgress(50)

	// 3. Delete from database
	// With cascade deletes configured:
	// - Chapter.data -> ChapterData (onDelete: Cascade)
	// - Serie.chapters -> Chapter (onDelete: Cascade)
	// - Serie.sources -> SerieSource (onDelete: Cascade)

	// Delete chapters first (this cascades to ChapterData)
	const chapters = await db.chapter.findMany({
		where: { serie_id: serieId },
		select: { id: true },
	})
	const chapterIds = chapters.map(c => c.id)

	if (chapterIds.length > 0) {
		// ChapterData cascade will handle child data
		await db.chapter.deleteMany({
			where: { serie_id: serieId },
		})
		job.log(
			`Deleted ${chapterIds.length} chapters (and their data via cascade)`,
		)
	}
	await job.updateProgress(70)

	// Delete serie sources
	await db.serieSource.deleteMany({
		where: { serie_id: serieId },
	})
	job.log("Deleted all serie sources")
	await job.updateProgress(85)

	// Delete serie
	await db.serie.delete({
		where: { id: serieId },
	})

	await job.updateProgress(100)
	job.log(`Hard delete completed for serie ${serieId}`)
}

export default defineWorker<typeof QUEUE_NAME, DeleteSerieJobData, undefined>({
	name: QUEUE_NAME,
	options: {
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job) {
		const { serie_id, type } = deleteSerieJobDataSchema.parse(job.data)

		await job.updateProgress(5)

		if (type === "SOFT_DELETE") {
			await processSoftDelete(job, serie_id)
		}
		else if (type === "HARD_DELETE") {
			await processHardDelete(job, serie_id)
		}
	},
})
