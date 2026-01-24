/**
 * Import Review Composable
 *
 * Manages state for the review step: similarity detection, library search, and actions.
 */

import type { SimilarMatch } from "./useImportCart"

// ==================== Types ====================

export interface RecentSerie {
	id: string
	title: string
	cover: string | null
	sources: string[]
	chapterCount: number
	importedAt: string
}

// ==================== Composable ====================

export function useImportReview() {
	const cart = useImportCart()

	// ==================== State ====================
	const loadingSimilarities = ref(false)

	// ==================== Library Search State ====================
	const librarySearchQuery = ref("")
	const librarySearchResults = ref<RecentSerie[]>([])
	const recentSeries = ref<RecentSerie[]>([])
	const loadingLibrarySearch = ref(false)
	const loadingRecentSeries = ref(false)
	const showLibrarySearchSheet = ref(false)
	const librarySearchForSerieKey = ref<string | null>(null)

	// ==================== Computed ====================

	const cartDuplicateItems = computed(() =>
		cart.cartItems.value.filter(s => s.cartDuplicates && s.cartDuplicates.length > 0),
	)

	const libraryDuplicateItems = computed(() =>
		cart.cartItems.value.filter(s =>
			(!s.cartDuplicates || s.cartDuplicates.length === 0)
			&& s.similarMatches && s.similarMatches.length > 0,
		),
	)

	const cleanItems = computed(() =>
		cart.cartItems.value.filter(s =>
			(!s.cartDuplicates || s.cartDuplicates.length === 0)
			&& (!s.similarMatches || s.similarMatches.length === 0),
		),
	)

	// ==================== Methods ====================

	async function fetchSimilaritiesForCart() {
		loadingSimilarities.value = true

		const promises = cart.cartItems.value.map(async (serie) => {
			const key = cart.getCartKey(serie.sourceId, serie.externalId)
			const item = cart.selectedSeries.value.get(key)
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
		cart.detectCartDuplicates()

		loadingSimilarities.value = false
	}

	function setAction(
		sourceId: string,
		externalId: string,
		action: "import" | "link",
		linkToSerieId?: string,
		linkToSerieTitle?: string,
		linkToSerieCover?: string | null,
	) {
		const key = cart.getCartKey(sourceId, externalId)
		const item = cart.selectedSeries.value.get(key)
		if (item) {
			item.action = action
			item.linkToSerieId = linkToSerieId
			item.linkToSerieTitle = linkToSerieTitle
			item.linkToSerieCover = linkToSerieCover
		}
	}

	// ==================== Library Search Methods ====================

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
			const result = await $fetch<{
				data: Array<{
					id: string
					title: string
					cover: string | null
					_count: { chapters: number }
					sources: string[]
				}>
			}>("/api/v1/serie", {
				query: { q: query.trim() },
			})
			librarySearchResults.value = result.data.map(s => ({
				id: s.id,
				title: s.title,
				cover: s.cover,
				sources: s.sources ?? [],
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

		const item = cart.selectedSeries.value.get(librarySearchForSerieKey.value)
		if (item) {
			item.action = "link"
			item.linkToSerieId = serieId
			item.linkToSerieTitle = serieTitle
			item.linkToSerieCover = serieCover
		}
		closeLibrarySearch()
	}

	function reset() {
		loadingSimilarities.value = false
		librarySearchQuery.value = ""
		librarySearchResults.value = []
		recentSeries.value = []
		loadingLibrarySearch.value = false
		loadingRecentSeries.value = false
		showLibrarySearchSheet.value = false
		librarySearchForSerieKey.value = null
	}

	return {
		// State
		loadingSimilarities,

		// Computed
		cartDuplicateItems,
		libraryDuplicateItems,
		cleanItems,

		// Similarity
		fetchSimilaritiesForCart,
		setAction,

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

		// Reset
		reset,
	}
}
