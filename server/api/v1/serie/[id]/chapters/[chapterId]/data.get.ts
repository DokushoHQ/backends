export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const serieId = getRouterParam(event, "id")
	const chapterId = getRouterParam(event, "chapterId")

	if (!serieId || !chapterId) {
		throw createError({ statusCode: 400, message: "Serie ID and Chapter ID required" })
	}

	const chapter = await db.chapter.findUnique({
		where: { id: chapterId, serie_id: serieId },
		include: {
			data: {
				orderBy: { index: "asc" },
				select: { index: true, type: true, url: true, content: true, image_quality: true, metadata_issues: true },
			},
		},
	})

	if (!chapter) {
		throw createError({ statusCode: 404, message: "Chapter not found" })
	}

	return {
		pages: chapter.data,
		hasData: chapter.data.length > 0,
	}
})
