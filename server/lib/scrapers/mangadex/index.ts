import { setTimeout } from "node:timers/promises"

import {
	type FetchSearchSerieFilter,
	type SourceProvider,
	type SourceApiInformation,
	type SourceChapters,
	type SourceEnv,
	SourceFilterOrder,
	SourceFilterSort,
	type SourceInformation,
	type SourcePaginatedSmallSerie,
	type SourceSerie,
	type SourceSerieChapter,
	type SourceSerieChapterData,
	type SourceSerieChapterId,
	type SourceSerieId,
	SourceSerieType,
	type SourceSmallSerie,
} from "../../../utils/sources/core"
import { transformSourceGenre } from "../weebcentral/types"
import {
	mangaDexAtHomeResponse,
	mangaDexSingleMangaResponse,
	mangadexLatestChaptersResponse,
	mangadexMultipleChapterResponse,
	mangadexMultipleMangaResponse,
} from "./parser"
import {
	MANGADEX_GENRES,
	MANGADEX_LANGUAGE,
	MANGADEX_ORDER,
	MANGADEX_SORT,
	MANGADEX_STATUS,
	transformSourceLang,
	transformSourceOrder,
	transformSourceSort,
	transformSourceStatus,
} from "./types"

export class Mangadex implements SourceProvider {
	#information: SourceInformation

	#apiInformation: SourceApiInformation

	constructor(env: SourceEnv) {
		const enabledLanguages = env.ENABLED_LANGUAGE.filter(enabled_lang =>
			MANGADEX_LANGUAGE.some(lang => enabled_lang === lang),
		)

		this.#information = {
			id: "mangadex",
			name: "Mangadex",
			url: new URL("https://mangadex.org"),
			icon: new URL("https://mangadex.org/favicon.ico"),
			version: "1.0.0",
			nsfw: true,
			updatedAt: new Date("2025-08-14T17:10:00+02:00"),
			languages: MANGADEX_LANGUAGE,
			enabledLanguages,
			searchFilters: {
				artists: false,
				authors: false,
				genres: {
					include: true,
					exclude: true,
					acceptedValues: MANGADEX_GENRES,
				},
				sort: MANGADEX_SORT,
				order: MANGADEX_ORDER,
				query: true,
				status: MANGADEX_STATUS,
				types: [
					SourceSerieType.Doujinshi,
					SourceSerieType.Manga,
					SourceSerieType.Manhwa,
					SourceSerieType.Manhua,
					SourceSerieType.Comic,
				],
			},
		}

