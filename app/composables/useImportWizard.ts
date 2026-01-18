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

export type WizardStep = "entry" | "url-paste" | "source-select" | "browse" | "tmb-upload" | "tmb-select" | "review" | "processing"
export type EntryMode = "browse" | "url" | "csv" | "tmb" | null

// ==================== Backup Import Types ====================

export interface BackupParsedManga {
	id: number | string
	title: string
	backupSourceId: string
	backupSourceName: string
	relativeUrl: string
	categories: string[]
	mapped: boolean
	sourceId?: string
	sourceName?: string
	serieId?: string
	alreadyImported: boolean
	existingSerieId?: string
	selected: boolean // For UI selection
}

export interface BackupCategory {
	id: number | string
	name: string
	count: number
}

export interface BackupProgress {
	stage: "downloading" | "extracting" | "parsing" | "mapping" | "checking" | "complete"
	percent: number
	current?: number
	total?: number
}

export interface BackupParseResult {
	backupType: string
	manga: BackupParsedManga[]
	categories: BackupCategory[]
	stats: {
		total: number
		mapped: number
		unmapped: number
		alreadyImported: number
	}
}

// Legacy aliases for backwards compatibility in components
export type TmbParsedManga = BackupParsedManga
export type TmbCategory = BackupCategory
export type TmbProgress = BackupProgress
export type TmbParseResult = BackupParseResult

export interface SimilarMatch {
	serieId: string
	title: string
	sources: Array<{ id: string, name: string }>
	similarity: number
	cover: string | null
}

export interface CartDuplicateMatch {
	cartKey: string
	title: string
	sourceName: string
	cover: string | null
	similarity: number
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

	// Library duplicate detection (populated in review step)
	similarMatches?: SimilarMatch[]
	loadingSimilarity?: boolean

	// Cart duplicate detection (populated in review step)
	cartDuplicates?: CartDuplicateMatch[]
	isPrimaryInGroup?: boolean

	// User decision
	action?: "import" | "link"
	linkToSerieId?: string
	linkToSerieTitle?: string
	linkToSerieCover?: string | null
	linkToCartKey?: string // For linking to another cart item

	// Processing state
	processingState?: "pending" | "queued" | "processing" | "done" | "error"
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

// ==================== Title Similarity Utils ====================

function normalizeTitle(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^\w\s]/g, "") // Remove special chars
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim()
}

function levenshteinDistance(a: string, b: string): number {
	if (a.length === 0) return b.length
	if (b.length === 0) return a.length

	const matrix: number[][] = []

	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i]
	}
	for (let j = 0; j <= a.length; j++) {
		matrix[0]![j] = j
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i]![j] = matrix[i - 1]![j - 1]!
			}
			else {
				matrix[i]![j] = Math.min(
					matrix[i - 1]![j - 1]! + 1, // substitution
					matrix[i]![j - 1]! + 1, // insertion
					matrix[i - 1]![j]! + 1, // deletion
				)
			}
		}
	}

	return matrix[b.length]![a.length]!
}

