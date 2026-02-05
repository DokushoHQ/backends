/**
 * Import URLs Composable
 *
 * Manages state for the URL paste flow: parsing URLs and files.
 */

// ==================== Types ====================

interface ParseUrlsResponse {
	results: Array<{
		url: string
		success: boolean
		error?: string
		sourceId?: string
		sourceName?: string
		serieId?: string
		imported?: boolean
		existingSerieId?: string | null
	}>
}

interface ParseFileResponse {
	results: ParseUrlsResponse["results"]
	stats: {
		totalInFile: number
		duplicatesRemoved: number
		invalidUrlsRemoved: number
	}
}

export interface ParseFileStats {
	totalInFile: number
	duplicatesRemoved: number
	invalidUrlsRemoved: number
}

export interface ParsedUrlItem {
	url: string
	status: "valid" | "invalid" | "imported"
	sourceId?: string
	sourceName?: string
	externalId?: string
	existingSerieId?: string
	error?: string
	selected: boolean
}

interface SerieDetail {
	id: string
	title: string
	alternateTitles: string[]
	cover: string | null
	synopsis: string | null
	status: string[]
	type: string
	genres: string[]
	authors: string[]
	artists: string[]
}

// ==================== Helpers ====================

function mapParseResult(result: ParseUrlsResponse["results"][number]): ParsedUrlItem {
	if (result.success && result.sourceId && result.sourceName && result.serieId) {
		return {
			url: result.url,
			status: result.imported ? "imported" : "valid",
			sourceId: result.sourceId,
			sourceName: result.sourceName,
			externalId: result.serieId,
			existingSerieId: result.existingSerieId ?? undefined,
			selected: !result.imported,
		}
	}
	return {
		url: result.url,
		status: "invalid",
		error: result.error || "Failed to parse URL",
		selected: false,
	}
}

// ==================== Composable ====================

export function useImportUrls() {
	const cart = useImportCart()

	// ==================== State ====================
	const urlInput = ref("")
	const parsedUrls = ref<ParsedUrlItem[]>([])
	const parsingUrls = ref(false)
	const parsingFile = ref(false)
	const parseFileStats = ref<ParseFileStats | null>(null)
	const parseFileError = ref<string | null>(null)
	const addingToCart = ref(false)

	// ==================== Computed ====================
	const validCount = computed(() =>
		parsedUrls.value.filter(u => u.status === "valid" && u.selected).length,
	)

	const isLoading = computed(() => parsingUrls.value || parsingFile.value || addingToCart.value)

	// ==================== Methods ====================

	async function parseUrls() {
		// Split, trim, filter empty, and deduplicate URLs
		const urls = [...new Set(urlInput.value.split("\n").map(u => u.trim()).filter(Boolean))]
		if (urls.length === 0) {
			parsedUrls.value = []
			return
		}

		parsingUrls.value = true

		try {
			const response = await $fetch<ParseUrlsResponse>("/api/v1/sources/parse-urls", {
				method: "POST",
				body: { urls },
			})

			parsedUrls.value = response.results.map(mapParseResult)
		}
		catch {
			// If batch request fails, mark all as invalid
			parsedUrls.value = urls.map(url => ({
				url,
				status: "invalid",
				error: "Failed to parse URLs",
				selected: false,
			}))
		}
		finally {
			parsingUrls.value = false
		}
	}

	async function parseFile(file: File) {
		parsingFile.value = true
		parseFileStats.value = null
		parseFileError.value = null

		try {
			const formData = new FormData()
			formData.append("file", file)

			const response = await $fetch<ParseFileResponse>("/api/v1/sources/parse-file", {
				method: "POST",
				body: formData,
			})

			parseFileStats.value = response.stats
			parsedUrls.value = response.results.map(mapParseResult)

			// Clear textarea input since we're using file upload
			urlInput.value = ""
		}
		catch (e: unknown) {
			const fetchError = e as { data?: { message?: string }, message?: string }
			parseFileError.value = fetchError.data?.message || fetchError.message || "Failed to parse file"
			parsedUrls.value = []
		}
		finally {
			parsingFile.value = false
		}
	}

	function toggleUrlSelection(index: number) {
		const item = parsedUrls.value[index]
		if (item && item.status === "valid") {
			item.selected = !item.selected
		}
	}

	async function addParsedUrlsToCart(): Promise<void> {
		const validUrls = parsedUrls.value.filter(u => u.status === "valid" && u.selected)

		if (validUrls.length === 0) return

		addingToCart.value = true

		try {
			for (const item of validUrls) {
				if (!item.sourceId || !item.externalId || !item.sourceName) continue

				// Fetch detail to get full info
				try {
					const detail = await apiFetch(`/api/v1/sources/${item.sourceId}/detail`, {
						query: { serieId: item.externalId },
					}) as SerieDetail

					cart.addToCart({
						sourceId: item.sourceId,
						sourceName: item.sourceName,
						externalId: item.externalId,
						title: detail.title,
						cover: detail.cover,
						type: detail.type,
						status: detail.status,
					})
				}
				catch {
					// Skip if can't fetch detail
				}
			}

			// Clear parsed URLs after adding
			urlInput.value = ""
			parsedUrls.value = []
			parseFileStats.value = null
		}
		finally {
			addingToCart.value = false
		}
	}

	function reset() {
		urlInput.value = ""
		parsedUrls.value = []
		parsingUrls.value = false
		parsingFile.value = false
		parseFileStats.value = null
		parseFileError.value = null
		addingToCart.value = false
	}

	return {
		// State
		urlInput,
		parsedUrls,
		parsingUrls,
		parsingFile,
		parseFileStats,
		parseFileError,
		addingToCart,

		// Computed
		validCount,
		isLoading,

		// Methods
		parseUrls,
		parseFile,
		toggleUrlSelection,
		addParsedUrlsToCart,
		reset,
	}
}
