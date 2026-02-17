import { load } from "cheerio"
import type { Impit } from "impit"
import { assignSeasonedChapterNumbers, calculateMissingChapters } from "~~/shared/utils/chapters"
import {
	ChapterNotFoundError,
	type FetchSearchSerieFilter,
	type SourceProvider,
	type SourceApiInformation,
	type SourceChapters,
	type SourceEnv,
	SourceFilterOrder,
	SourceFilterSort,
	type SourceInformation,
	SourceLanguage,
	type SourcePaginatedSmallSerie,
	type SourceSerie,
	type SourceSerieChapter,
	type SourceSerieChapterData,
	type SourceSerieChapterId,
	type SourceSerieChapterImage,
	type SourceSerieGenre,
	type SourceSerieId,
	type SourceSerieStatus,
	SourceSerieType,
} from "../../../utils/sources/core"
import {
	transformSourceGenre,
	transformSourceOrder,
	transformSourceSort,
	transformSourceStatus,
	transformSourceType,
	transformWeebcentralGenre,
	transformWeebcentralStatus,
	transformWeebcentralType,
	WEEBCENTRAL_GENRES,
	WEEBCENTRAL_ORDER,
	WEEBCENTRAL_SORT,
	WEEBCENTRAL_STATUS,
} from "./types"

export class WeebCentral implements SourceProvider {
	#information: SourceInformation

	#apiInformation: SourceApiInformation

	#impit: Impit

	constructor(env: SourceEnv, impit: Impit) {
		const enabledLanguages = env.ENABLED_LANGUAGE.filter(enabled_lang =>
			[SourceLanguage.En].some(lang => enabled_lang === lang),
		)

		this.#information = {
			id: "weebcentral",
			name: "WeebCentral",
			url: new URL("https://weebcentral.com"),
			icon: new URL("https://weebcentral.com/favicon.ico"),
			version: "1.0.0",
			nsfw: true,
			updatedAt: new Date("2026-01-14T16:10:00+02:00"),
			languages: [SourceLanguage.En],
			enabledLanguages,
			searchFilters: {
				artists: true,
				authors: true,
				genres: {
					include: true,
					exclude: true,
					acceptedValues: WEEBCENTRAL_GENRES,
				},
				sort: WEEBCENTRAL_SORT,
				order: WEEBCENTRAL_ORDER,
				query: true,
				status: WEEBCENTRAL_STATUS,
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
			api_url: new URL("https://weebcentral.com"),
			canBlockScraping: true,
			minimumUpdateInterval: 300 * 60,
			timeout: 30,
			rateLimitMax: 1,
			rateLimitDuration: 10_000, // 1 request per 10 seconds (HTML scraping)
		}

		this.#impit = impit
	}

	sourceApiInformation(): SourceApiInformation {
		return this.#apiInformation
	}

	sourceInformation(): SourceInformation {
		return this.#information
	}

