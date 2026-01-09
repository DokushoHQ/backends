import { getSource } from "../../../../utils/sources"

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const sourceId = getRouterParam(event, "id")
	if (!sourceId) {
		throw createError({ statusCode: 400, message: "Source ID required" })
	}

	const query = getQuery(event)
	const searchQuery = (query.q as string)?.trim()
	const page = Math.max(1, Number.parseInt(String(query.page || "1"), 10))

	const dbSource = await db.source.findUnique({
		where: { id: sourceId, enabled: true },
	})

	if (!dbSource) {
		throw createError({ statusCode: 404, message: "Source not found or disabled" })
	}

	try {
		const source = await getSource(dbSource.external_id)
		const results = searchQuery
			? await source.fetchSearchSerie(page, { query: searchQuery })
			: await source.fetchLatestUpdates(page)

		// Check which series are already imported via SerieSource
		const externalIds = results.series.map(s => s.id)
		const existingSerieSources = await db.serieSource.findMany({
			where: {
				source_id: sourceId,
				external_id: { in: externalIds },
			},
			select: { external_id: true, serie_id: true },
		})
		const importedMap = new Map(existingSerieSources.map(s => [s.external_id, s.serie_id]))

		// Helper to get first value from MultiLanguage for search results
		const getTitle = (ml: Partial<Record<string, string[]>>): string => {
			const enTitle = ml.En?.[0]
			if (enTitle) return enTitle
			const firstLang = Object.values(ml)[0]
			return firstLang?.[0] || "Unknown"
		}

		return {
			series: results.series.map(s => ({
				id: s.id,
				title: getTitle(s.title),
				cover: s.cover?.toString() ?? null,
				imported: importedMap.has(s.id),
				serieId: importedMap.get(s.id) ?? null,
			})),
			hasNextPage: results.hasNextPage,
			page,
		}
	}
	catch (e) {
		console.error("Source search error:", e)
		throw createError({ statusCode: 500, message: "Failed to search source" })
	}
})
