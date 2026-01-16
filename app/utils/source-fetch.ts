interface FetchSourceSeriesOptions {
	sourceId: string
	query?: string
	page: number
	maxRetries?: number
}

interface FetchSourceSeriesResult {
	series: Array<{
		id: string
		title: string
		cover: string | null
		imported: boolean
		serieId: string | null
	}>
	hasNextPage: boolean
	actualPage: number
}

/**
 * Fetches series from a source with auto-retry logic for empty pages.
 * Some sources (like Suwayomi/Scan VF) return empty arrays with hasNextPage: true,
 * requiring multiple page fetches to get actual results.
 */
export async function fetchSourceSeriesWithRetry(
	options: FetchSourceSeriesOptions,
): Promise<FetchSourceSeriesResult> {
	const { sourceId, query, page, maxRetries = 10 } = options

	let currentPage = page
	let retries = 0
	let lastHasNextPage = false

	while (retries < maxRetries) {
		const data = await $fetch(`/api/v1/sources/${sourceId}/search`, {
			query: { q: query?.trim() || undefined, page: currentPage },
		})
		lastHasNextPage = data.hasNextPage

		// If we got results, return them
		if (data.series.length > 0) {
			return {
				series: data.series,
				hasNextPage: data.hasNextPage,
				actualPage: currentPage,
			}
		}

		// Empty results with no more pages - we're done
		if (!data.hasNextPage) {
			return {
				series: [],
				hasNextPage: false,
				actualPage: currentPage,
			}
		}

		// Empty but hasNextPage - auto-retry with next page
		currentPage++
		retries++
	}

	// Max retries reached - return empty but preserve hasNextPage for manual retry
	return {
		series: [],
		hasNextPage: lastHasNextPage,
		actualPage: currentPage,
	}
}
