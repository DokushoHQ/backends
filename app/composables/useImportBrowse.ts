/**
 * Import Browse Composable
 *
 * Manages state for the browse flow: source selection, search, and detail fetching.
 */

import { fetchSourceSeriesWithRetry } from "~/utils/source-fetch"

// ==================== Types ====================

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

// ==================== Composable ====================

export function useImportBrowse() {
	// ==================== Source State ====================
	const sources = useState<Source[]>("import-sources", () => [])
	const loadingSources = useState("import-loading-sources", () => false)

	// ==================== Search State ====================
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

	const nativeSources = computed(() =>
		sources.value.filter(s => !s.external_id.startsWith("suwayomi-")),
	)

	const suwayomiSources = computed(() =>
		sources.value.filter(s => s.external_id.startsWith("suwayomi-")),
	)

	function getSourceById(sourceId: string): Source | undefined {
		return sources.value.find(s => s.id === sourceId)
	}

	function getSourceByExternalId(externalId: string): Source | undefined {
		return sources.value.find(s => s.external_id === externalId)
	}

	// ==================== Search ====================

	async function fetchSearchResults(sourceId: string, query: string, page: number, append = false) {
		searching.value = true
		searchError.value = null

		try {
			const data = await fetchSourceSeriesWithRetry({
				sourceId,
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

	async function search(sourceId: string) {
		await fetchSearchResults(sourceId, searchQuery.value, 1, false)
	}

	async function loadMore(sourceId: string) {
		await fetchSearchResults(sourceId, searchQuery.value, searchPage.value + 1, true)
	}

	function resetSearch() {
		searchQuery.value = ""
		searchResults.value = []
		searchPage.value = 1
		hasMore.value = false
		searchError.value = null
	}

	// ==================== Detail ====================

	async function fetchDetail(sourceId: string, externalId: string) {
		loadingDetail.value = true
		selectedSerieDetail.value = null

		try {
			const data = await $fetch(`/api/v1/sources/${sourceId}/detail`, {
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

	return {
		// Sources
		sources,
		loadingSources,
		nativeSources,
		suwayomiSources,
		fetchSources,
		getSourceById,
		getSourceByExternalId,

		// Search
		searchQuery,
		searchResults,
		searching,
		hasMore,
		searchPage,
		searchError,
		search,
		loadMore,
		resetSearch,
		fetchSearchResults,

		// Detail
		selectedSerieDetail,
		loadingDetail,
		showDetailSheet,
		fetchDetail,
		closeDetailSheet,
	}
}
