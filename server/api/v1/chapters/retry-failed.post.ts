import { z } from "zod"
import pageRetryQueue from "../../../queues/page-retry"
import type { Prisma } from "../../../utils/db"

const bodySchema = z.object({
	scope: z.enum(["global", "serie"]),
	serie_id: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const body = await readValidatedBody(event, bodySchema.parse)

	// Build where clause based on scope
	const where: Prisma.ChapterWhereInput = {
		page_fetch_status: { in: ["Partial", "Failed"] },
		data: {
			some: {
				url: null,
				source_url: { not: null },
			},
		},
	}

	if (body.scope === "serie" && body.serie_id) {
		where.serie_id = body.serie_id
	}

	// Find chapters to retry
	const chapters = await db.chapter.findMany({
		where,
		select: { id: true },
		take: 500,
	})

	// Queue jobs with staggered delays
	const jobIds: string[] = []
	for (const [i, chapter] of chapters.entries()) {
		const job = await pageRetryQueue.add(
			`retry-${chapter.id}`,
			{ chapter_id: chapter.id },
			{
				delay: i * 3000,
				jobId: `page-retry-${chapter.id}`,
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
