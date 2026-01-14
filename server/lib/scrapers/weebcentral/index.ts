import { load } from "cheerio"
import { assignSeasonedChapterNumbers, calculateMissingChapters } from "~~/shared/utils/chapters"
import {
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

	constructor(env: SourceEnv) {
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
			updatedAt: new Date("2025-08-14T17:10:00+02:00"),
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
			headers: new Map([
				["User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:71.0) Gecko/20100101 Firefox/77.0"],
			]),
			canBlockScraping: true,
			minimumUpdateInterval: 300 * 60,
			timeout: 30,
			rateLimitMax: 1,
			rateLimitDuration: 10_000, // 1 request per 10 seconds (HTML scraping)
		}
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
		const data = await fetch(url, { method: "GET" })
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

		const data = await fetch(url, { method: "GET" })
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

	async fetchSerieChapters(serieId: SourceSerieId): Promise<SourceChapters> {
		const url = new URL(`series/${serieId}/full-chapter-list`, this.#information.url)

		const data = await fetch(url, { method: "GET" })
		const html = await data.text()
		const $ = load(html)

		// Collect chapter data first (without chapterNumber)
		const chapterData: Omit<SourceSerieChapter, "chapterNumber">[] = []

		$("div.flex.items-center").each((_, element) => {
			const $div = $(element)
			const link = $div.find("a[href*=\"/chapters/\"]")
			const href = link.attr("href")

			if (!href) return

			const chapterMatch = href.match(/\/chapters\/([^/]+)/)
			if (!chapterMatch) return

			const id = chapterMatch[1]
			if (!id) throw new Error(`Invalid chapter ID: ${id}`)

			// Get chapter title
			const titleSpan = link.find("span.grow span").first()
			const titleText = titleSpan.text().trim()

			// Get upload date
			const timeElement = $div.find("time")
			const dateString = timeElement.attr("datetime")
			const dateUpload = dateString ? new Date(dateString) : new Date()

			const externalUrl = new URL(href, this.#information.url)

			chapterData.push({
				id,
				title: { [SourceLanguage.En]: [titleText] },
				dateUpload,
				language: SourceLanguage.En,
				externalUrl,
				volumeName: undefined,
				volumeNumber: undefined,
				groups: [],
			})
		})

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
		url.searchParams.append("reading_style", "long_strip")

		const data = await fetch(url, { method: "GET" })
		const html = await data.text()
		const $ = load(html)

		const images: SourceSerieChapterImage[] = []

		$("img").each((_, element) => {
			const $img = $(element)
			const src = $img.attr("src")
			const alt = $img.attr("alt")

			if (!src) return

			// Extract page number from alt text (e.g., "Page 1" -> 1)
			let index = images.length + 1
			if (alt) {
				const pageMatch = alt.match(/Page (\d+)/)
				if (pageMatch) {
					index = parseInt(pageMatch[1] ?? "", 10)
				}
			}

			images.push({
				index,
				url: new URL(src),
				type: "image",
			})
		})

		return images
	}
}
