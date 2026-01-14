import { serieIndex } from "../../../utils/meilisearch"

export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const query = getQuery(event)
	const titlesParam = query.titles as string | undefined
	const excludeSourceId = query.excludeSourceId as string | undefined
	const limit = Math.min(Math.max(1, Number.parseInt(String(query.limit || "1"), 10)), 5)

	if (!titlesParam?.trim()) {
		return { matches: [] }
	}

	// Parse comma-separated titles and join for search
	const titles = titlesParam.split(",").map(t => t.trim()).filter(Boolean)
	if (titles.length === 0) {
		return { matches: [] }
	}

	const config = useRuntimeConfig()
	const threshold = Number.parseFloat(config.importSimilarityThreshold) || 0.8

	// Search with all titles combined for best matching
	const searchQuery = titles.join(" ")
	const searchResult = await serieIndex.search(searchQuery, {
		limit: limit * 3, // Fetch more to account for filtering
		showRankingScore: true,
	})

	if (searchResult.hits.length === 0) {
		return { matches: [] }
	}

	// Get series IDs that match
	const hitIds = searchResult.hits.map(hit => hit.id)

	// Fetch full series data with sources
	const series = await db.serie.findMany({
		where: {
			id: { in: hitIds },
			soft_deleted_at: null,
		},
		select: {
			id: true,
			title: true,
			cover: true,
			sources: {
				select: {
					source_id: true,
					source: { select: { id: true, name: true } },
				},
			},
		},
	})

	const seriesMap = new Map(series.map(s => [s.id, s]))

	// Build matches, filtering and scoring
	const matches: Array<{
		serieId: string
		title: string
		sources: Array<{ id: string, name: string }>
		similarity: number
		cover: string | null
	}> = []

	for (const hit of searchResult.hits) {
		const serie = seriesMap.get(hit.id)
		if (!serie) continue

		// Skip if already linked to the excluded source
		if (excludeSourceId && serie.sources.some(s => s.source_id === excludeSourceId)) {
			continue
		}

		// Use Meilisearch ranking score as similarity (0-1 range)
		const similarity = hit._rankingScore ?? 0

		// Skip if below threshold
		if (similarity < threshold) {
			continue
		}

		matches.push({
			serieId: serie.id,
			title: serie.title,
			sources: serie.sources.map(s => ({ id: s.source.id, name: s.source.name })),
			similarity: Math.round(similarity * 100) / 100,
			cover: serie.cover,
		})

		if (matches.length >= limit) {
			break
		}
	}

	return { matches }
})