function calculateTitleSimilarity(a: string, b: string): number {
	const normA = normalizeTitle(a)
	const normB = normalizeTitle(b)

	if (normA === normB) return 1

	const maxLen = Math.max(normA.length, normB.length)
	if (maxLen === 0) return 1

	const distance = levenshteinDistance(normA, normB)
	return 1 - distance / maxLen
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

	// ==================== TMB Import State ====================
	const tmbJobId = ref<string | null>(null)
	const tmbProgress = ref<TmbProgress>({ stage: "extracting", percent: 0 })
	const tmbResults = ref<TmbParseResult | null>(null)
	const tmbError = ref<string | null>(null)
	const tmbSelectedCategory = ref<number | string | null>(null)
	const tmbUploading = ref(false)
	const tmbPolling = ref(false)
	const tmbAddingToCart = ref(false)

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
		// - "import" is always complete (if isPrimaryInGroup or no cart duplicates)
		// - "link" requires a linkToSerieId or linkToCartKey
		return cartItems.value.every((s) => {
			if (s.action === "import") return true
			if (s.action === "link" && (s.linkToSerieId || s.linkToCartKey)) return true
			return false
		})
	})

	const hasCartDuplicates = computed(() =>
		cartItems.value.some(s => s.cartDuplicates && s.cartDuplicates.length > 0),
	)

	const processingProgress = computed(() => {
		if (cartCount.value === 0) return 0
		const completed = cartItems.value.filter(s =>
			s.processingState === "done" || s.processingState === "error",
		).length
		return Math.round((completed / cartCount.value) * 100)
	})

	const processingComplete = computed(() => {
		return cartItems.value.every(s =>
			s.processingState === "done" || s.processingState === "error",
		)
	})

	const processingStats = computed(() => {
		const items = cartItems.value
		// Imported: Primary items (isPrimaryInGroup) or regular imports without cart duplicates
		const imported = items.filter(s =>
			s.processingState === "done"
			&& (s.isPrimaryInGroup || (s.action === "import" && !s.cartDuplicates?.length)),
		).length
		// Linked: Link to existing library series OR link to cart item (post-import link)
		const linked = items.filter(s =>
			s.processingState === "done"
			&& ((s.action === "link" && s.linkToSerieId) || s.linkToCartKey),
		).length
		return {
			total: items.length,
			linked,
			imported,
			errors: items.filter(s => s.processingState === "error").length,
		}
	})

	// ==================== TMB Computed ====================
	const tmbFilteredManga = computed(() => {
		if (!tmbResults.value) return []
		const manga = tmbResults.value.manga
		if (tmbSelectedCategory.value === null) return manga
		const category = tmbResults.value.categories.find(c => c.id === tmbSelectedCategory.value)
		if (!category) return manga
		return manga.filter(m => m.categories.includes(category.name))
	})

	const tmbImportableManga = computed(() => {
		return tmbFilteredManga.value.filter(m => m.mapped && !m.alreadyImported && m.selected)
	})

	const tmbSelectedCount = computed(() => {
		if (!tmbResults.value) return 0
		return tmbResults.value.manga.filter(m => m.selected).length
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

	function startTmbImport() {
		entryMode.value = "tmb"
		step.value = "tmb-upload"
		// Reset TMB state
		tmbJobId.value = null
		tmbProgress.value = { stage: "extracting", percent: 0 }
		tmbResults.value = null
		tmbError.value = null
		tmbSelectedCategory.value = null
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
		else if (entryMode.value === "tmb") {
			step.value = "tmb-select"
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

	// ==================== TMB Import Methods ====================
	async function uploadTmbFile(file: File) {
		tmbUploading.value = true
		tmbError.value = null

		try {
			const formData = new FormData()
			formData.append("file", file)

			const response = await $fetch<{ jobId: string }>("/api/v1/import-tmb/upload", {
				method: "POST",
				body: formData,
			})

			tmbJobId.value = response.jobId
			// Start polling for status
			await pollTmbStatus()
		}
		catch (e: unknown) {
			const fetchError = e as { data?: { message?: string }, message?: string }
			tmbError.value = fetchError.data?.message || fetchError.message || "Failed to upload file"
		}
		finally {
			tmbUploading.value = false
		}
	}

	async function pollTmbStatus() {
		if (!tmbJobId.value) return

		tmbPolling.value = true

		try {
			while (true) {
				const status = await $fetch<{
					id: string
					state: string
					progress: TmbProgress | null
					result: TmbParseResult | null
					failedReason: string | null
				}>(`/api/v1/import-tmb/${tmbJobId.value}/status`)

				if (status.progress) {
					tmbProgress.value = status.progress
				}

				if (status.state === "completed" && status.result) {
					// Add selected flag to manga and auto-select importable ones
					tmbResults.value = {
						...status.result,
						manga: status.result.manga.map(m => ({
							...m,
							selected: m.mapped && !m.alreadyImported,
						})),
					}
					step.value = "tmb-select"
					break
				}
				else if (status.state === "failed") {
					tmbError.value = status.failedReason || "Parsing failed"
					break
				}

				// Wait before next poll
				await new Promise(resolve => setTimeout(resolve, 1000))
			}
		}
		catch (e: unknown) {
			const fetchError = e as { data?: { message?: string }, message?: string }
			tmbError.value = fetchError.data?.message || fetchError.message || "Failed to get status"
		}
		finally {
			tmbPolling.value = false
		}
	}

	function toggleTmbMangaSelection(mangaId: number | string) {
		if (!tmbResults.value) return
		const manga = tmbResults.value.manga.find(m => m.id === mangaId)
		if (manga && manga.mapped && !manga.alreadyImported) {
			manga.selected = !manga.selected
		}
	}

	function selectAllTmbManga() {
		const filteredIds = new Set(tmbFilteredManga.value.map(m => m.id))
		if (!tmbResults.value) return
		for (const manga of tmbResults.value.manga) {
			if (filteredIds.has(manga.id) && manga.mapped && !manga.alreadyImported) {
				manga.selected = true
			}
		}
	}

	function deselectAllTmbManga() {
		const filteredIds = new Set(tmbFilteredManga.value.map(m => m.id))
		if (!tmbResults.value) return
		for (const manga of tmbResults.value.manga) {
			if (filteredIds.has(manga.id)) {
				manga.selected = false
			}
		}
	}

	async function addTmbToCart() {
		const selectedManga = tmbImportableManga.value

		if (selectedManga.length === 0) return

		tmbAddingToCart.value = true

		const missingSourceIds = new Set<string>()
		let addedCount = 0

		try {
			// Ensure sources are loaded (required for mapping external_id to database UUID)
			if (sources.value.length === 0) {
				await fetchSources()
			}

			for (const manga of selectedManga) {
				if (!manga.sourceId || !manga.serieId || !manga.sourceName) continue

				// Find the database source by external_id
				// manga.sourceId is the external_id (e.g., "mangadex"), we need the database UUID
				const dbSource = sources.value.find(s => s.external_id === manga.sourceId)

				if (!dbSource) {
					missingSourceIds.add(manga.sourceId)
					continue
				}

				// Fetch detail to get full info using database source ID
				try {
					const detail = await $fetch(`/api/v1/sources/${dbSource.id}/detail`, {
						query: { serieId: manga.serieId },
					}) as SerieDetail

					addToCart({
						sourceId: dbSource.id,
						sourceName: manga.sourceName,
						externalId: manga.serieId,
						title: detail.title,
						cover: detail.cover,
						type: detail.type,
						status: detail.status,
					})
					addedCount++
				}
				catch {
					// If can't fetch detail, use basic info from TMB
					addToCart({
						sourceId: dbSource.id,
						sourceName: manga.sourceName,
						externalId: manga.serieId,
						title: manga.title,
						cover: null,
						type: "Unknown",
						status: [],
					})
					addedCount++
				}
			}

			if (addedCount === 0 && selectedManga.length > 0) {
				if (missingSourceIds.size > 0) {
					console.warn(`[TMB Import] Missing sources: ${[...missingSourceIds].join(", ")}`)
					alert(`Could not add any items. Missing sources: ${[...missingSourceIds].join(", ")}\n\nMake sure these sources are enabled in the database.`)
				}
				return
			}

			goToReview()
		}
		finally {
			tmbAddingToCart.value = false
		}
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

		// After library similarity checks, detect cart-to-cart duplicates
		detectCartDuplicates()

		loadingSimilarities.value = false
	}

	// ==================== Cart Duplicate Detection ====================
	const SIMILARITY_THRESHOLD = 0.85

	function detectCartDuplicates() {
		const items = cartItems.value
		const itemKeys = items.map(s => getCartKey(s.sourceId, s.externalId))

		// Clear existing cart duplicates
		for (const item of items) {
			item.cartDuplicates = []
			item.isPrimaryInGroup = undefined
		}

		// Compare each item with all others
		for (let i = 0; i < items.length; i++) {
			const itemA = items[i]!
			const keyA = itemKeys[i]!

			for (let j = i + 1; j < items.length; j++) {
				const itemB = items[j]!
				const keyB = itemKeys[j]!

				// Skip if same source (can't be duplicate from same source)
				if (itemA.sourceId === itemB.sourceId) continue

				const similarity = calculateTitleSimilarity(itemA.title, itemB.title)

				if (similarity >= SIMILARITY_THRESHOLD) {
					// Add mutual references
					const selectedA = selectedSeries.value.get(keyA)
					const selectedB = selectedSeries.value.get(keyB)

					if (selectedA) {
						if (!selectedA.cartDuplicates) selectedA.cartDuplicates = []
						selectedA.cartDuplicates.push({
							cartKey: keyB,
							title: itemB.title,
							sourceName: itemB.sourceName,
							cover: itemB.cover,
							similarity,
						})
					}

					if (selectedB) {
						if (!selectedB.cartDuplicates) selectedB.cartDuplicates = []
						selectedB.cartDuplicates.push({
							cartKey: keyA,
							title: itemA.title,
							sourceName: itemA.sourceName,
							cover: itemA.cover,
							similarity,
						})
					}
				}
			}
		}

		// Auto-set first item in each duplicate group as primary
		const processed = new Set<string>()
		for (const item of items) {
			const key = getCartKey(item.sourceId, item.externalId)
			if (processed.has(key)) continue

			if (item.cartDuplicates && item.cartDuplicates.length > 0) {
				// This item is part of a duplicate group - make it primary
				const selectedItem = selectedSeries.value.get(key)
				if (selectedItem) {
					selectedItem.isPrimaryInGroup = true
					selectedItem.action = "import"
					processed.add(key)

					// Set all duplicates as non-primary and link to this one
					for (const dup of item.cartDuplicates) {
						const dupItem = selectedSeries.value.get(dup.cartKey)
						if (dupItem && !processed.has(dup.cartKey)) {
							dupItem.isPrimaryInGroup = false
							dupItem.action = "link"
							dupItem.linkToCartKey = key
							processed.add(dup.cartKey)
						}
					}
				}
			}
		}
	}

	function setGroupPrimary(newPrimaryCartKey: string) {
		const newPrimary = selectedSeries.value.get(newPrimaryCartKey)
		if (!newPrimary || !newPrimary.cartDuplicates) return

		// Collect all cart keys in this duplicate group
		const groupKeys = new Set<string>([newPrimaryCartKey])
		for (const dup of newPrimary.cartDuplicates) {
			groupKeys.add(dup.cartKey)
		}

		// Update all items in the group
		for (const cartKey of groupKeys) {
			const item = selectedSeries.value.get(cartKey)
			if (!item) continue

			if (cartKey === newPrimaryCartKey) {
				// This is the new primary
				item.isPrimaryInGroup = true
				item.action = "import"
				item.linkToCartKey = undefined
				item.linkToSerieId = undefined
			}
			else {
				// This links to the new primary
				item.isPrimaryInGroup = false
				item.action = "link"
				item.linkToCartKey = newPrimaryCartKey
				item.linkToSerieId = undefined
			}
		}
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

		// Categorize items by processing type
		const importItems = cartItems.value.filter(s =>
			s.isPrimaryInGroup || (s.action === "import" && !s.cartDuplicates?.length),
		)
		const linkExistingItems = cartItems.value.filter(s =>
			s.action === "link" && s.linkToSerieId,
		)
		const postImportLinkItems = cartItems.value.filter(s =>
			s.linkToCartKey && !s.linkToSerieId,
		)

		// Track: cartKey -> { jobId, serieId (when done) }
		const importJobs = new Map<string, { jobId: string, serieId?: string }>()
		const linkJobs = new Map<string, { jobId: string }>()

		// Step 1: Queue all import jobs
		for (const serie of importItems) {
			const key = getCartKey(serie.sourceId, serie.externalId)
			const item = selectedSeries.value.get(key)
			if (!item) continue

			item.processingState = "queued"
			item.processingMessage = "Queued for import..."

			try {
				const result = await $fetch<{ status: string, serieId?: string, jobId?: string }>(`/api/v1/sources/${item.sourceId}/import`, {
					method: "POST",
					body: { serieId: item.externalId },
				})

				if (result.status === "exists" && result.serieId) {
					// Already exists - mark as done immediately
					item.processingState = "done"
					item.processingMessage = "Already exists"
					importJobs.set(key, { jobId: "", serieId: result.serieId })
				}
				else if (result.jobId) {
					item.jobId = result.jobId
					importJobs.set(key, { jobId: result.jobId })
				}
			}
			catch (e: unknown) {
				const fetchError = e as { data?: { message?: string }, message?: string }
				item.processingState = "error"
				item.processingMessage = fetchError.data?.message || fetchError.message || "Failed to queue"
			}
		}

		// Step 2: Queue all link-to-existing jobs
		for (const serie of linkExistingItems) {
			const key = getCartKey(serie.sourceId, serie.externalId)
			const item = selectedSeries.value.get(key)
			if (!item || !item.linkToSerieId) continue

			item.processingState = "queued"
			item.processingMessage = "Queued for linking..."

			try {
				const result = await $fetch<{ status: string, jobId?: string }>(`/api/v1/serie/${item.linkToSerieId}/link-source`, {
					method: "POST",
					body: {
						sourceId: item.sourceId,
						externalId: item.externalId,
					},
				})

				if (result.status === "already_linked") {
					item.processingState = "done"
					item.processingMessage = "Already linked"
				}
				else if (result.jobId) {
					item.jobId = result.jobId
					linkJobs.set(key, { jobId: result.jobId })
				}
			}
			catch (e: unknown) {
				const fetchError = e as { data?: { message?: string }, message?: string }
				item.processingState = "error"
				item.processingMessage = fetchError.data?.message || fetchError.message || "Failed to queue"
			}
		}

		// Step 3: Poll jobs and trigger post-import links progressively
		await pollAllJobsProgressively(importItems, linkExistingItems, postImportLinkItems, importJobs, linkJobs)
	}

	async function pollAllJobsProgressively(
		importItems: SelectedSerie[],
		linkExistingItems: SelectedSerie[],
		postImportLinkItems: SelectedSerie[],
		importJobs: Map<string, { jobId: string, serieId?: string }>,
		linkJobs: Map<string, { jobId: string }>,
	) {
		// Combine all jobs that need polling
		const pendingJobs = new Map<string, { item: SelectedSerie, jobId: string, type: "import" | "link" }>()

		for (const item of importItems) {
			const key = getCartKey(item.sourceId, item.externalId)
			const job = importJobs.get(key)
			// Only add if job exists and not already completed (e.g., "already exists")
			if (job?.jobId && selectedSeries.value.get(key)?.processingState !== "done") {
				pendingJobs.set(key, { item, jobId: job.jobId, type: "import" })
			}
		}
		for (const item of linkExistingItems) {
			const key = getCartKey(item.sourceId, item.externalId)
			const job = linkJobs.get(key)
			if (job?.jobId && selectedSeries.value.get(key)?.processingState !== "done") {
				pendingJobs.set(key, { item, jobId: job.jobId, type: "link" })
			}
		}

		// Mark post-import links as pending
		for (const item of postImportLinkItems) {
			const selectedItem = selectedSeries.value.get(getCartKey(item.sourceId, item.externalId))
			if (selectedItem) {
				selectedItem.processingState = "pending"
				selectedItem.processingMessage = "Waiting for primary import..."
			}
		}

		while (pendingJobs.size > 0) {
			for (const [cartKey, { jobId, type }] of pendingJobs) {
				const selectedItem = selectedSeries.value.get(cartKey)
				if (!selectedItem) {
					pendingJobs.delete(cartKey)
					continue
				}

				try {
					const status = await $fetch<{
						id: string
						state: string
						progress: unknown
						returnvalue?: { serie_id?: string }
						failedReason?: string
					}>(`/api/jobs/serieInserter/${jobId}`)

					if (status.state === "active") {
						selectedItem.processingState = "processing"
						selectedItem.processingMessage = type === "import" ? "Importing..." : "Linking..."
					}
					else if (status.state === "completed") {
						selectedItem.processingState = "done"
						selectedItem.processingMessage = type === "import" ? "Import complete" : "Linked successfully"
						pendingJobs.delete(cartKey)

						// If this was an import, get the serieId and trigger dependent links
						if (type === "import") {
							const serieId = status.returnvalue?.serie_id
							if (serieId) {
								const jobInfo = importJobs.get(cartKey)
								if (jobInfo) jobInfo.serieId = serieId

								// Queue post-import links waiting for this import
								for (const linkItem of postImportLinkItems) {
									const linkSelectedItem = selectedSeries.value.get(getCartKey(linkItem.sourceId, linkItem.externalId))
									if (linkSelectedItem && linkSelectedItem.linkToCartKey === cartKey && linkSelectedItem.processingState === "pending") {
										linkSelectedItem.processingState = "queued"
										linkSelectedItem.processingMessage = "Queued for linking..."

										try {
											const result = await $fetch<{ status: string, jobId?: string }>(`/api/v1/serie/${serieId}/link-source`, {
												method: "POST",
												body: {
													sourceId: linkItem.sourceId,
													externalId: linkItem.externalId,
												},
											})

											if (result.jobId) {
												linkSelectedItem.jobId = result.jobId
												const linkKey = getCartKey(linkItem.sourceId, linkItem.externalId)
												pendingJobs.set(linkKey, { item: linkItem, jobId: result.jobId, type: "link" })
											}
										}
										catch (e: unknown) {
											const fetchError = e as { data?: { message?: string }, message?: string }
											linkSelectedItem.processingState = "error"
											linkSelectedItem.processingMessage = fetchError.data?.message || fetchError.message || "Failed to queue"
										}
									}
								}
							}
						}
					}
					else if (status.state === "failed") {
						selectedItem.processingState = "error"
						selectedItem.processingMessage = status.failedReason || "Job failed"
						pendingJobs.delete(cartKey)

						// Mark dependent links as failed
						if (type === "import") {
							for (const linkItem of postImportLinkItems) {
								const linkSelectedItem = selectedSeries.value.get(getCartKey(linkItem.sourceId, linkItem.externalId))
								if (linkSelectedItem && linkSelectedItem.linkToCartKey === cartKey) {
									linkSelectedItem.processingState = "error"
									linkSelectedItem.processingMessage = "Primary import failed"
								}
							}
						}
					}
				}
				catch {
					// Ignore polling errors, will retry on next iteration
				}
			}

			if (pendingJobs.size > 0) {
				await new Promise(r => setTimeout(r, 2000)) // Poll every 2 seconds
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
		// TMB state
		tmbJobId.value = null
		tmbProgress.value = { stage: "extracting", percent: 0 }
		tmbResults.value = null
		tmbError.value = null
		tmbSelectedCategory.value = null
		tmbUploading.value = false
		tmbPolling.value = false
		tmbAddingToCart.value = false
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

		// Cart Duplicates
		hasCartDuplicates,
		setGroupPrimary,

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
		startTmbImport,
		goBackToSources,
		goToReview,
		goBackFromReview,

		// TMB Import
		tmbJobId,
		tmbProgress,
		tmbResults,
		tmbError,
		tmbSelectedCategory,
		tmbUploading,
		tmbPolling,
		tmbAddingToCart,
		tmbFilteredManga,
		tmbImportableManga,
		tmbSelectedCount,
		uploadTmbFile,
		toggleTmbMangaSelection,
		selectAllTmbManga,
		deselectAllTmbManga,
		addTmbToCart,

		// Reset
		reset,
	}
}
