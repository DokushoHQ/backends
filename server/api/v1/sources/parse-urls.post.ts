import { z } from "zod"
import { getSources, parseSerieUrl } from "../../../utils/sources"

const parseSchema = z.object({
	urls: z.array(z.string()).min(1).max(100),
})

interface ParsedUrlResult {
	url: string
	success: boolean
	error?: string
	sourceId?: string
	sourceName?: string
	serieId?: string
	imported?: boolean
	existingSerieId?: string | null
}

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const body = await readBody(event)
	const parsed = parseSchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Array of URLs required (max 100)" })
	}

	const { urls } = parsed.data

	// Get all source instances to parse against
	const sources = await getSources()

	// Parse all URLs
	const parseResults: Array<{ url: string, sourceId: string, serieId: string } | { url: string, error: string }> = []

	for (const url of urls) {
		// Validate URL format
		try {
			new URL(url)
		}
		catch {
			parseResults.push({ url, error: "Invalid URL format" })
			continue
		}

		const result = parseSerieUrl(sources, url)
		if (!result) {
			parseResults.push({ url, error: "URL does not match any enabled source" })
		}
		else {
			parseResults.push({ url, sourceId: result.sourceId, serieId: result.serieId })
		}
	}

	// Get all unique source IDs that were successfully parsed
	const successfulParses = parseResults.filter((r): r is { url: string, sourceId: string, serieId: string } => "sourceId" in r)
	const uniqueSourceIds = [...new Set(successfulParses.map(r => r.sourceId))]

	// Fetch all sources from DB in one query
	const dbSources = await db.source.findMany({
		where: { external_id: { in: uniqueSourceIds } },
		select: { id: true, name: true, external_id: true },
	})

	const sourceMap = new Map(dbSources.map(s => [s.external_id, { id: s.id, name: s.name }]))

	// Build list of serie sources to check for existing imports
	const serieSourceChecks = successfulParses
		.filter(r => sourceMap.has(r.sourceId))
		.map(r => ({
			source_id: sourceMap.get(r.sourceId)!.id,
			external_id: r.serieId,
		}))

	// Check all existing serie sources in one query
	const existingSerieSources = await db.serieSource.findMany({
		where: {
			OR: serieSourceChecks.map(check => ({
				source_id: check.source_id,
				external_id: check.external_id,
			})),
		},
		select: {
			source_id: true,
			external_id: true,
			serie_id: true,
		},
	})

	// Create a lookup map for existing serie sources
	const existingMap = new Map(
		existingSerieSources.map(s => [`${s.source_id}:${s.external_id}`, s.serie_id]),
	)

	// Build final results
	const results: ParsedUrlResult[] = parseResults.map((parseResult) => {
		if ("error" in parseResult) {
			return {
				url: parseResult.url,
				success: false,
				error: parseResult.error,
			}
		}

		const dbSource = sourceMap.get(parseResult.sourceId)
		if (!dbSource) {
			return {
				url: parseResult.url,
				success: false,
				error: "Source not found in database",
			}
		}

		const existingSerieId = existingMap.get(`${dbSource.id}:${parseResult.serieId}`)

		return {
			url: parseResult.url,
			success: true,
			sourceId: dbSource.id,
			sourceName: dbSource.name ?? "Unknown",
			serieId: parseResult.serieId,
			imported: !!existingSerieId,
			existingSerieId: existingSerieId ?? null,
		}
	})

	return { results }
})
