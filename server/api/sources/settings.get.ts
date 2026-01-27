export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const sources = await db.source.findMany({
		select: {
			id: true,
			external_id: true,
			name: true,
			icon: true,
			enabled: true,
			priority: true,
		},
		orderBy: [{ priority: "asc" }, { name: "asc" }],
	})

	return sources
})
