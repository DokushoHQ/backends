import { z } from "zod"
import { getSources, parseSerieUrl } from "../../../utils/sources"

const parseSchema = z.object({
	url: z.string().url(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const body = await readBody(event)
	const parsed = parseSchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Valid URL required" })
	}

	const { url } = parsed.data

	// Get all source instances to parse against
	const sources = await getSources()

	// Try to parse the URL using all available sources
	const result = parseSerieUrl(sources, url)

	if (!result) {
		return { success: false, error: "URL does not match any enabled source" }
	}

	// Find the database source ID for this external source ID
	const dbSource = await db.source.findUnique({
		where: { external_id: result.sourceId },
		select: { id: true, name: true },
	})

	if (!dbSource) {
		return { success: false, error: "Source not found in database" }
	}

	// Check if series is already imported via SerieSource
	const existingSerieSource = await db.serieSource.findFirst({
		where: {
			source_id: dbSource.id,
			external_id: result.serieId,
		},
		select: { serie_id: true },
	})

	return {
		success: true,
		sourceId: dbSource.id,
		sourceName: dbSource.name ?? "Unknown",
		serieId: result.serieId,
		imported: !!existingSerieSource,
		existingSerieId: existingSerieSource?.serie_id ?? null,
	}
})