		this.#apiInformation = {
			api_url: new URL("https://api.mangadex.org"),
			headers: new Map([
				["User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:71.0) Gecko/20100101 Firefox/77.0"],
			]),
			canBlockScraping: true,
			minimumUpdateInterval: 300 * 60,
			timeout: 30,
			rateLimitMax: 5,
			rateLimitDuration: 60_000, // 5 requests per minute
		}
	}

	sourceApiInformation(): SourceApiInformation {
		return this.#apiInformation
	}

	sourceInformation(): SourceInformation {
		return this.#information
	}

	serieUrl(serie_id: SourceSerieId): URL {
		return new URL(`title/${serie_id}`, this.#information.url)
	}

	parseUrl(url: string): { serieId: SourceSerieId } | null {
		try {
			const parsed = new URL(url)
			if (!parsed.hostname.endsWith("mangadex.org")) {
				return null
			}
			// Match /title/{uuid} pattern - UUID is 36 chars with hyphens
			const match = parsed.pathname.match(/^\/title\/([a-f0-9-]{36})(?:\/|$)/i)
			if (match?.[1]) {
				return { serieId: match[1] }
			}
			return null
		}
		catch {
			return null
		}
	}

	async fetchSearchSerie(page: number, filter: FetchSearchSerieFilter): Promise<SourcePaginatedSmallSerie> {
		const limit = 20
		const offset = (page - 1) * limit

		const params = new URLSearchParams()
		params.append("limit", limit.toString())
		params.append("offset", offset.toString())
		params.append("includedTagsMode", "AND")
		params.append("excludedTagsMode", "OR")
		params.append("contentRating[]", "safe")
		params.append("contentRating[]", "suggestive")
		params.append("contentRating[]", "erotica")
		params.append("includes[]", "cover_art")

		if (filter.onlyEnableTranslation) {
			for (const enabledLang of this.#information.enabledLanguages) {
				const lang = transformSourceLang(enabledLang)
				if (!lang) throw new Error(`Invalid language: ${enabledLang}`)
				params.append("availableTranslatedLanguage[]", lang)
			}
		}

		if (filter.query) {
			params.append("title", filter.query)
		}

		if (filter.order && filter.sort) {
			const mangadex_sort = transformSourceSort(filter.sort)
			if (!mangadex_sort) throw new Error(`Invalid order: ${filter.sort}`)
			const mangadex_order = transformSourceOrder(filter.order)
			if (!mangadex_order) throw new Error(`Invalid order: ${filter.order}`)
			const key = `order[${mangadex_sort}]`

			params.append(key, mangadex_order)
		}

		if (filter.genres?.includes || filter.genres?.excludes) {
			const includes = new Set([...(filter.genres.includes ?? [])])
			const excludes = new Set([...(filter.genres.excludes ?? [])])

			for (const include of includes) {
				const genre = transformSourceGenre(include)
				if (!genre) throw new Error(`Invalid genre: ${include}`)
				params.append("includedTags[]", genre)
			}

			for (const exclude of excludes) {
				const genre = transformSourceGenre(exclude)
				if (!genre) throw new Error(`Invalid genre: ${exclude}`)
				params.append("excludedTags[]", genre)
			}
		}

		if (filter.status) {
			for (const status of filter.status) {
				const mangadex_status = transformSourceStatus(status)
				if (!mangadex_status) throw new Error(`Invalid status: ${status}`)
				params.append("status[]", mangadex_status)
			}
		}

		const url = new URL(`manga?${params}`, this.#apiInformation.api_url)

		const data = await fetch(url, { method: "GET" })

		const json = await data.json()
		const response = await mangadexMultipleMangaResponse.parseAsync(json)
		if (response.result !== "ok") throw new Error(`Invalid response: ${response.result}`)

		return {
			hasNextPage: response.offset + response.limit < response.total,
			series: response.data.map<SourceSmallSerie>(({ title, id, cover }) => ({ id, title, cover })),
		}
	}

	async fetchPopularSerie(page: number): Promise<SourcePaginatedSmallSerie> {
		return this.fetchSearchSerie(page, {
			sort: SourceFilterSort.Popularity,
			order: SourceFilterOrder.DESC,
		})
	}

	async fetchLatestUpdates(page: number): Promise<SourcePaginatedSmallSerie> {
		const limit = 100 // Mihon uses 100 chapters per page
		const offset = (page - 1) * limit

		// Step 1: Get latest chapters in enabled languages
		const chapterParams = new URLSearchParams()
		chapterParams.append("limit", limit.toString())
		chapterParams.append("offset", offset.toString())
		chapterParams.append("order[publishAt]", "desc")
		chapterParams.append("includeFutureUpdates", "0")
		chapterParams.append("includeFuturePublishAt", "0")
		chapterParams.append("includeEmptyPages", "0")
		chapterParams.append("contentRating[]", "safe")
		chapterParams.append("contentRating[]", "suggestive")
		chapterParams.append("contentRating[]", "erotica")

		for (const lang of this.#information.enabledLanguages) {
			const dexLang = transformSourceLang(lang)
			if (dexLang) chapterParams.append("translatedLanguage[]", dexLang)
		}

		const chapterUrl = new URL(`chapter?${chapterParams}`, this.#apiInformation.api_url)
		const chapterData = await fetch(chapterUrl, { method: "GET" })
		const chapterJson = await chapterData.json()
		const chapterResponse = await mangadexLatestChaptersResponse.parseAsync(chapterJson)

		if (chapterResponse.result !== "ok") {
			throw new Error(`MangaDex API error: ${chapterResponse.result}`)
		}

		// Extract unique manga IDs, preserving order of first appearance
		const mangaIds: string[] = []
		const seen = new Set<string>()
		for (const mangaId of chapterResponse.data) {
			if (mangaId && !seen.has(mangaId)) {
				seen.add(mangaId)
				mangaIds.push(mangaId)
			}
		}

		if (mangaIds.length === 0) {
			return { hasNextPage: false, series: [] }
		}

		// Step 2: Fetch manga details for those IDs
		const mangaParams = new URLSearchParams()
		mangaParams.append("includes[]", "cover_art")
		mangaParams.append("limit", mangaIds.length.toString())
		mangaParams.append("contentRating[]", "safe")
		mangaParams.append("contentRating[]", "suggestive")
		mangaParams.append("contentRating[]", "erotica")
		for (const id of mangaIds) {
			mangaParams.append("ids[]", id)
		}

		const mangaUrl = new URL(`manga?${mangaParams}`, this.#apiInformation.api_url)
		const mangaData = await fetch(mangaUrl, { method: "GET" })
		const mangaJson = await mangaData.json()
		const mangaResponse = await mangadexMultipleMangaResponse.parseAsync(mangaJson)

		if (mangaResponse.result !== "ok") {
			throw new Error(`MangaDex API error: ${mangaResponse.result}`)
		}

		// Create a map for quick lookup
		const mangaMap = new Map(mangaResponse.data.map(m => [m.id, m]))

		// Return manga in the same order as they appeared in chapter results
		const series = mangaIds
			.map(id => mangaMap.get(id))
			.filter((m): m is NonNullable<typeof m> => m !== undefined)
			.map<SourceSmallSerie>(({ id, title, cover }) => ({ id, title, cover }))

		return {
			hasNextPage: chapterResponse.offset + chapterResponse.limit < chapterResponse.total,
			series,
		}
	}

	async fetchSerieDetail(serie_id: SourceSerieId): Promise<SourceSerie> {
		const params = new URLSearchParams()
		params.append("includes[]", "author")
		params.append("includes[]", "artist")
		params.append("includes[]", "cover_art")

		const url = new URL(`manga/${serie_id}?${params}`, this.#apiInformation.api_url)

		const data = await fetch(url, { method: "GET" })
		const json = await data.json()
		const response = await mangaDexSingleMangaResponse.parseAsync(json)

		if (response.result !== "ok") throw new Error(`MangaDex API error: ${response.result}`)

		return response.data
	}

	async fetchSerieChapters(serieId: SourceSerieId): Promise<SourceChapters> {
		const all_chapters: SourceSerieChapter[] = []
		let offset = 0
		const limit = 500

		const params = new URLSearchParams()
		params.append("order[volume]", "desc")
		params.append("order[chapter]", "desc")
		params.append("limit", limit.toString())

		this.#information.enabledLanguages
			.map(transformSourceLang)
			.filter(lang => lang !== null && lang !== undefined)
			.forEach((lang) => {
				params.append("translatedLanguage[]", lang)
			})

		params.append("includes[]", "scanlation_group")

		while (true) {
			params.set("offset", offset.toString())
			const url = new URL(`manga/${serieId}/feed?${params}`, this.#apiInformation.api_url)

			const data = await fetch(url, { method: "GET" })
			const json = await data.json()
			const response = await mangadexMultipleChapterResponse.parseAsync(json)

			if (response.result !== "ok") {
				throw new Error(`MangaDex API error: ${response.result}`)
			}

			all_chapters.push(...response.data)

			if (offset + limit >= response.total) {
				break
			}

			offset += limit

			await setTimeout(500)
		}

		return {
			chapters: all_chapters,
			missingChapters: calculateMissingChapters(all_chapters.map(c => c.chapterNumber)),
		}
	}

	async fetchChapterData(_serieId: SourceSerieId, chapterId: SourceSerieChapterId): Promise<SourceSerieChapterData> {
		const params = new URLSearchParams()
		params.append("forcePort443", "false")

		const url = new URL(`at-home/server/${chapterId}?${params}`, this.#apiInformation.api_url)

		const data = await fetch(url, { method: "GET" })
		const json = await data.json()

		const response = await mangaDexAtHomeResponse.parseAsync(json)
		if (response.result !== "ok" || response.data === undefined) {
			throw new Error(`MangaDex API error: ${response.result}`)
		}

		return response.data
	}
}
