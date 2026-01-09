import { z } from "zod"

const acknowledgeSchema = z.object({
	chapterIds: z.array(z.string()).min(1),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const serieId = getRouterParam(event, "id")
	if (!serieId) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const body = await readBody(event)
	const parsed = acknowledgeSchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Invalid request body" })
	}

	const { chapterIds } = parsed.data

	// Verify chapters belong to this serie and are removed from source
	const chapters = await db.chapter.findMany({
		where: {
			id: { in: chapterIds },
			serie_id: serieId,
			source_removed_at: { not: null },
		},
		select: { id: true },
	})

	if (chapters.length !== chapterIds.length) {
		throw createError({
			statusCode: 400,
			message: "Some chapters not found, don't belong to this serie, or are not removed from source",
		})
	}

	const result = await db.chapter.updateMany({
		where: { id: { in: chapterIds } },
		data: { source_removal_acknowledged_at: new Date() },
	})

	return { success: true, count: result.count }
})
