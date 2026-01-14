export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const query = getQuery(event)
	const limit = Math.min(Math.max(1, Number.parseInt(String(query.limit || "10"), 10)), 20)

	const series = await db.serie.findMany({
		where: { soft_deleted_at: null },
		orderBy: { created_at: "desc" },
		take: limit,
		select: {
			id: true,
			title: true,
			cover: true,
			created_at: true,
			sources: {
				select: {
					source: { select: { name: true } },
				},
			},
			_count: { select: { chapters: { where: { enabled: true } } } },
		},
	})

	return {
		series: series.map(s => ({
			id: s.id,
			title: s.title,
			cover: s.cover,
			sources: [...new Set(s.sources.map(src => src.source.name))],
			chapterCount: s._count.chapters,
			importedAt: s.created_at.toISOString(),
		})),
	}
})
