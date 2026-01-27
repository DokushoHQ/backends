import { z } from "zod"
import chapterDedupQueue, { JOB_PRIORITY } from "../../../../queues/chapter-dedup"
import { languageArraySchema } from "../../../../utils/schemas"

const bodySchema = z.object({
	languages: languageArraySchema.optional(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const body = await readBody(event)
	const parsed = bodySchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Invalid request body" })
	}

	// Verify serie exists
	const serie = await db.serie.findUnique({
		where: { id },
		select: { id: true },
	})

	if (!serie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	const job = await chapterDedupQueue.add(
		`chapter-dedup-manual-${id}`,
		{ serie_id: id, languages: parsed.data.languages },
		{ priority: JOB_PRIORITY.NORMAL },
	)

	return { job_id: job.id, message: "Chapter deduplication job queued" }
})
