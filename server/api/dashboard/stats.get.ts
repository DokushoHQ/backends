export default defineEventHandler(async (event) => {
	const { user } = await requireAuth(event)
	const isAdmin = user.role === "admin"

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
		// Recent activity (chapters added to library)
		db.serie.findMany({
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
		}),
	] as const

	// Admin-only queries
	const adminQueries = isAdmin
		? ([
				db.user.count(),
				// Series needing attention (failed scrapes, pending deletion, missing covers, chapter data issues)
				db.serie.findMany({
					where: {
						OR: [
							{ sources: { some: { consecutive_failures: { gt: 0 } } } },
							{ soft_deleted_at: { not: null } },
							{ cover: null },
							{ chapters: { some: { page_fetch_status: { in: ["Pending", "Failed", "Partial"] } } } },
						],
					},
					select: {
						id: true,
						title: true,
						cover: true,
						soft_deleted_at: true,
						sources: {
							where: { consecutive_failures: { gt: 0 } },
							select: {
								consecutive_failures: true,
								source: { select: { name: true } },
							},
						},
						_count: {
							select: {
								chapters: {
									where: { page_fetch_status: { in: ["Pending", "Failed", "Partial"] } },
								},
							},
						},
					},
					orderBy: { updated_at: "desc" },
					take: 10,
				}),
				// Job stats
				getAllQueueStats(),
			] as const)
		: null

	const [seriesCount, chaptersCount, sourcesCount, recentlyAddedSeries, recentActivity]
		= await Promise.all(baseQueries)

	// Fetch admin data if user is admin
	let usersCount = null
	let seriesNeedingAttention = null
	let jobStats = null

	if (adminQueries) {
		;[usersCount, seriesNeedingAttention, jobStats] = await Promise.all(adminQueries)
	}

	// Aggregate job stats (admin only)
	const jobSummary = jobStats
		? {
				active: jobStats.reduce((sum, q) => sum + q.active, 0),
				waiting: jobStats.reduce((sum, q) => sum + q.waiting, 0),
				completed: jobStats.reduce((sum, q) => sum + q.completed, 0),
				failed: jobStats.reduce((sum, q) => sum + q.failed, 0),
				delayed: jobStats.reduce((sum, q) => sum + q.delayed, 0),
				total: jobStats.reduce((sum, q) => sum + q.total, 0),
				queues: jobStats,
			}
		: null

	// Transform series needing attention (admin only)
	const attentionItems = seriesNeedingAttention
		? seriesNeedingAttention.map((serie) => {
				const issues: string[] = []
				if (serie.soft_deleted_at) issues.push("pending_deletion")
				if (!serie.cover) issues.push("missing_cover")
				if (serie.sources.length > 0) {
					const totalFailures = serie.sources.reduce((sum, s) => sum + s.consecutive_failures, 0)
					if (totalFailures > 0) issues.push("scrape_failures")
				}
				if (serie._count.chapters > 0) issues.push("chapter_data_missing")
				return {
					id: serie.id,
					title: serie.title,
					cover: serie.cover,
					issues,
					failedSources: serie.sources.map(s => ({
						name: s.source.name,
						failures: s.consecutive_failures,
					})),
					chaptersNeedingData: serie._count.chapters,
				}
			})
		: null

	return {
		stats: {
			seriesCount,
			chaptersCount,
			sourcesCount,
			usersCount,
		},
		recentlyAddedSeries,
		recentActivity: recentActivity.map(r => ({
			serie: { id: r.id, title: r.title, cover: r.cover },
			chapterCount: r._count.chapters,
			latestUpdate: r.updated_at,
		})),
		seriesNeedingAttention: attentionItems,
		jobSummary,
	}
})
