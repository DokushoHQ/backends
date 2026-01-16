import type { InjectionKey } from "vue"

export interface Source {
	id: string
	name: string
	external_id: string
	icon: string | null
}

export interface SearchResult {
	id: string
	title: string
	cover: string | null
	imported: boolean
	serieId: string | null
}

export interface SerieDetail {
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

// ==================== Injection Key ====================

export type ImportWizardReturn = ReturnType<typeof useImportWizard>
export const ImportWizardKey: InjectionKey<ImportWizardReturn> = Symbol("ImportWizard")

export function useImportWizardInjected(): ImportWizardReturn {
	const wizard = inject(ImportWizardKey)
	if (!wizard) {
		throw new Error("useImportWizardInjected must be used within a component that provides ImportWizardKey")
	}
	return wizard
}

// ==================== Types ====================

export type WizardStep = "entry" | "url-paste" | "source-select" | "browse" | "review" | "processing"
export type EntryMode = "browse" | "url" | "csv" | null

export interface SimilarMatch {
	serieId: string
	title: string
	sources: Array<{ id: string, name: string }>
	similarity: number
	cover: string | null
}

export interface SelectedSerie {
	// Identification
	sourceId: string
	sourceName: string
	externalId: string

	// Display data
	title: string
	cover: string | null
	type: string
	status: string[]
	chapterCount?: number

	// Duplicate detection (populated in review step)
	similarMatches?: SimilarMatch[]
	loadingSimilarity?: boolean

	// User decision
	action?: "import" | "link"
	linkToSerieId?: string
	linkToSerieTitle?: string
	linkToSerieCover?: string | null

