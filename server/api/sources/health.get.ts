import { getJobs } from "../../utils/queue-stats"

export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const sources = await db.source.findMany({
		include: {
			_count: { select: { serie_sources: true } },
		},
		orderBy: [{ enabled: "desc" }, { name: "asc" }],
	})

	const enabledCount = sources.filter(s => s.enabled).length
	const enabledSources = sources.filter(s => s.enabled)

	// Fetch health data for each enabled source
	const healthData = await Promise.all(
		enabledSources.map(async (source) => {
			const [stats, failingCount] = await Promise.all([
				db.serieSource.aggregate({
					where: { source_id: source.id },
					_max: { last_checked_at: true },
				}),
				db.serieSource.count({
					where: { source_id: source.id, consecutive_failures: { gt: 0 } },
				}),
			])
			return {
				sourceId: source.id,
				lastChecked: stats._max?.last_checked_at ?? null,
				failingCount,
			}
		}),
	)

	// Fetch queue stats for serie-inserter (main queue for source operations)
	const [waitingJobs, activeJobs] = await Promise.all([
		getJobs("serieInserter", "waiting", 0, 100),
		getJobs("serieInserter", "active", 0, 100),
	])

	// Group queue stats by source_id
	const queueStatsBySource: Record<string, { waiting: number, active: number }> = {}
	for (const source of sources) {
		queueStatsBySource[source.id] = { waiting: 0, active: 0 }
	}
	for (const job of waitingJobs) {
		const sourceId = (job.data as { source_id?: string })?.source_id
		if (sourceId && queueStatsBySource[sourceId]) {
			queueStatsBySource[sourceId].waiting++
		}
	}
	for (const job of activeJobs) {
		const sourceId = (job.data as { source_id?: string })?.source_id
		if (sourceId && queueStatsBySource[sourceId]) {
			queueStatsBySource[sourceId].active++
		}
	}

	// Calculate totals
	const totalFailingSeries = healthData.reduce((sum, h) => sum + h.failingCount, 0)
	const mostRecentActivity = healthData.reduce<Date | null>((latest, h) => {
		if (!h.lastChecked) return latest
		if (!latest) return h.lastChecked
		return h.lastChecked > latest ? h.lastChecked : latest
	}, null)

	// Merge data for display
	const sourcesWithHealth = sources.map((source) => {
		const health = healthData.find(h => h.sourceId === source.id)
		return {
			source: {
				id: source.id,
				external_id: source.external_id,
				name: source.name,
				icon: source.icon,
				enabled: source.enabled,
			},
			health: {
				totalSeries: source._count.serie_sources,
				failingCount: health?.failingCount ?? 0,
				lastChecked: health?.lastChecked ?? null,
			},
			queueStats: queueStatsBySource[source.id] ?? { waiting: 0, active: 0 },
		}
	})

	return {
		sources: sourcesWithHealth,
		stats: {
			enabledCount,
			totalCount: sources.length,
			totalFailingSeries,
			mostRecentActivity,
		},
	}
})
