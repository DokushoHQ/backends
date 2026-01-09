import type {
	SuwayomiChapter,
	SuwayomiClient,
	SuwayomiManga,
	SuwayomiMangaPage,
	SuwayomiSourceInfo,
} from "../../suwayomi-client"
import type {
	FetchSearchSerieFilter,
	SourceProvider,
	SourceApiInformation,
	SourceChapters,
	SourceEnv,
	SourceId,
	SourceInformation,
	SourcePaginatedSmallSerie,
	SourceSerie,
	SourceSerieChapter,
	SourceSerieChapterData,
	SourceSerieChapterId,
	SourceSerieId,
} from "../../../utils/sources/core"
import { inferSerieType, mapSuwayomiGenre, mapSuwayomiLang, mapSuwayomiStatus } from "./types"

export class SuwayomiSource implements SourceProvider {
	#client: SuwayomiClient
	#suwayomiSourceId: string
	#information: SourceInformation
	#apiInformation: SourceApiInformation
	#discoveredBaseUrl: URL | null = null

	constructor(client: SuwayomiClient, suwayomiSourceId: string, suwayomiSource: SuwayomiSourceInfo, _env: SourceEnv) {
		this.#client = client
		this.#suwayomiSourceId = suwayomiSourceId

		const sourceLang = mapSuwayomiLang(suwayomiSource.lang)

		this.#information = {
			id: `suwayomi-${suwayomiSource.id}` as SourceId,
			name: `${suwayomiSource.name} (Suwayomi)`,
			url: new URL("https://unknown.local"), // Will be discovered from manga realUrl
			icon: new URL(`${client.baseUrl}${suwayomiSource.iconUrl}`),
			languages: [sourceLang],
			enabledLanguages: [sourceLang],
			updatedAt: new Date(),
			version: "1.0.0",
			nsfw: suwayomiSource.isNsfw,
			searchFilters: {
				query: true,
				order: [],
				sort: [],
				artists: false,
				authors: false,
				types: [],
				genres: {
					include: false,
					exclude: false,
					acceptedValues: [],
				},
				status: [],
			},
		}

