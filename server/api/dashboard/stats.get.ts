export default defineEventHandler(async (event) => {
	const { user } = await requireAuth(event)
	const isAdmin = user.role === "admin"

	// Base queries for all users
	const baseQueries = [
		db.serie.count(),
		db.chapter.count(),
		db.source.count({ where: { enabled: true } }),
		// Recently added series (new to library)
		db.serie.findMany({
			take: 8,
			orderBy: { created_at: "desc" },
			select: {
				id: true,
				title: true,
				cover: true,
				created_at: true,
				_count: { select: { chapters: true } },
			},
		}),
	] as const

	const [seriesCount, chaptersCount, sourcesCount, recentlyAddedSeries]
		= await Promise.all(baseQueries)

	// User count for admins (fast query)
	const usersCount = isAdmin ? await db.user.count() : null

	return {
		stats: {
			seriesCount,
			chaptersCount,
			sourcesCount,
			usersCount,
		},
		recentlyAddedSeries,
	}
})
