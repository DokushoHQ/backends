import { defineWorker } from "#processor"
import { MetricsTime, type Job } from "bullmq"
import { join } from "node:path"
import type { CoverUpdateJobData } from "../queues/cover-update"
import { QUEUE_NAME, coverUpdateJobDataSchema } from "../queues/cover-update"
import indexerQueue from "../queues/indexer"
import { db } from "../utils/db"
import { uploadImageFile } from "../utils/s3"
import type { SerieField } from "../utils/serie"

/**
 * Process a SerieSource cover - downloads from source URL and uploads to S3
 */
async function processSourceCover(
	job: Job<CoverUpdateJobData>,
	serieSourceId: string,
) {
	job.log(`Processing source cover for SerieSource ${serieSourceId}`)

	const serieSource = await db.serieSource.findUniqueOrThrow({
		where: { id: serieSourceId },
	})

	await job.updateProgress(30)

	// Upload to S3: {serie_id}/covers/{source_id}.avif
	const filePath = join(
		serieSource.serie_id,
		"covers",
		`${serieSource.source_id}.avif`,
	)
	const result = await uploadImageFile(
		serieSource.cover_source_url,
		filePath,
		"image/avif",
	)

	await job.updateProgress(80)

	// Log warning for non-healthy images
	if (result.quality !== "healthy") {
		job.log(`Cover quality: ${result.quality} - ${result.metadata.issues.join(", ")}`)
	}

	// Update SerieSource with S3 URL
	await db.serieSource.update({
		where: { id: serieSourceId },
		data: { cover: result.url },
	})

	await job.updateProgress(100)
	job.log(`Source cover uploaded: ${result.url}`)
}

/**
 * Process a custom user-uploaded cover
 */
async function processCustomCover(
	job: Job<CoverUpdateJobData>,
	serieId: string,
	imageUrl: string,
) {
	job.log(`Processing custom cover for Serie ${serieId}`)

	// Verify cover is locked
	const serie = await db.serie.findUniqueOrThrow({ where: { id: serieId } })
	const lockedFields = serie.locked_fields as SerieField[]

	if (!lockedFields.includes("cover")) {
		throw new Error("Cover field must be locked before uploading custom cover")
	}

	await job.updateProgress(30)

	// Upload to S3: {serie_id}/covers/custom.avif
	const filePath = join(serieId, "covers", "custom.avif")
	const result = await uploadImageFile(imageUrl, filePath, "image/avif")

	await job.updateProgress(70)

	// Log warning for non-healthy images
	if (result.quality !== "healthy") {
		job.log(`Custom cover quality: ${result.quality} - ${result.metadata.issues.join(", ")}`)
	}

	// Update Serie with custom cover URL
	await db.serie.update({
		where: { id: serieId },
		data: { custom_cover: result.url },
	})

	await job.updateProgress(80)

	// Trigger indexer to pick up new cover
	await indexerQueue.add("indexer", { serie_id: serieId, type: "UPDATE" })

	await job.updateProgress(100)
	job.log(`Custom cover uploaded: ${result.url}`)
}

export default defineWorker<typeof QUEUE_NAME, CoverUpdateJobData, undefined>({
	name: QUEUE_NAME,
	options: {
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job) {
		const data = coverUpdateJobDataSchema.parse(job.data)

		await job.updateProgress(10)

		if (data.type === "SOURCE") {
			if (!data.serie_source_id) {
				throw new Error("serie_source_id is required for SOURCE type")
			}
			await processSourceCover(job, data.serie_source_id)
		}
		else if (data.type === "CUSTOM") {
			if (!data.serie_id || !data.image_url) {
				throw new Error("serie_id and image_url are required for CUSTOM type")
			}
			await processCustomCover(job, data.serie_id, data.image_url)
		}
	},
})
