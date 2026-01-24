import { z } from "zod"
import { serieIndex } from "../../../utils/meilisearch"

const PAGE_SIZE = 24

const querySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	q: z.string().trim().optional(),
	filter: z.enum(["failing"]).optional(),
	source: z.string().uuid().optional(),
	genre: z.string().optional(),
	author: z.string().optional(),
	artist: z.string().optional(),
	status: z.string().optional(),
	type: z.string().optional(),
})

const serieSelect = {
	id: true,
	title: true,
	synopsis: true,
	cover: true,
	type: true,
	status: true,
	updated_at: true,
	_count: { select: { chapters: { where: { enabled: true } } } },
} as const

export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const query = await getValidatedQuery(event, querySchema.parse)

	const {
		page,
		q: searchQuery,
		filter,
		source: sourceFilter,
		genre: genreFilter,
		author: authorFilter,
		artist: artistFilter,
		status: statusFilter,
		type: typeFilter,
	} = query

	const failingFilter = filter === "failing"

	// Build Meilisearch filter array
	function buildFilters(): string[] {
		const filters: string[] = ["soft_deleted = false"]
		if (sourceFilter) filters.push(`source_ids = "${sourceFilter}"`)
		if (genreFilter) filters.push(`genres = "${genreFilter}"`)
		if (authorFilter) filters.push(`authors = "${authorFilter}"`)
		if (artistFilter) filters.push(`artists = "${artistFilter}"`)
		if (statusFilter) filters.push(`status = "${statusFilter}"`)
		if (typeFilter) filters.push(`type = "${typeFilter}"`)
		return filters
	}

	const hasMetadataFilters = genreFilter || authorFilter || artistFilter || statusFilter || typeFilter

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

	// Metadata/source filters using Meilisearch (when not searching)
	if ((sourceFilter || hasMetadataFilters) && !searchQuery) {
		const searchResult = await serieIndex.search("", {
			limit: PAGE_SIZE,
			offset: (page - 1) * PAGE_SIZE,
			filter: buildFilters().join(" AND "),
			sort: ["updated_at:desc"],
		})

		const ids = searchResult.hits.map(hit => hit.id)
		if (ids.length === 0) {
			return {
				data: [],
				pagination: { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 },
			}
		}

		const seriesMap = new Map(
			(
				await db.serie.findMany({
					where: { id: { in: ids } },
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

	// Search query (with optional filters)
	if (searchQuery) {
		const searchResult = await serieIndex.search(searchQuery, {
			limit: PAGE_SIZE,
			offset: (page - 1) * PAGE_SIZE,
			filter: buildFilters().join(" AND "),
		})

		const ids = searchResult.hits.map(hit => hit.id)
		if (ids.length === 0) {
			return {
				data: [],
				pagination: { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 },
			}
		}

		// Create a map of hit data for merging sources
		const hitsMap = new Map(searchResult.hits.map(hit => [hit.id, hit]))

		// Get series by IDs, maintaining search order
		const seriesMap = new Map(
			(
				await db.serie.findMany({
					where: { id: { in: ids }, soft_deleted_at: null },
					select: serieSelect,
				})
			).map(s => [s.id, s]),
		)

		// Merge DB data with sources from Meilisearch hits
		const series = ids.map((id) => {
			const dbData = seriesMap.get(id)
			if (!dbData) return null
			const hit = hitsMap.get(id)
			return { ...dbData, sources: hit?.sources ?? [] }
		}).filter(Boolean)
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

	// Default: paginated series using Meilisearch for fast sorting/filtering
	const searchResult = await serieIndex.search("", {
		limit: PAGE_SIZE,
		offset: (page - 1) * PAGE_SIZE,
		filter: buildFilters().join(" AND "),
		sort: ["updated_at:desc"],
	})

	const ids = searchResult.hits.map(hit => hit.id)
	if (ids.length === 0) {
		return {
			data: [],
			pagination: { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 },
		}
	}

	// Fetch full data from PostgreSQL, maintaining Meilisearch order
	const seriesMap = new Map(
		(
			await db.serie.findMany({
				where: { id: { in: ids } },
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
})
