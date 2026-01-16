import {
	CHAPTER_BY_URL_QUERY,
	FETCH_CHAPTER_PAGES_MUTATION,
	FETCH_CHAPTERS_MUTATION,
	FETCH_MANGA_MUTATION,
	FETCH_SOURCE_MANGA_MUTATION,
	MANGA_BY_URL_QUERY,
	SOURCES_QUERY,
} from "./queries"
import type {
	ChapterByUrlResponse,
	FetchChapterPagesResponse,
	FetchChaptersResponse,
	FetchMangaResponse,
	FetchSourceMangaResponse,
	FetchSourceMangaType,
	MangaByUrlResponse,
	SourcesQueryResponse,
	SuwayomiChapter,
	SuwayomiManga,
	SuwayomiMangaPage,
	SuwayomiSourceInfo,
} from "./types"

export class SuwayomiClient {
	readonly baseUrl: string

	constructor(baseUrl: string) {
		// Remove trailing slash if present
		this.baseUrl = baseUrl.replace(/\/$/, "")
	}

	private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
		const response = await fetch(`${this.baseUrl}/api/graphql`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ query, variables }),
		})

		if (!response.ok) {
			throw new Error(`Suwayomi GraphQL request failed: ${response.status} ${response.statusText}`)
		}

		const json = (await response.json()) as {
			data?: T
			errors?: Array<{ message: string }>
		}

		if (json.errors && json.errors.length > 0) {
			throw new Error(`Suwayomi GraphQL error: ${json.errors.map(e => e.message).join(", ")}`)
		}

		if (!json.data) {
			throw new Error("Suwayomi GraphQL response missing data")
		}

		return json.data
	}

	/**
	 * Get all available sources from Suwayomi
	 */
	async getSources(): Promise<SuwayomiSourceInfo[]> {
		const data = await this.graphql<SourcesQueryResponse>(SOURCES_QUERY)
		return data.sources.nodes
	}

	/**
	 * Search manga from a specific source
	 */
	async searchManga(
		sourceId: string,
		query: string,
		page: number,
		type: FetchSourceMangaType = "SEARCH",
	): Promise<SuwayomiMangaPage> {
		const data = await this.graphql<FetchSourceMangaResponse>(FETCH_SOURCE_MANGA_MUTATION, {
			input: {
				source: sourceId,
				type,
				query,
				page,
			},
		})
		return data.fetchSourceManga
	}

	/**
	 * Fetch manga details by internal Suwayomi ID
	 */
	async fetchManga(mangaId: number): Promise<SuwayomiManga> {
		const data = await this.graphql<FetchMangaResponse>(FETCH_MANGA_MUTATION, {
			id: mangaId,
		})
		return data.fetchManga.manga
	}

	/**
	 * Fetch chapters for a manga
	 */
	async fetchChapters(mangaId: number): Promise<SuwayomiChapter[]> {
		const data = await this.graphql<FetchChaptersResponse>(FETCH_CHAPTERS_MUTATION, { mangaId })
		return data.fetchChapters.chapters
	}

	/**
	 * Fetch page URLs for a chapter
	 */
	async fetchChapterPages(chapterId: number): Promise<string[]> {
		const data = await this.graphql<FetchChapterPagesResponse>(FETCH_CHAPTER_PAGES_MUTATION, { chapterId })
		return data.fetchChapterPages.pages
	}

	/**
	 * Find a manga by its source URL
	 * Returns null if not found in Suwayomi's cache
	 */
	async findMangaByUrl(sourceId: string, url: string): Promise<{ id: number, title: string, url: string } | null> {
		const data = await this.graphql<MangaByUrlResponse>(MANGA_BY_URL_QUERY, {
			sourceId,
			url,
		})

		const manga = data.mangas.nodes[0]
		return manga ?? null
	}

	/**
	 * Find a chapter by its URL within a manga
	 * Returns the chapter's cache ID if found, null otherwise
	 */
	async findChapterByUrl(mangaId: number, url: string): Promise<{ id: number } | null> {
		const data = await this.graphql<ChapterByUrlResponse>(CHAPTER_BY_URL_QUERY, {
			mangaId,
			url,
		})

		const chapter = data.chapters.nodes[0]
		return chapter ?? null
	}
}
