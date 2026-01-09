export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const sources = await db.source.findMany({
		where: { enabled: true },
		select: {
			id: true,
			external_id: true,
			name: true,
			icon: true,
		},
		orderBy: { name: "asc" },
	})

	return sources
})
