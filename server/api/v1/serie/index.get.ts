import { serieIndex } from "../../../utils/meilisearch"

const PAGE_SIZE = 24

const serieSelect = {
	id: true,
	title: true,
	synopsis: true,
	cover: true,
	type: true,
	status: true,
	updated_at: true,
	genres: { select: { id: true, title: true } },
	authors: { select: { id: true, name: true } },
	artists: { select: { id: true, name: true } },
	sources: {
		select: {
			id: true,
			external_id: true,
			is_primary: true,
			consecutive_failures: true,
			source: { select: { id: true, external_id: true, name: true } },
		},
		orderBy: { is_primary: "desc" as const },
	},
	_count: { select: { chapters: { where: { enabled: true } } } },
} as const

export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const query = getQuery(event)
	const page = Math.max(1, Number.parseInt(String(query.page || "1"), 10))
	const searchQuery = (query.q as string)?.trim()
	const sourceFilter = query.source as string | undefined
	const failingFilter = query.filter === "failing"

	// Failing series filter
	if (failingFilter) {
		const failingSeries = await db.serieSource.groupBy({
			by: ["serie_id"],
			where: { consecutive_failures: { gt: 0 } },
			_sum: { consecutive_failures: true },
			orderBy: { _sum: { consecutive_failures: "desc" } },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
		})

		const serieIds = failingSeries.map(f => f.serie_id)
		const failureCounts = new Map(failingSeries.map(f => [f.serie_id, f._sum.consecutive_failures ?? 0]))

		const [series, total] = await Promise.all([
			db.serie.findMany({
				where: { id: { in: serieIds } },
				select: serieSelect,
			}),
			db.serieSource.groupBy({
				by: ["serie_id"],
				where: { consecutive_failures: { gt: 0 } },
			}).then(r => r.length),
		])

		// Maintain order from groupBy
		const seriesMap = new Map(series.map(s => [s.id, s]))
		const orderedSeries = serieIds.map((id) => {
			const serie = seriesMap.get(id)
			return serie ? { ...serie, failureCount: failureCounts.get(id) ?? 0 } : null
		}).filter(Boolean)

		return {
			data: orderedSeries,
			pagination: {
				page,
				pageSize: PAGE_SIZE,
				total,
				totalPages: Math.ceil(total / PAGE_SIZE),
			},
		}
	}

	// Source filter
	if (sourceFilter) {
		const whereClause = {
			sources: { some: { source_id: sourceFilter } },
			soft_deleted_at: null,
		}

		const [series, total] = await Promise.all([
			db.serie.findMany({
				where: whereClause,
				skip: (page - 1) * PAGE_SIZE,
				take: PAGE_SIZE,
				orderBy: { updated_at: "desc" },
				select: serieSelect,
			}),
			db.serie.count({ where: whereClause }),
		])

		return {
			data: series,
			pagination: {
				page,
				pageSize: PAGE_SIZE,
				total,
				totalPages: Math.ceil(total / PAGE_SIZE),
			},
		}
	}

	// Search query
	if (searchQuery) {
		const searchResult = await serieIndex.search(searchQuery, {
			limit: PAGE_SIZE,
			offset: (page - 1) * PAGE_SIZE,
		})

		const ids = searchResult.hits.map(hit => hit.id)
		if (ids.length === 0) {
			return {
				data: [],
				pagination: { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 },
			}
		}

		// Get series by IDs, maintaining search order
		const seriesMap = new Map(
			(
				await db.serie.findMany({
					where: { id: { in: ids }, soft_deleted_at: null },
					select: serieSelect,
				})
			).map(s => [s.id, s]),
		)

		const series = ids.map(id => seriesMap.get(id)).filter(Boolean)
		const total = searchResult.estimatedTotalHits ?? series.length

		return {
			data: series,
			pagination: {
				page,
				pageSize: PAGE_SIZE,
				total,
				totalPages: Math.ceil(total / PAGE_SIZE),
			},
		}
	}

	// Default: paginated series
	const [series, total] = await Promise.all([
		db.serie.findMany({
			where: { soft_deleted_at: null },
			skip: (page - 1) * PAGE_SIZE,
			take: PAGE_SIZE,
			orderBy: { updated_at: "desc" },
			select: serieSelect,
		}),
		db.serie.count({ where: { soft_deleted_at: null } }),
	])

	return {
		data: series,
		pagination: {
			page,
			pageSize: PAGE_SIZE,
			total,
			totalPages: Math.ceil(total / PAGE_SIZE),
		},
	}
})