		this.#apiInformation = {
			api_url: new URL(client.baseUrl),
			headers: new Map(),
			minimumUpdateInterval: 3600,
			timeout: 30,
			canBlockScraping: false,
			rateLimitMax: 10,
			rateLimitDuration: 60000,
		}
	}

	sourceInformation(): SourceInformation {
		// Return discovered base URL if available
		if (this.#discoveredBaseUrl) {
			return { ...this.#information, url: this.#discoveredBaseUrl }
		}
		return this.#information
	}

	sourceApiInformation(): SourceApiInformation {
		return this.#apiInformation
	}

	serieUrl(serieId: SourceSerieId): URL {
		const [_, urlPath] = this.#splitSerieId(serieId)
		const baseUrl = this.#discoveredBaseUrl || this.#information.url
		return new URL(urlPath, baseUrl)
	}

	parseUrl(url: string): { serieId: SourceSerieId } | null {
		try {
			const parsed = new URL(url)
			const baseUrl = this.#information.url
			if (parsed.host === baseUrl.host) {
				return {
					serieId: `${this.#suwayomiSourceId}:${parsed.pathname}` as SourceSerieId,
				}
			}
		}
		catch {
			// Invalid URL
		}
		return null
	}

	async fetchPopularSerie(page: number): Promise<SourcePaginatedSmallSerie> {
		const result = await this.#client.searchManga(this.#suwayomiSourceId, "", page, "POPULAR")
		return this.#mapMangaPage(result)
	}

	async fetchLatestUpdates(page: number): Promise<SourcePaginatedSmallSerie> {
		const result = await this.#client.searchManga(this.#suwayomiSourceId, "", page, "LATEST")
		return this.#mapMangaPage(result)
	}

	async fetchSearchSerie(page: number, filters: FetchSearchSerieFilter): Promise<SourcePaginatedSmallSerie> {
		const result = await this.#client.searchManga(this.#suwayomiSourceId, filters.query || "", page, "SEARCH")
		return this.#mapMangaPage(result)
	}

	async fetchSerieDetail(serieId: SourceSerieId): Promise<SourceSerie> {
		const mangaId = await this.#resolveMangaId(serieId)
		const manga = await this.#client.fetchManga(mangaId)
		return this.#mapMangaToSourceSerie(manga, serieId)
	}

	async fetchSerieChapters(serieId: SourceSerieId): Promise<SourceChapters> {
		const mangaId = await this.#resolveMangaId(serieId)
		const chapters = await this.#client.fetchChapters(mangaId)
		return {
			chapters: chapters.map(ch => this.#mapChapter(ch)),
			missingChapters: [],
		}
	}

	async fetchChapterData(_serieId: SourceSerieId, chapterId: SourceSerieChapterId): Promise<SourceSerieChapterData> {
		const numericChapterId = parseInt(chapterId)
		const pages = await this.#client.fetchChapterPages(numericChapterId)
		return pages.map((pageUrl, index) => ({
			type: "image" as const,
			index,
			url: new URL(`${this.#client.baseUrl}${pageUrl}`),
		}))
	}

	// Private helpers

	#splitSerieId(serieId: SourceSerieId): [string, string] {
		const colonIndex = serieId.indexOf(":")
		return [serieId.slice(0, colonIndex), serieId.slice(colonIndex + 1)]
	}

	async #resolveMangaId(serieId: SourceSerieId): Promise<number> {
		const [sourceId, urlPath] = this.#splitSerieId(serieId)

		// Query Suwayomi for manga by URL
		const manga = await this.#client.findMangaByUrl(sourceId, urlPath)
		if (manga) {
			// Validate the URL matches exactly
			if (manga.url === urlPath) {
				return manga.id
			}
			// URL mismatch - fall through to search
		}

		// Not in cache or URL mismatch - trigger search to populate it
		const searchTerm = this.#extractSearchTermFromPath(urlPath)
		const results = await this.#client.searchManga(sourceId, searchTerm, 1, "SEARCH")

		// Find matching manga by exact URL match
		const match = results.mangas.find(m => m.url === urlPath)
		if (match) return match.id

		throw new Error(`Could not resolve manga for ${serieId} - no exact URL match found`)
	}

	#extractSearchTermFromPath(urlPath: string): string {
		const parts = urlPath.split("/").filter(Boolean)
		const slug = parts[parts.length - 1] || parts[parts.length - 2] || ""
		return slug.replace(/-/g, " ").replace(/_/g, " ")
	}

	#mapMangaPage(result: SuwayomiMangaPage): SourcePaginatedSmallSerie {
		return {
			hasNextPage: result.hasNextPage,
			series: result.mangas.map(m => ({
				id: `${this.#suwayomiSourceId}:${m.url}` as SourceSerieId,
				title: { [this.#information.languages[0]!]: [m.title] },
				cover: new URL(`${this.#client.baseUrl}${m.thumbnailUrl}`),
			})),
		}
	}

	#mapMangaToSourceSerie(manga: SuwayomiManga, serieId: SourceSerieId): SourceSerie {
		const lang = this.#information.languages[0]!
		const genres = (manga.genre || []).map(mapSuwayomiGenre)

		// Discover base URL from realUrl if not already known
		if (!this.#discoveredBaseUrl && manga.realUrl) {
			try {
				const realUrlParsed = new URL(manga.realUrl)
				this.#discoveredBaseUrl = new URL(realUrlParsed.origin)
			}
			catch {
				// Invalid URL, ignore
			}
		}

		return {
			id: serieId,
			title: { [lang]: [manga.title] },
			alternatesTitles: {},
			cover: new URL(`${this.#client.baseUrl}${manga.thumbnailUrl}`),
			synopsis: manga.description ? { [lang]: [manga.description] } : {},
			status: [mapSuwayomiStatus(manga.status)],
			type: inferSerieType(manga.genre || []),
			genres,
			authors: manga.author ? [manga.author] : [],
			artists: manga.artist ? [manga.artist] : [],
			...(manga.realUrl && { externalUrl: new URL(manga.realUrl) }),
		}
	}

	#mapChapter(chapter: SuwayomiChapter): SourceSerieChapter {
		const lang = this.#information.languages[0]!
		// Use realUrl if available, otherwise construct from discovered/default base URL
		const baseUrl = this.#discoveredBaseUrl || this.#information.url
		const externalUrl = chapter.realUrl ? new URL(chapter.realUrl) : new URL(chapter.url, baseUrl)
		return {
			id: String(chapter.id) as SourceSerieChapterId,
			title: chapter.name ? { [lang]: [chapter.name] } : {},
			chapterNumber: chapter.chapterNumber,
			volumeNumber: null,
			volumeName: null,
			language: lang,
			dateUpload: new Date(parseInt(chapter.uploadDate)),
			externalUrl,
			groups: chapter.scanlator ? [{ id: chapter.scanlator, name: chapter.scanlator }] : [],
		}
	}
}