	serieUrl(serie_id: SourceSerieId): URL {
		return new URL(`series/${serie_id}`, this.#information.url)
	}

	parseUrl(url: string): { serieId: SourceSerieId } | null {
		try {
			const parsed = new URL(url)
			if (!parsed.hostname.endsWith("weebcentral.com")) {
				return null
			}
			// Match /series/{slug} pattern
			const match = parsed.pathname.match(/^\/series\/([^/]+)(?:\/|$)/)
			if (match?.[1]) {
				return { serieId: match[1] }
			}
			return null
		}
		catch {
			return null
		}
	}

	async fetchSearchSerie(page: number, filters: FetchSearchSerieFilter): Promise<SourcePaginatedSmallSerie> {
		const limit = 32
		const offset = (page - 1) * limit

		const params = new URLSearchParams()
		params.append("limit", limit.toString())
		params.append("offset", offset.toString())
		params.append("official", "Any")
		params.append("display_mode", "Full Display")

		if (filters.query) {
			params.append("text", filters.query)
		}

		if (filters.sort) {
			const sort = transformSourceSort(filters.sort)
			if (!sort) throw new Error(`Invalid sort: ${filters.sort}`)
			params.append("sort", sort)
		}

		if (filters.order) {
			const order = transformSourceOrder(filters.order)
			if (!order) throw new Error(`Invalid order: ${filters.order}`)
			params.append("order", order)
		}

		if (filters.types) {
			for (const type of filters.types) {
				const wcType = transformSourceType(type)
				if (!wcType) throw new Error(`Invalid type: ${type}`)
				params.append("included_type", wcType)
			}
		}

		if (filters.status) {
			for (const sourceStatus of filters.status) {
				const wcStatus = transformSourceStatus(sourceStatus)
				if (!wcStatus) throw new Error(`Invalid status: ${sourceStatus}`)
				params.append("included_type", wcStatus)
			}
		}

		if (filters.genres?.includes || filters.genres?.excludes) {
			const includes = new Set([...(filters.genres.includes ?? [])])
			const excludes = new Set([...(filters.genres.excludes ?? [])])

			for (const include of includes) {
				const genre = transformSourceGenre(include)
				if (!genre) throw new Error(`Invalid genre: ${include}`)
				params.append("included_tag", genre)
			}

			for (const exclude of excludes) {
				const genre = transformSourceGenre(exclude)
				if (!genre) throw new Error(`Invalid genre: ${exclude}`)
				params.append("excluded_tag", genre)
			}
		}

		if (filters.artists) {
			for (const artist in filters.artists) {
				params.append("author", artist)
			}
		}

		if (filters.authors) {
			for (const author in filters.authors) {
				params.append("author", author)
			}
		}

		const url = new URL(`/search/data?${params}`, this.#apiInformation.api_url)
		const data = await this.#impit.fetch(url)

		if (!data.ok) {
			throw new Error(`WeebCentral HTTP error: ${data.status} ${data.statusText}`)
		}

		const html = await data.text()
		const $ = load(html)

		const series: { id: string, title: Partial<Record<SourceLanguage, string[]>>, cover: URL }[] = []

		$("article.bg-base-300").each((_, element) => {
			const $article = $(element)

			// Find the title link in the desktop section
			const titleLink = $article.find("section.hidden.lg\\:block a[href*=\"/series/\"]")

			if (titleLink.length === 0) return

			const href = titleLink.attr("href")
			if (!href) return

			const urlMatch = href.match(/\/series\/([^/]+)/)
			if (!urlMatch) return

			const id = urlMatch[1]
			if (!id) throw new Error(`Invalid ID: ${href}`)

			// Get title from the link text or parent span's data-tip
			const titleText
				= titleLink.text().trim() || titleLink.parent("span[data-tip]").attr("data-tip") || "Unknown"

			// Get cover image - try different sources
			let coverUrl: string | undefined
			const picture = $article.find("picture")
			const webpSource = picture.find("source[type=\"image/webp\"]").first()
			const imgElement = picture.find("img")

			if (webpSource.attr("srcset")) {
				coverUrl = webpSource.attr("srcset")
			}
			else if (imgElement.attr("src")) {
				coverUrl = imgElement.attr("src")
			}

			if (!coverUrl) throw new Error(`Invalid cover URL: ${id}`)

			series.push({
				id,
				title: { [SourceLanguage.En]: [titleText] },
				cover: new URL(coverUrl),
			})
		})

		const hasNextPage = html.includes("View More Results..")

		return {
			hasNextPage,
			series,
		}
	}

	async fetchPopularSerie(page: number): Promise<SourcePaginatedSmallSerie> {
		return this.fetchSearchSerie(page, {
			sort: SourceFilterSort.Popularity,
			order: SourceFilterOrder.DESC,
		})
	}

	async fetchLatestUpdates(page: number): Promise<SourcePaginatedSmallSerie> {
		return this.fetchSearchSerie(page, {
			sort: SourceFilterSort.Latest,
			order: SourceFilterOrder.DESC,
		})
	}

	async fetchSerieDetail(serieId: SourceSerieId): Promise<SourceSerie> {
		const url = this.serieUrl(serieId)

		const data = await this.#impit.fetch(url)

		if (!data.ok) {
			throw new Error(`WeebCentral HTTP error: ${data.status} ${data.statusText}`)
		}

		const html = await data.text()
		const $ = load(html)

		// Parse the detail page
		const $h1 = $("h1").first()
		const titleText = $h1.text().trim()
		const title: Partial<Record<SourceLanguage, string[]>> = titleText ? { [SourceLanguage.En]: [titleText] } : {}

		// Get cover image
		const coverImg = $("img[alt*=\"cover\"]")
		const coverSrc = coverImg.attr("src") || $("picture source[type=\"image/webp\"]").first().attr("srcset")
		const cover = coverSrc ? new URL(coverSrc) : new URL("https://via.placeholder.com/400x600")

		// Get synopsis
		const synopsisText = $("p.whitespace-pre-wrap").first().text().trim()
		const synopsis: Partial<Record<SourceLanguage, string[]>> = synopsisText
			? { [SourceLanguage.En]: [synopsisText] }
			: {}

		// Get alt titles
		const altNamesLi = $("li:contains(\"Associated Name(s)\")").first()
		const altNames: string[] = []
		if (altNamesLi.length > 0) {
			altNamesLi.find("ul.list-disc li").each((_, el) => {
				const text = $(el).text().trim()
				if (text) altNames.push(text)
			})
		}
		const alternatesTitles: Partial<Record<SourceLanguage, string[]>>
			= altNames.length > 0 ? { [SourceLanguage.En]: altNames } : {}

		// Get authors
		const authors: string[] = []
		$("li:contains(\"Author(s):\")")
			.find("a[href*=\"/search?author=\"]")
			.each((_, el) => {
				const authorName = $(el).text().trim().replace(/,$/, "")
				if (authorName) authors.push(authorName)
			})

		// Get artists (same as authors for now)
		const artists = [...authors]

		// Get genres
		const genres: SourceSerieGenre[] = []
		$("li:contains(\"Tags(s):\")")
			.find("a[href*=\"/search?included_tag=\"]")
			.each((_, el) => {
				const genre = transformWeebcentralGenre($(el).text().trim())
				if (genre) genres.push(genre)
			})

		// Get status
		const status: SourceSerieStatus[] = []
		$("li:contains(\"Status:\")")
			.find("a")
			.each((_, el) => {
				const statusText = transformWeebcentralStatus($(el).text().trim())
				if (statusText) status.push(statusText)
			})

		// Get type
		let type: SourceSerieType = SourceSerieType.Manga
		$("li:contains(\"Type:\")")
			.find("a")
			.each((_, el) => {
				const typeText = transformWeebcentralType($(el).text().trim())
				if (!typeText) throw new Error(`Invalid type text: ${$(el).text().trim()}`)
				type = typeText
			})

		return {
			id: serieId,
			title,
			cover,
			synopsis,
			alternatesTitles,
			artists,
			authors,
			genres,
			status,
			type,
		}
	}

	/**
	 * Fetch chapters from the chapter-select endpoint that are newer than the given chapter.
	 * The endpoint shows the current_chapter as a <button>, all others as <a> links.
	 * Chapters appearing before the button are NEWER than current_chapter.
	 */
	async fetchNewerChaptersFromSelector(
		serieId: SourceSerieId,
		latestKnownChapterId: string,
	): Promise<{ id: string, title: string }[]> {
		const url = new URL(`series/${serieId}/chapter-select`, this.#information.url)
		url.searchParams.append("current_chapter", latestKnownChapterId)

		const data = await this.#impit.fetch(url)
		if (!data.ok) return []

		const html = await data.text()
		const $ = load(html)

		const newerChapters: { id: string, title: string }[] = []

		// Iterate through elements in order - stop when we hit the button (current chapter)
		$("div.grid > a, div.grid > button").each((_, el) => {
			const $el = $(el)

			// Stop at the button (current chapter marker)
			if ($el.is("button")) return false

			const href = $el.attr("href")
			const title = $el.text().trim()
			if (!href) return

			const match = href.match(/\/chapters\/([^/]+)/)
			if (match?.[1]) {
				newerChapters.push({ id: match[1], title })
			}
		})

		return newerChapters
	}

	async fetchSerieChapters(serieId: SourceSerieId): Promise<SourceChapters> {
		const url = new URL(`series/${serieId}/full-chapter-list`, this.#information.url)

		const data = await this.#impit.fetch(url)

		if (!data.ok) {
			throw new Error(`WeebCentral HTTP error: ${data.status} ${data.statusText}`)
		}

		const html = await data.text()
		const $ = load(html)

		// Collect chapter data first (without chapterNumber)
		const chapterData: Omit<SourceSerieChapter, "chapterNumber">[] = []

		// Use Mihon's selector: div[x-data] > a (direct anchor children of div with x-data attribute)
		$("div[x-data] > a").each((_, element) => {
			const $link = $(element)
			const href = $link.attr("href")

			if (!href || !href.includes("/chapters/")) return

			const chapterMatch = href.match(/\/chapters\/([^/]+)/)
			if (!chapterMatch) return

			const id = chapterMatch[1]
			if (!id) throw new Error(`Invalid chapter ID: ${id}`)

			// Get chapter title from span.flex > span (Mihon's selector)
			const titleSpan = $link.find("span.flex > span").first()
			const titleText = titleSpan.text().trim()

			// Get upload date from time[datetime]
			const timeElement = $link.find("time[datetime]")
			const dateString = timeElement.attr("datetime")
			const dateUpload = dateString ? new Date(dateString) : new Date()

			// Detect scanlator from SVG stroke color (Mihon's approach)
			// #d8b4fe = Official, #4C4D54 = Unknown
			const groups: { id: string, name: string }[] = []
			const svgStroke = $link.find("svg").attr("stroke")
			if (svgStroke === "#d8b4fe") {
				groups.push({ id: "official", name: "Official" })
			}

			const externalUrl = new URL(href, this.#information.url)

			chapterData.push({
				id,
				title: { [SourceLanguage.En]: [titleText] },
				dateUpload,
				language: SourceLanguage.En,
				externalUrl,
				volumeName: undefined,
				volumeNumber: undefined,
				groups,
			})
		})

		// Check chapter-select for newer chapters not in cached full-chapter-list
		if (chapterData.length > 0) {
			const latestChapterId = chapterData[0]?.id // First chapter is newest in the list
			if (latestChapterId) {
				const newerChapters = await this.fetchNewerChaptersFromSelector(serieId, latestChapterId)

				if (newerChapters.length > 0) {
					console.log(`[WeebCentral] Cache bypass: found ${newerChapters.length} newer chapters via selector`)
					// Prepend newer chapters (they come before the latest known)
					for (const chapter of newerChapters.reverse()) { // reverse to maintain order
						chapterData.unshift({
							id: chapter.id,
							title: { [SourceLanguage.En]: [chapter.title] },
							dateUpload: new Date(),
							language: SourceLanguage.En,
							externalUrl: new URL(`/chapters/${chapter.id}`, this.#information.url),
							volumeName: undefined,
							volumeNumber: undefined,
							groups: [],
						})
					}
				}
			}
		}

		// Extract titles for batch processing
		const titles = chapterData.map(chapter => Object.values(chapter.title).flat()[0] ?? "")

		// Assign chapter numbers using season-aware batch processing
		// Handles cumulative numbering for seasons (S1, S2, etc.)
		const chapterNumbers = assignSeasonedChapterNumbers(titles, chapterData.length)

		const chapters: SourceSerieChapter[] = chapterData.map((chapter, index) => {
			const result = chapterNumbers[index]
			if (!result) throw new Error(`Missing chapter number result for index ${index}`)

			return {
				...chapter,
				chapterNumber: result.chapterNumber,
				volumeNumber: result.volumeNumber ?? chapter.volumeNumber,
				volumeName: result.volumeName ?? chapter.volumeName,
			}
		})

		return {
			chapters,
			missingChapters: calculateMissingChapters(chapters.map(c => c.chapterNumber)),
		}
	}

	async fetchChapterData(_serieId: SourceSerieId, chapterId: SourceSerieChapterId): Promise<SourceSerieChapterData> {
		const url = new URL(`chapters/${chapterId}/images`, this.#information.url)
		// Match Mihon's query parameters
		url.searchParams.append("is_prev", "False")
		url.searchParams.append("reading_style", "long_strip")

		const data = await this.#impit.fetch(url)

		if (!data.ok) {
			if (data.status === 404) {
				throw new ChapterNotFoundError(chapterId, `Chapter ${chapterId} not found on WeebCentral`)
			}
			throw new Error(`WeebCentral HTTP error: ${data.status} ${data.statusText}`)
		}

		const html = await data.text()
		const $ = load(html)

		const images: SourceSerieChapterImage[] = []

		// Target images inside the scroll section (x-data contains scroll functions)
		// Mihon uses ~= but that matches space-separated words; *= matches substring
		$("section[x-data*=scroll] > img").each((index, element) => {
			const $img = $(element)
			const src = $img.attr("src")

			if (!src) return

			images.push({
				index: index + 1,
				url: new URL(src),
				type: "image",
			})
		})

		return images
	}
}
