interface Source {
	id: string
	name: string
	external_id: string
	icon: string | null
}

interface SearchResult {
	id: string
	title: string
	cover: string | null
	imported: boolean
	serieId: string | null
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

interface ParsedUrlResult {
	success: true
	sourceId: string
	sourceName: string
	serieId: string
	imported: boolean
	existingSerieId: string | null
}

interface ParsedUrlError {
	success: false
	error: string
}

type ParseUrlResponse = ParsedUrlResult | ParsedUrlError

export type { Source, SearchResult, SerieDetail, ParsedUrlResult, ParsedUrlError, ParseUrlResponse }

export function useSourceBrowser() {
	// Source selection
	const selectedSource = ref<Source | null>(null)

	// Search state
	const query = ref("")
	const searching = ref(false)
	const results = ref<SearchResult[]>([])
	const hasMore = ref(false)
	const page = ref(1)
	const searchError = ref<string | null>(null)

	// Detail state
	const selectedSerieId = ref<string | null>(null)
	const serieDetail = ref<SerieDetail | null>(null)
	const loadingDetail = ref(false)

	// URL parsing state
	const urlInput = ref("")
	const parsingUrl = ref(false)
	const urlError = ref<string | null>(null)

	function reset() {
		selectedSource.value = null
		query.value = ""
		searching.value = false
		results.value = []
		hasMore.value = false
		page.value = 1
		searchError.value = null
		selectedSerieId.value = null
		serieDetail.value = null
		loadingDetail.value = false
		urlInput.value = ""
		parsingUrl.value = false
		urlError.value = null
	}

	function resetSearch() {
		query.value = ""
		results.value = []
		hasMore.value = false
		page.value = 1
		selectedSerieId.value = null
		serieDetail.value = null
	}

	async function fetchSeries(searchQuery: string, searchPage = 1, append = false) {
		if (!selectedSource.value) return

		searching.value = true
		searchError.value = null

		try {
			const data = await $fetch(`/api/v1/sources/${selectedSource.value.id}/search`, {
				query: { q: searchQuery.trim() || undefined, page: searchPage },
			})
			results.value = append ? [...results.value, ...data.series] : data.series
			hasMore.value = data.hasNextPage
			page.value = searchPage
			if (!append) {
				selectedSerieId.value = null
				serieDetail.value = null
			}
		}
		catch (e: unknown) {
			const fetchError = e as { data?: { message?: string }, message?: string }
			searchError.value = fetchError.data?.message || fetchError.message || "Failed to fetch series"
		}
		finally {
			searching.value = false
		}
	}

	async function search() {
		results.value = []
		await fetchSeries(query.value, 1, false)
	}

	async function loadMore() {
		await fetchSeries(query.value, page.value + 1, true)
	}

	async function fetchDetail(externalId: string) {
		if (!selectedSource.value) return

		loadingDetail.value = true
		serieDetail.value = null

		try {
			const data = await $fetch(`/api/v1/sources/${selectedSource.value.id}/detail`, {
				query: { serieId: externalId },
			})
			serieDetail.value = data as SerieDetail
		}
		catch (e: unknown) {
			const fetchError = e as { data?: { message?: string }, message?: string }
			searchError.value = fetchError.data?.message || fetchError.message || "Failed to fetch series details"
		}
		finally {
			loadingDetail.value = false
		}
	}

	function selectSerie(externalId: string) {
		selectedSerieId.value = externalId
		fetchDetail(externalId)
	}

	async function parseUrl(url: string): Promise<ParseUrlResponse | null> {
		if (!url.trim()) return null

		parsingUrl.value = true
		urlError.value = null

		try {
			const result = await $fetch<ParseUrlResponse>("/api/v1/sources/parse-url", {
				method: "POST",
				body: { url: url.trim() },
			})
			return result
		}
		catch (e: unknown) {
			const fetchError = e as { data?: { message?: string }, message?: string }
			urlError.value = fetchError.data?.message || fetchError.message || "Failed to parse URL"
			return null
		}
		finally {
			parsingUrl.value = false
		}
	}

	// Auto-fetch when source is selected
	watch(selectedSource, (source) => {
		if (source) {
			fetchSeries("", 1, false)
		}
	})

	return {
		// Source
		selectedSource,

		// Search
		query,
		searching,
		results,
		hasMore,
		page,
		searchError,

		// Detail
		selectedSerieId,
		serieDetail,
		loadingDetail,

		// URL
		urlInput,
		parsingUrl,
		urlError,

		// Actions
		reset,
		resetSearch,
		search,
		loadMore,
		selectSerie,
		parseUrl,
	}
}
