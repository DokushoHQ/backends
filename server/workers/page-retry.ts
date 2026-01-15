import { join } from "node:path"
import { defineWorker } from "#processor"
import { MetricsTime } from "bullmq"
import pLimit from "p-limit"
import type { PageRetryJobData } from "../queues/page-retry"
import { QUEUE_NAME, pageRetryJobDataSchema } from "../queues/page-retry"
import { db } from "../utils/db"
import type { PageFetchStatus } from "../utils/db"
import { uploadImageFile } from "../utils/s3"

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

		// Find failed pages (url is null but source_url exists)
		const failedPages = await db.chapterData.findMany({
			where: {
				chapter_id,
				url: null,
				source_url: { not: null },
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
						const filePath = join(chapter.serie_id, "chapters", chapter_id, `page-${page.index}.webp`)
						const url = await uploadImageFile(new URL(page.source_url!), filePath, "image/webp")

						await db.chapterData.update({
							where: { id: page.id },
							data: { url },
						})

						successCount++
						job.log(`Page ${page.index} retry succeeded`)
					}
					catch (error) {
						job.log(`Page ${page.index} retry failed: ${error}`)
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

		// Update chapter status based on remaining failed pages
		const [remainingFailed, totalPages] = await Promise.all([
			db.chapterData.count({ where: { chapter_id, url: null } }),
			db.chapterData.count({ where: { chapter_id } }),
		])

		let status: PageFetchStatus
		if (remainingFailed === 0) {
			status = "Success"
		}
		else if (remainingFailed === totalPages) {
			status = "Failed"
		}
		else {
			status = "Partial"
		}

		await db.chapter.update({
			where: { id: chapter_id },
			data: { page_fetch_status: status },
		})

		await job.updateProgress(100)

		job.log(`Retry complete: ${successCount}/${failedPages.length} pages fixed, status: ${status}`)
	},
})
