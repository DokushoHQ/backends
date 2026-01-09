import { z } from "zod"

const toggleSchema = z.object({
	chapterIds: z.array(z.string()).min(1),
	enabled: z.boolean(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const serieId = getRouterParam(event, "id")
	if (!serieId) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const body = await readBody(event)
	const parsed = toggleSchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Invalid request body" })
	}

	const { chapterIds, enabled } = parsed.data

	// Verify chapters belong to this serie
	const chapters = await db.chapter.findMany({
		where: { id: { in: chapterIds }, serie_id: serieId },
		select: { id: true },
	})

	if (chapters.length !== chapterIds.length) {
		throw createError({ statusCode: 400, message: "Some chapters not found or don't belong to this serie" })
	}

	const result = await db.chapter.updateMany({
		where: { id: { in: chapterIds } },
		data: { enabled },
	})

	return { success: true, count: result.count }
})
