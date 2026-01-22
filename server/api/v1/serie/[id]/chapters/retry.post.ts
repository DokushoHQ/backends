import { z } from "zod"
import chapterDataQueue, { CHAPTER_DATA_PRIORITY } from "../../../../../queues/chapter-data"

const bodySchema = z.object({
	chapterIds: z.array(z.string().uuid()).min(1).max(100),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const serieId = getRouterParam(event, "id")
	if (!serieId) {
		throw createError({ statusCode: 400, message: "Serie ID is required" })
	}

	const body = await readValidatedBody(event, bodySchema.parse)

	// Verify chapters belong to this serie and get source info
	const chapters = await db.chapter.findMany({
		where: {
			id: { in: body.chapterIds },
			serie_id: serieId,
			page_fetch_status: { in: ["Pending", "Partial", "Failed", "Incomplete"] },
		},
		select: {
			id: true,
			source_id: true,
		},
	})

	if (chapters.length === 0) {
		return {
			success: true,
			queued: 0,
			jobIds: [],
		}
	}

	// Queue chapter-data jobs with staggered delays
	// Using jobId to prevent duplicate jobs if retry is clicked multiple times
	const jobIds: string[] = []
	for (const [i, chapter] of chapters.entries()) {
		const job = await chapterDataQueue.add(
			`retry-${chapter.id}`,
			{
				serie_id: serieId,
				source_id: chapter.source_id,
				chapter_id: chapter.id,
				type: "UPDATE",
			},
			{
				jobId: `manual-retry-${chapter.id}`,
				delay: i * 2000, // 2 second delay between jobs
				priority: CHAPTER_DATA_PRIORITY.NORMAL,
			},
		)
		if (job.id) jobIds.push(job.id)
	}

	return {
		success: true,
		queued: chapters.length,
		jobIds: jobIds.slice(0, 10),
	}
})
