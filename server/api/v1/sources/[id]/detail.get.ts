import { getSource } from "../../../../utils/sources"

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const sourceId = getRouterParam(event, "id")
	if (!sourceId) {
		throw createError({ statusCode: 400, message: "Source ID required" })
	}

	const query = getQuery(event)
	const serieId = query.serieId as string
	if (!serieId) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const dbSource = await db.source.findUnique({
		where: { id: sourceId, enabled: true },
	})

	if (!dbSource) {
		throw createError({ statusCode: 404, message: "Source not found or disabled" })
	}

	try {
		const source = await getSource(dbSource.external_id)
		const detail = await source.fetchSerieDetail(serieId)

		// Helper to get first value from MultiLanguage
		const getFirstValue = (ml: Partial<Record<string, string[]>> | undefined): string | null => {
			if (!ml) return null
			const values = Object.values(ml).flat()
			return values[0] || null
		}

		// Helper to get all values from MultiLanguage
		const getAllValues = (ml: Partial<Record<string, string[]>> | undefined): string[] => {
			if (!ml) return []
			return Object.values(ml)
				.flat()
				.filter((v): v is string => v !== undefined)
		}

		return {
			id: detail.id,
			title: getFirstValue(detail.title) || "Unknown",
			alternateTitles: getAllValues(detail.alternatesTitles),
			cover: detail.cover?.toString() ?? null,
			synopsis: getFirstValue(detail.synopsis),
			status: detail.status,
			type: detail.type,
			genres: detail.genres,
			authors: detail.authors,
			artists: detail.artists,
		}
	}
	catch (e) {
		console.error("Source detail fetch error:", e)
		throw createError({ statusCode: 500, message: "Failed to fetch series details" })
	}
})
