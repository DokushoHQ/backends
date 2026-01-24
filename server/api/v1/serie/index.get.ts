import { z } from "zod"
import { serieIndex } from "../../../utils/meilisearch"

const PAGE_SIZE = 24

const querySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	q: z.string().trim().optional(),
	filter: z.enum(["failing", "no-chapters"]).optional(),
	source: z.string().uuid().optional(),
	genre: z.string().optional(),
	author: z.string().optional(),
	artist: z.string().optional(),
	status: z.string().optional(),
	type: z.string().optional(),
	language: z.string().optional(),
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
		language: languageFilter,
	} = query

	const failingFilter = filter === "failing"
	const noChaptersFilter = filter === "no-chapters"

	// Build Meilisearch filter array
	function buildFilters(): string[] {
		const filters: string[] = ["soft_deleted = false"]
		if (noChaptersFilter) filters.push("chapter_count = 0")
		if (languageFilter) filters.push(`languages_available = "${languageFilter}"`)
		if (sourceFilter) filters.push(`source_ids = "${sourceFilter}"`)
		if (genreFilter) filters.push(`genres = "${genreFilter}"`)
		if (authorFilter) filters.push(`authors = "${authorFilter}"`)
		if (artistFilter) filters.push(`artists = "${artistFilter}"`)
		if (statusFilter) filters.push(`status = "${statusFilter}"`)
		if (typeFilter) filters.push(`type = "${typeFilter}"`)
		return filters
	}

	// Failing series filter - uses PostgreSQL for failure counting
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

	// Default: Meilisearch search with optional filters
	// - With search query: relevance sorting
	// - Without search query: sort by updated_at desc
	const searchResult = await serieIndex.search(searchQuery ?? "", {
		limit: PAGE_SIZE,
		offset: (page - 1) * PAGE_SIZE,
		filter: buildFilters().join(" AND "),
		...(!searchQuery && { sort: ["updated_at:desc"] }),
	})

	const ids = searchResult.hits.map(hit => hit.id)
	if (ids.length === 0) {
		return {
			data: [],
			pagination: { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 },
		}
	}

	const hitsMap = new Map(searchResult.hits.map(hit => [hit.id, hit]))

	const seriesMap = new Map(
		(
			await db.serie.findMany({
				where: { id: { in: ids } },
				select: serieSelect,
			})
		).map(s => [s.id, s]),
	)

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
})
