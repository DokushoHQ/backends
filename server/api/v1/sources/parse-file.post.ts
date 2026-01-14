import Papa from "papaparse"
import { getSources, parseSerieUrl } from "../../../utils/sources"

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

interface ParseFileResponse {
	results: ParsedUrlResult[]
	stats: {
		totalInFile: number
		duplicatesRemoved: number
		invalidUrlsRemoved: number
	}
}

function parseTxtContent(content: string): string[] {
	return content
		.split("\n")
		.map(line => line.trim())
		.filter(line => line.length > 0 && !line.startsWith("#"))
}

function parseCsvContent(content: string): { urls: string[], error?: string } {
	const result = Papa.parse(content, {
		header: true,
		skipEmptyLines: true,
	})

	if (result.errors.length > 0 && result.data.length === 0) {
		return { urls: [], error: "Failed to parse CSV file" }
	}

	// Find url column (case-insensitive)
	const headers = result.meta.fields || []
	const urlColumn = headers.find(h => h.toLowerCase() === "url")

	if (!urlColumn) {
		return { urls: [], error: "No 'url' column found in CSV. The CSV must have a column named 'url'." }
	}

	const urls = (result.data as Record<string, unknown>[])
		.map(row => row[urlColumn])
		.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
		.map(url => url.trim())

	return { urls }
}

function isValidUrl(url: string): boolean {
	try {
		new URL(url)
		return true
	}
	catch {
		return false
	}
}

export default defineEventHandler(async (event): Promise<ParseFileResponse> => {
	await requireAdmin(event)

	// Read multipart form data
	const formData = await readMultipartFormData(event)
	if (!formData) {
		throw createError({ statusCode: 400, message: "No file uploaded" })
	}

	const fileField = formData.find(f => f.name === "file")
	if (!fileField || !fileField.data) {
		throw createError({ statusCode: 400, message: "No file provided" })
	}

	const filename = fileField.filename || ""
	const content = fileField.data.toString("utf-8")

	if (!content.trim()) {
		throw createError({ statusCode: 400, message: "File is empty" })
	}

	// Determine file type and parse URLs
	let urls: string[]
	const isCsv = filename.toLowerCase().endsWith(".csv")
		|| fileField.type?.includes("csv")

	if (isCsv) {
		const csvResult = parseCsvContent(content)
		if (csvResult.error) {
			throw createError({ statusCode: 400, message: csvResult.error })
		}
		urls = csvResult.urls
	}
	else {
		// Treat as TXT (one URL per line)
		urls = parseTxtContent(content)
	}

	const totalInFile = urls.length

	// Filter out invalid URLs
	const validUrls = urls.filter(isValidUrl)
	const invalidUrlsRemoved = totalInFile - validUrls.length

	// Deduplicate
	const uniqueUrls = [...new Set(validUrls)]
	const duplicatesRemoved = validUrls.length - uniqueUrls.length

	if (uniqueUrls.length === 0) {
		return {
			results: [],
			stats: {
				totalInFile,
				duplicatesRemoved,
				invalidUrlsRemoved,
			},
		}
	}

	// Limit to 500 URLs
	if (uniqueUrls.length > 500) {
		throw createError({ statusCode: 400, message: "File contains too many URLs (max 500)" })
	}

	// Get all source instances to parse against
	const sources = await getSources()

	// Parse all URLs
	const parseResults: Array<{ url: string, sourceId: string, serieId: string } | { url: string, error: string }> = []

	for (const url of uniqueUrls) {
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
	const existingSerieSources = serieSourceChecks.length > 0
		? await db.serieSource.findMany({
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
		: []

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

	return {
		results,
		stats: {
			totalInFile,
			duplicatesRemoved,
			invalidUrlsRemoved,
		},
	}
})
