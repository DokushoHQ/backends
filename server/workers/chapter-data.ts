import { join } from "node:path"
import { defineWorker } from "#processor"
import { MetricsTime, type Job } from "bullmq"
import pLimit from "p-limit"
import type { ChapterDataJobData } from "../queues/chapter-data"
import { QUEUE_NAME, chapterDataJobDataSchema } from "../queues/chapter-data"
import { db } from "../utils/db"
import type { Chapter, PageFetchStatus, Prisma } from "../utils/db"
import { deleteByPrefix, uploadImageFile } from "../utils/s3"
import { createSources, getSourceById } from "../utils/sources"

type PageUploadResult = {
	success: boolean
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
			const filePath = join(chapter.serie_id, "chapters", chapterId, `page-${index}.webp`)
			const fileUrl = await uploadImageFile(sourceUrl, filePath, "image/webp")

			processed++
			const progress = 20 + Math.floor((processed / images.length) * 70)
			await job.updateProgress(progress)

			return {
				success: true,
				data: {
					url: fileUrl,
					source_url: sourceUrl.toString(),
					index,
					type: "image",
					chapter_id: chapterId,
				},
			}
		}
		catch (error) {
			processed++
			const progress = 20 + Math.floor((processed / images.length) * 70)
			await job.updateProgress(progress)

			job.log(`Failed to upload page ${index}: ${error}`)
			return {
				success: false,
				data: {
					url: null,
					source_url: sourceUrl.toString(),
					index,
					type: "image",
					chapter_id: chapterId,
				},
			}
		}
	}

	const results = await Promise.all(
		images.map(c => limiter(() => uploadPage(chapter.id, c.url, c.index))),
	)

	const successCount = results.filter(r => r.success).length
	const failedCount = results.filter(r => !r.success).length
	const failedIndexes = results.filter(r => !r.success).map(r => r.data.index)

	// Insert ALL pages (successful have url, failed have url=null but source_url set)
	await db.chapterData.createMany({ data: results.map(r => r.data) })

	await job.updateProgress(100)

	// Determine final status
	if (failedCount === 0) {
		job.log(`Successfully uploaded all ${successCount} pages`)
		return "Success"
	}
	if (successCount === 0) {
		job.log(`All ${failedCount} pages failed to upload`)
		return "Failed"
	}
	job.log(`Partial success: ${successCount} uploaded, ${failedCount} failed`)
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
