export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const query = getQuery(event)
	const includeDisabled = query.includeDisabled === "true"

	const chapters = await db.chapter.findMany({
		where: {
			serie_id: id,
			...(includeDisabled ? {} : { enabled: true }),
		},
		include: {
			groups: {
				select: { id: true, name: true, url: true },
			},
			source: {
				select: { id: true, external_id: true, name: true },
			},
		},
		orderBy: [{ chapter_number: "desc" }, { id: "asc" }],
	})

	return { chapters }
})