	// Processing state
	processingState?: "pending" | "processing" | "success" | "error"
	processingMessage?: string
	jobId?: string
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

export interface RecentSerie {
	id: string
	title: string
	cover: string | null
	sources: string[]
	chapterCount: number
	importedAt: string
}

// ==================== Composable ====================

export function useImportWizard() {
	// ==================== Step State ====================
	const step = ref<WizardStep>("entry")
	const entryMode = ref<EntryMode>(null)

	// ==================== Cart State ====================
	const selectedSeries = ref<Map<string, SelectedSerie>>(new Map())

	// ==================== Source Browsing State ====================
	const sources = ref<Source[]>([])
	const loadingSources = ref(false)
	const selectedSource = ref<Source | null>(null)
	const searchQuery = ref("")
	const searchResults = ref<SearchResult[]>([])
	const searching = ref(false)
	const hasMore = ref(false)
	const searchPage = ref(1)
	const searchError = ref<string | null>(null)

	// ==================== Detail State ====================
	const selectedSerieDetail = ref<SerieDetail | null>(null)
	const loadingDetail = ref(false)
	const showDetailSheet = ref(false)

	// ==================== URL Paste State ====================
	const urlInput = ref("")
	const parsedUrls = ref<ParsedUrlItem[]>([])
	const parsingUrls = ref(false)
	const parsingFile = ref(false)
	const parseFileStats = ref<ParseFileStats | null>(null)
	const parseFileError = ref<string | null>(null)

	// ==================== Review State ====================
	const loadingSimilarities = ref(false)

	// ==================== Processing State ====================
	const processingStarted = ref(false)

	// ==================== Library Search State ====================
	const librarySearchQuery = ref("")
	const librarySearchResults = ref<RecentSerie[]>([])
	const recentSeries = ref<RecentSerie[]>([])
	const loadingLibrarySearch = ref(false)
	const loadingRecentSeries = ref(false)
	const showLibrarySearchSheet = ref(false)
	const librarySearchForSerieKey = ref<string | null>(null)

	// ==================== Computed ====================
	const cartCount = computed(() => selectedSeries.value.size)
	const cartItems = computed(() => Array.from(selectedSeries.value.values()))

	const allDecisionsMade = computed(() => {
		if (cartCount.value === 0) return false
		// Check that each item has a complete action:
		// - "import" is always complete
		// - "link" requires a linkToSerieId
		return cartItems.value.every((s) => {
			if (s.action === "import") return true
			if (s.action === "link" && s.linkToSerieId) return true
			return false
		})
	})

	const processingProgress = computed(() => {
		if (cartCount.value === 0) return 0
		const completed = cartItems.value.filter(s =>
			s.processingState === "success" || s.processingState === "error",
		).length
		return Math.round((completed / cartCount.value) * 100)
	})

	const processingComplete = computed(() => {
		return cartItems.value.every(s =>
			s.processingState === "success" || s.processingState === "error",
		)
	})

	const processingStats = computed(() => {
		const items = cartItems.value
		return {
			total: items.length,
			linked: items.filter(s => s.action === "link" && s.processingState === "success").length,
			imported: items.filter(s => s.action === "import" && s.processingState === "success").length,
			errors: items.filter(s => s.processingState === "error").length,
		}
	})

	// ==================== Cart Methods ====================
	function getCartKey(sourceId: string, externalId: string): string {
		return `${sourceId}:${externalId}`
	}

	function isInCart(sourceId: string, externalId: string): boolean {
		return selectedSeries.value.has(getCartKey(sourceId, externalId))
	}

	function addToCart(serie: Omit<SelectedSerie, "action" | "processingState">) {
		const key = getCartKey(serie.sourceId, serie.externalId)
		if (!selectedSeries.value.has(key)) {
			selectedSeries.value.set(key, { ...serie })
		}
	}

	function removeFromCart(sourceId: string, externalId: string) {
		selectedSeries.value.delete(getCartKey(sourceId, externalId))
	}

	function toggleSelection(serie: Omit<SelectedSerie, "action" | "processingState">) {
		const key = getCartKey(serie.sourceId, serie.externalId)
		if (selectedSeries.value.has(key)) {
			selectedSeries.value.delete(key)
		}
		else {
			selectedSeries.value.set(key, { ...serie })
		}
	}

	function clearCart() {
		selectedSeries.value.clear()
	}

	// ==================== Navigation ====================
	function goToStep(newStep: WizardStep) {
		step.value = newStep
	}

	function goToEntry() {
		step.value = "entry"
		entryMode.value = null
	}

	function startBrowse() {
		entryMode.value = "browse"
		step.value = "source-select"
	}

	function startUrlPaste() {
		entryMode.value = "url"
		step.value = "url-paste"
	}

	function selectSource(source: Source) {
		selectedSource.value = source
		searchQuery.value = ""
		searchResults.value = []
		searchPage.value = 1
		hasMore.value = false
		step.value = "browse"
		// Auto-fetch popular/latest
		fetchSearchResults("", 1)
	}

	function goBackToSources() {
		selectedSource.value = null
		searchResults.value = []
		step.value = "source-select"
	}

	function goToReview() {
		step.value = "review"
		// Fetch similarities for all cart items
		fetchSimilaritiesForCart()
	}

	function goBackFromReview() {
		// Go back to browse or entry depending on mode
		if (entryMode.value === "browse" && selectedSource.value) {
			step.value = "browse"
		}
		else if (entryMode.value === "url") {
			step.value = "url-paste"
		}
		else {
			step.value = "entry"
		}
	}

	// ==================== Sources ====================
	async function fetchSources() {
		loadingSources.value = true
		try {
			const data = await $fetch<Source[]>("/api/v1/sources")
			sources.value = data
		}
		catch {
			sources.value = []
		}
		finally {
			loadingSources.value = false
		}
	}

	// ==================== Search ====================
	async function fetchSearchResults(query: string, page: number, append = false) {
		if (!selectedSource.value) return

		searching.value = true
		searchError.value = null

		try {
			const data = await fetchSourceSeriesWithRetry({
				sourceId: selectedSource.value.id,
				query,
				page,
			})

			searchResults.value = append ? [...searchResults.value, ...data.series] : data.series
			hasMore.value = data.hasNextPage
			searchPage.value = data.actualPage
		}
		catch (e: unknown) {
			const fetchError = e as { data?: { message?: string }, message?: string }
			searchError.value = fetchError.data?.message || fetchError.message || "Failed to search"
		}
		finally {
			searching.value = false
		}
	}

	async function search() {
		await fetchSearchResults(searchQuery.value, 1, false)
	}

	async function loadMore() {
		await fetchSearchResults(searchQuery.value, searchPage.value + 1, true)
	}

	// ==================== Detail ====================
	async function fetchDetail(externalId: string) {
		if (!selectedSource.value) return

		loadingDetail.value = true
		selectedSerieDetail.value = null

		try {
			const data = await $fetch(`/api/v1/sources/${selectedSource.value.id}/detail`, {
				query: { serieId: externalId },
			})
			selectedSerieDetail.value = data as SerieDetail
			showDetailSheet.value = true
		}
		catch {
			selectedSerieDetail.value = null
		}
		finally {
			loadingDetail.value = false
		}
	}

	function closeDetailSheet() {
		showDetailSheet.value = false
		selectedSerieDetail.value = null
	}

	// ==================== URL Parsing ====================
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

			parsedUrls.value = response.results.map((result) => {
				if (result.success && result.sourceId && result.sourceName && result.serieId) {
					return {
						url: result.url,
						status: result.imported ? "imported" : "valid",
						sourceId: result.sourceId,
						sourceName: result.sourceName,
						externalId: result.serieId,
						existingSerieId: result.existingSerieId ?? undefined,
						selected: !result.imported,
					} as ParsedUrlItem
				}
				else {
					return {
						url: result.url,
						status: "invalid",
						error: result.error || "Failed to parse URL",
						selected: false,
					} as ParsedUrlItem
				}
			})
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

			parsedUrls.value = response.results.map((result) => {
				if (result.success && result.sourceId && result.sourceName && result.serieId) {
					return {
						url: result.url,
						status: result.imported ? "imported" : "valid",
						sourceId: result.sourceId,
						sourceName: result.sourceName,
						externalId: result.serieId,
						existingSerieId: result.existingSerieId ?? undefined,
						selected: !result.imported,
					} as ParsedUrlItem
				}
				else {
					return {
						url: result.url,
						status: "invalid",
						error: result.error || "Failed to parse URL",
						selected: false,
					} as ParsedUrlItem
				}
			})

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

	async function addParsedUrlsToCart() {
		const validUrls = parsedUrls.value.filter(u => u.status === "valid" && u.selected)

		for (const item of validUrls) {
			if (!item.sourceId || !item.externalId || !item.sourceName) continue

			// Fetch detail to get full info
			try {
				const detail = await $fetch(`/api/v1/sources/${item.sourceId}/detail`, {
					query: { serieId: item.externalId },
				}) as SerieDetail

				addToCart({
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
	}

	// ==================== Similarity ====================
	async function fetchSimilaritiesForCart() {
		loadingSimilarities.value = true

		const promises = cartItems.value.map(async (serie) => {
			const key = getCartKey(serie.sourceId, serie.externalId)
			const item = selectedSeries.value.get(key)
			if (!item) return

			item.loadingSimilarity = true

			try {
				// Build titles array from main title
				const titles = [serie.title]

				const result = await $fetch<{ matches: SimilarMatch[] }>("/api/v1/serie/find-similar", {
					query: {
						titles: titles.join(","),
						excludeSourceId: serie.sourceId,
						limit: 5,
					},
				})

				item.similarMatches = result.matches
				// Auto-select "import" if no matches, otherwise leave for user to decide
				if (result.matches.length === 0) {
					item.action = "import"
				}
			}
			catch {
				item.similarMatches = []
				item.action = "import"
			}
			finally {
				item.loadingSimilarity = false
			}
		})

		await Promise.all(promises)
		loadingSimilarities.value = false
	}

	// ==================== Library Search ====================
	async function fetchRecentSeries() {
		loadingRecentSeries.value = true
		try {
			const result = await $fetch<{ series: RecentSerie[] }>("/api/v1/serie/recent", {
				query: { limit: 10 },
			})
			recentSeries.value = result.series
		}
		catch {
			recentSeries.value = []
		}
		finally {
			loadingRecentSeries.value = false
		}
	}

	async function searchLibrary(query: string) {
		if (!query.trim()) {
			librarySearchResults.value = []
			return
		}

		loadingLibrarySearch.value = true
		try {
			const result = await $fetch<{ data: Array<{ id: string, title: string, cover: string | null, _count: { chapters: number }, sources: Array<{ source: { name: string } }> }> }>("/api/v1/serie", {
				query: { q: query.trim() },
			})
			librarySearchResults.value = result.data.map(s => ({
				id: s.id,
				title: s.title,
				cover: s.cover,
				sources: [...new Set(s.sources.map(src => src.source.name))],
				chapterCount: s._count.chapters,
				importedAt: "",
			}))
		}
		catch {
			librarySearchResults.value = []
		}
		finally {
			loadingLibrarySearch.value = false
		}
	}

	function openLibrarySearch(serieKey: string) {
		librarySearchForSerieKey.value = serieKey
		librarySearchQuery.value = ""
		librarySearchResults.value = []
		showLibrarySearchSheet.value = true
		fetchRecentSeries()
	}

	function closeLibrarySearch() {
		showLibrarySearchSheet.value = false
		librarySearchForSerieKey.value = null
	}

	function selectLibrarySerie(serieId: string, serieTitle: string, serieCover: string | null) {
		if (!librarySearchForSerieKey.value) return

		const item = selectedSeries.value.get(librarySearchForSerieKey.value)
		if (item) {
			item.action = "link"
			item.linkToSerieId = serieId
			item.linkToSerieTitle = serieTitle
			item.linkToSerieCover = serieCover
		}
		closeLibrarySearch()
	}

	// ==================== Actions ====================
	function setAction(sourceId: string, externalId: string, action: "import" | "link", linkToSerieId?: string, linkToSerieTitle?: string, linkToSerieCover?: string | null) {
		const key = getCartKey(sourceId, externalId)
		const item = selectedSeries.value.get(key)
		if (item) {
			item.action = action
			item.linkToSerieId = linkToSerieId
			item.linkToSerieTitle = linkToSerieTitle
			item.linkToSerieCover = linkToSerieCover
		}
	}

	// ==================== Import/Link Processing ====================
	async function confirmImport() {
		if (!allDecisionsMade.value) return

		step.value = "processing"
		processingStarted.value = true

		// Process each item
		for (const serie of cartItems.value) {
			const key = getCartKey(serie.sourceId, serie.externalId)
			const item = selectedSeries.value.get(key)
			if (!item) continue

			item.processingState = "processing"
			item.processingMessage = item.action === "link" ? "Linking..." : "Importing..."

			try {
				if (item.action === "link" && item.linkToSerieId) {
					// Link to existing serie
					await $fetch(`/api/v1/serie/${item.linkToSerieId}/link-source`, {
						method: "POST",
						body: {
							sourceId: item.sourceId,
							externalId: item.externalId,
						},
					})
					item.processingState = "success"
					item.processingMessage = "Linked to existing series"
				}
				else {
					// Import as new
					const result = await $fetch<{ status: string, serieId?: string, jobId?: string }>(`/api/v1/sources/${item.sourceId}/import`, {
						method: "POST",
						body: { serieId: item.externalId },
					})
					item.jobId = result.jobId
					item.processingState = "success"
					item.processingMessage = result.status === "exists" ? "Already exists" : "Import queued"
				}
			}
			catch (e: unknown) {
				const fetchError = e as { data?: { message?: string }, message?: string }
				item.processingState = "error"
				item.processingMessage = fetchError.data?.message || fetchError.message || "Failed"
			}
		}
	}

	// ==================== Reset ====================
	function reset() {
		step.value = "entry"
		entryMode.value = null
		selectedSeries.value.clear()
		sources.value = []
		loadingSources.value = false
		selectedSource.value = null
		searchQuery.value = ""
		searchResults.value = []
		searching.value = false
		hasMore.value = false
		searchPage.value = 1
		searchError.value = null
		selectedSerieDetail.value = null
		loadingDetail.value = false
		showDetailSheet.value = false
		urlInput.value = ""
		parsedUrls.value = []
		parsingUrls.value = false
		parsingFile.value = false
		parseFileStats.value = null
		parseFileError.value = null
		loadingSimilarities.value = false
		processingStarted.value = false
		librarySearchQuery.value = ""
		librarySearchResults.value = []
		recentSeries.value = []
		loadingLibrarySearch.value = false
		loadingRecentSeries.value = false
		showLibrarySearchSheet.value = false
		librarySearchForSerieKey.value = null
	}

	return {
		// Step
		step,
		entryMode,

		// Cart
		selectedSeries,
		cartCount,
		cartItems,
		isInCart,
		addToCart,
		removeFromCart,
		toggleSelection,
		clearCart,

		// Sources
		sources,
		loadingSources,
		selectedSource,
		fetchSources,
		selectSource,

		// Search
		searchQuery,
		searchResults,
		searching,
		hasMore,
		searchPage,
		searchError,
		search,
		loadMore,

		// Detail
		selectedSerieDetail,
		loadingDetail,
		showDetailSheet,
		fetchDetail,
		closeDetailSheet,

		// URL Paste
		urlInput,
		parsedUrls,
		parsingUrls,
		parsingFile,
		parseFileStats,
		parseFileError,
		parseUrls,
		parseFile,
		addParsedUrlsToCart,

		// Similarity
		loadingSimilarities,
		fetchSimilaritiesForCart,

		// Library Search
		librarySearchQuery,
		librarySearchResults,
		recentSeries,
		loadingLibrarySearch,
		loadingRecentSeries,
		showLibrarySearchSheet,
		librarySearchForSerieKey,
		openLibrarySearch,
		closeLibrarySearch,
		selectLibrarySerie,
		searchLibrary,

		// Review
		allDecisionsMade,

		// Processing
		processingStarted,
		processingProgress,
		processingComplete,
		processingStats,

		// Actions
		setAction,
		confirmImport,

		// Navigation
		goToStep,
		goToEntry,
		startBrowse,
		startUrlPaste,
		goBackToSources,
		goToReview,
		goBackFromReview,

		// Reset
		reset,
	}
}
