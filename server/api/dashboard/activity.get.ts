export default defineEventHandler(async (event) => {
	await requireAuth(event)

	// Get activity range from query params
	const query = getQuery(event)
	const activityRange = (query.activityRange as string) || "today"

	// Calculate date range based on selection
	const startDate = new Date()
	let endDate: Date | null = null

	switch (activityRange) {
		case "today":
			startDate.setHours(0, 0, 0, 0)
			break
		case "yesterday": {
			// Yesterday only: from yesterday 00:00 to today 00:00
			const todayStart = new Date()
			todayStart.setHours(0, 0, 0, 0)
			endDate = todayStart
			startDate.setDate(startDate.getDate() - 1)
			startDate.setHours(0, 0, 0, 0)
			break
		}
		case "week":
			startDate.setDate(startDate.getDate() - 7)
			break
		case "month":
			startDate.setDate(startDate.getDate() - 30)
			break
		default:
			startDate.setHours(0, 0, 0, 0)
	}

	// Build date filter for chapters
	const dateFilter = endDate
		? { gte: startDate, lt: endDate }
		: { gte: startDate }

	// Recent activity (chapters added to library)
	const recentActivity = await db.serie.findMany({
		where: {
			updated_at: dateFilter,
		},
		select: {
			id: true,
			title: true,
			cover: true,
			updated_at: true,
			_count: {
				select: { chapters: { where: { created_at: dateFilter } } },
			},
		},
		orderBy: { updated_at: "desc" },
		take: 9,
	})

	return recentActivity.map(r => ({
		serie: { id: r.id, title: r.title, cover: r.cover },
		chapterCount: r._count.chapters,
		latestUpdate: r.updated_at,
	}))
})
