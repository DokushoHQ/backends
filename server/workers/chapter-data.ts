import { join } from "node:path"
import { defineWorker } from "#processor"
import { MetricsTime, type Job } from "bullmq"
import pLimit from "p-limit"
import type { ChapterDataJobData } from "../queues/chapter-data"
import { QUEUE_NAME, chapterDataJobDataSchema } from "../queues/chapter-data"
import { db } from "../utils/db"
import type { Chapter, PageFetchStatus, Prisma } from "../utils/db"
import { deleteByPrefix, GifTooLargeError, uploadImageFile } from "../utils/s3"
import { createSources, getSourceById } from "../utils/sources"

type PageUploadResult = {
	success: boolean
	permanentlyFailed: boolean
	data: Prisma.ChapterDataCreateManyInput
}

async function processChapterUpdate(
	job: Job<ChapterDataJobData>,
	chapter: Chapter & {
		source: { external_id: string }
		serie: { sources: { external_id: string, source_id: string }[] }
	},
): Promise<PageFetchStatus> {
	const config = useRuntimeConfig()
	job.log(`Fetching chapter data for chapter ${chapter.id}`)

	// Set status to InProgress
	await db.chapter.update({
		where: { id: chapter.id },
		data: { page_fetch_status: "InProgress" },
	})

	// Create sources and get the right one
	const enabledLanguages = config.enabledLanguages
		?.split(",")
		.map((lang: string) => lang.trim())
		.filter(Boolean) as ("En" | "Fr")[]
	const sources = await createSources({
		ENABLED_LANGUAGE: enabledLanguages?.length ? enabledLanguages : ["En"],
		BYPARR_URL: config.byparrUrl,
		SUWAYOMI_URL: config.suwayomiUrl,
	})
	const source = getSourceById(sources, chapter.source.external_id)

	// Find the SerieSource that matches this chapter's source
	const serieSource = chapter.serie.sources.find(s => s.source_id === chapter.source_id)
	if (!serieSource) {
		throw new Error(`No SerieSource found for source_id ${chapter.source_id}`)
	}

	// Fetch chapter data - if this fails, mark as Failed
	let images: { type: "image", url: URL, index: number }[]
	try {
		const data = await source.fetchChapterData(serieSource.external_id, chapter.external_id)
		images = data.filter((c): c is { type: "image", url: URL, index: number } => c.type === "image")
	}
	catch (error) {
		job.log(`Failed to fetch chapter data: ${error}`)
		return "Failed"
	}

	await job.updateProgress(20)
	job.log(`Found ${images.length} pages to upload`)

	if (images.length === 0) {
		job.log("No images found in chapter - marking as disabled")
		await db.chapter.update({
			where: { id: chapter.id },
			data: { enabled: false },
		})
		return "Success"
	}

	// Clear existing data/S3 objects to make updates idempotent
	await db.chapterData.deleteMany({ where: { chapter_id: chapter.id } })
	const chapterPrefix = join(chapter.serie_id, "chapters", chapter.id)
	const deleted = await deleteByPrefix(`${chapterPrefix}/`)
	if (deleted > 0) {
		job.log(`Deleted ${deleted} existing page(s) from S3`)
	}

	let processed = 0
	const limiter = pLimit(2)

	const uploadPage = async (
		chapterId: string,
		sourceUrl: URL,
		index: number,
	): Promise<PageUploadResult> => {
		try {
			const basePath = join(chapter.serie_id, "chapters", chapterId, `page-${index}`)
			const result = await uploadImageFile(sourceUrl, basePath)

			processed++
			const progress = 20 + Math.floor((processed / images.length) * 70)
			await job.updateProgress(progress)

			// Log upload details
			const { width, height } = result.metadata
			job.log(`Page ${index}: ${width}x${height} → ${result.format} (${result.quality})`)

			// Log warning for non-healthy images
			if (result.quality !== "healthy") {
				job.log(`  Issues: ${result.metadata.issues.join(", ")}`)
			}

			return {
				success: true,
				permanentlyFailed: false,
				data: {
					url: result.url,
					source_url: sourceUrl.toString(),
					index,
					type: "image",
					chapter_id: chapterId,
					image_quality: result.quality,
					metadata_issues: result.metadata,
				},
			}
		}
		catch (error) {
			processed++
			const progress = 20 + Math.floor((processed / images.length) * 70)
			await job.updateProgress(progress)

			// Check if this is a permanent failure (e.g., GIF too large)
			const isPermanent = error instanceof GifTooLargeError

			if (isPermanent) {
				job.log(`Page ${index} permanently failed: ${error}`)
			}
			else {
				job.log(`Page ${index} failed: ${error}`)
			}
			job.log(`  Source URL: ${sourceUrl.toString()}`)

			return {
				success: false,
				permanentlyFailed: isPermanent,
				data: {
					url: null,
					source_url: sourceUrl.toString(),
					index,
					type: "image",
					chapter_id: chapterId,
					permanently_failed: isPermanent,
				},
			}
		}
	}

	const results = await Promise.all(
		images.map(c => limiter(() => uploadPage(chapter.id, c.url, c.index))),
	)

	const successCount = results.filter(r => r.success).length
	const retryableFailedCount = results.filter(r => !r.success && !r.permanentlyFailed).length
	const permanentlyFailedCount = results.filter(r => r.permanentlyFailed).length
	const failedIndexes = results.filter(r => !r.success && !r.permanentlyFailed).map(r => r.data.index)
	const permanentlyFailedIndexes = results.filter(r => r.permanentlyFailed).map(r => r.data.index)

	// Insert ALL pages (successful have url, failed have url=null but source_url set)
	await db.chapterData.createMany({ data: results.map(r => r.data) })

	await job.updateProgress(100)

	// Determine final status based on success/retryable/permanent failures
	// All success → Success
	// All retryable failures → Failed
	// All permanent failures → PermanentlyFailed
	// Some success + some retryable → Partial
	// Some success + some permanent → Incomplete
	// Mix of all three → Incomplete

	if (retryableFailedCount === 0 && permanentlyFailedCount === 0) {
		job.log(`Successfully uploaded all ${successCount} pages`)
		return "Success"
	}

	if (successCount === 0 && permanentlyFailedCount === 0) {
		job.log(`All ${retryableFailedCount} pages failed to upload (retryable)`)
		return "Failed"
	}

	if (successCount === 0 && retryableFailedCount === 0) {
		job.log(`All ${permanentlyFailedCount} pages permanently failed`)
		job.log(`Permanently failed pages: ${permanentlyFailedIndexes.join(", ")}`)
		return "PermanentlyFailed"
	}

	// Mixed results
	if (permanentlyFailedCount > 0) {
		// Any permanent failure means Incomplete
		job.log(`Incomplete: ${successCount} uploaded, ${retryableFailedCount} failed (retryable), ${permanentlyFailedCount} permanently failed`)
		if (failedIndexes.length > 0) job.log(`Retryable failed pages: ${failedIndexes.join(", ")}`)
		if (permanentlyFailedIndexes.length > 0) job.log(`Permanently failed pages: ${permanentlyFailedIndexes.join(", ")}`)
		return "Incomplete"
	}

	// Only retryable failures mixed with success
	job.log(`Partial success: ${successCount} uploaded, ${retryableFailedCount} failed (retryable)`)
	job.log(`Failed pages: ${failedIndexes.join(", ")}`)
	return "Partial"
}

export default defineWorker<typeof QUEUE_NAME, ChapterDataJobData, undefined>({
	name: QUEUE_NAME,
	options: {
		concurrency: 2,
		limiter: { max: 2, duration: 5000 },
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job) {
		const data = chapterDataJobDataSchema.parse(job.data)

		await job.updateProgress(5)

		const chapter = await db.chapter.findFirst({
			where: {
				AND: [{ serie_id: data.serie_id }, { id: data.chapter_id }],
			},
			include: {
				source: { select: { external_id: true } },
				serie: {
					select: {
						sources: { select: { external_id: true, source_id: true } },
					},
				},
			},
		})

		if (!chapter) {
			throw new Error(`Chapter ${data.chapter_id} of serie ${data.serie_id} not found`)
		}

		await job.updateProgress(10)

		if (data.type === "UPDATE") {
			const status = await processChapterUpdate(job, chapter)

			// Update final status
			await db.chapter.update({
				where: { id: chapter.id },
				data: { page_fetch_status: status },
			})

			// Throw if completely failed so job is marked as failed
			if (status === "Failed") {
				throw new Error("Chapter page fetch failed completely")
			}
		}
	},
})
