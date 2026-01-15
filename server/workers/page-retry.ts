import { join } from "node:path"
import { defineWorker } from "#processor"
import { MetricsTime } from "bullmq"
import pLimit from "p-limit"
import type { PageRetryJobData } from "../queues/page-retry"
import { QUEUE_NAME, pageRetryJobDataSchema } from "../queues/page-retry"
import { db } from "../utils/db"
import type { PageFetchStatus } from "../utils/db"
import { GifTooLargeError, uploadImageFile } from "../utils/s3"

export default defineWorker<typeof QUEUE_NAME, PageRetryJobData, undefined>({
	name: QUEUE_NAME,
	options: {
		concurrency: 2,
		limiter: { max: 2, duration: 5000 },
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job) {
		const { chapter_id } = pageRetryJobDataSchema.parse(job.data)

		job.log(`Starting page retry for chapter ${chapter_id}`)

		// Get chapter info
		const chapter = await db.chapter.findUnique({
			where: { id: chapter_id },
			select: { id: true, serie_id: true },
		})

		if (!chapter) {
			throw new Error(`Chapter ${chapter_id} not found`)
		}

		// Find failed pages (url is null/empty but source_url exists, not permanently failed)
		const failedPages = await db.chapterData.findMany({
			where: {
				chapter_id,
				OR: [{ url: null }, { url: "" }],
				source_url: { not: null },
				permanently_failed: false,
			},
		})

		if (failedPages.length === 0) {
			job.log("No failed pages to retry")
			return
		}

		job.log(`Found ${failedPages.length} failed pages to retry`)
		await job.updateProgress(10)

		// Retry each failed page
		const limiter = pLimit(2)
		let successCount = 0
		let processed = 0

		await Promise.all(
			failedPages.map(page =>
				limiter(async () => {
					try {
						const sourceUrl = page.source_url!
						const basePath = join(chapter.serie_id, "chapters", chapter_id, `page-${page.index}`)
						const result = await uploadImageFile(new URL(sourceUrl), basePath)

						await db.chapterData.update({
							where: { id: page.id },
							data: {
								url: result.url,
								image_quality: result.quality,
								metadata_issues: result.metadata,
							},
						})

						successCount++

						// Log retry details
						const { width, height } = result.metadata
						job.log(`Page ${page.index} retry: ${width}x${height} → ${result.format} (${result.quality})`)

						if (result.quality !== "healthy") {
							job.log(`  Issues: ${result.metadata.issues.join(", ")}`)
						}
					}
					catch (error) {
						const isPermanent = error instanceof GifTooLargeError

						if (isPermanent) {
							job.log(`Page ${page.index} permanently failed: ${error}`)
							await db.chapterData.update({
								where: { id: page.id },
								data: { permanently_failed: true },
							})
						}
						else {
							job.log(`Page ${page.index} retry failed: ${error}`)
						}
						job.log(`  Source URL: ${page.source_url}`)
					}
					finally {
						processed++
						const progress = 10 + Math.floor((processed / failedPages.length) * 80)
						await job.updateProgress(progress)
					}
				}),
			),
		)

		await job.updateProgress(95)

		// Update chapter status based on remaining failed pages (only count pages without URL as failed)
		// Use NOT/OR to handle both null and empty string URLs
		const [
			successfulPages,
			retryableFailedPages,
			permanentlyFailedPages,
		] = await Promise.all([
			db.chapterData.count({ where: { chapter_id, NOT: { OR: [{ url: null }, { url: "" }] } } }),
			db.chapterData.count({ where: { chapter_id, OR: [{ url: null }, { url: "" }], permanently_failed: false } }),
			db.chapterData.count({ where: { chapter_id, OR: [{ url: null }, { url: "" }], permanently_failed: true } }),
		])

		// Determine status based on success/retryable/permanent failures
		let status: PageFetchStatus
		if (retryableFailedPages === 0 && permanentlyFailedPages === 0) {
			status = "Success"
		}
		else if (successfulPages === 0 && permanentlyFailedPages === 0) {
			status = "Failed"
		}
		else if (successfulPages === 0 && retryableFailedPages === 0) {
			status = "PermanentlyFailed"
		}
		else if (permanentlyFailedPages > 0) {
			status = "Incomplete"
		}
		else {
			status = "Partial"
		}

		await db.chapter.update({
			where: { id: chapter_id },
			data: { page_fetch_status: status },
		})

		await job.updateProgress(100)

		job.log(`Retry complete: ${successCount}/${failedPages.length} pages fixed`)
		job.log(`Final counts - Success: ${successfulPages}, Retryable: ${retryableFailedPages}, Permanent: ${permanentlyFailedPages}`)
		job.log(`Status: ${status}`)
	},
})
