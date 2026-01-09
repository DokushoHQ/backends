import { load } from "cheerio"
import { ByparrClient } from "../../../utils/sources/byparr"
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
	type SourceSerieGenre,
	type SourceSerieId,
	SourceSerieStatus,
	SourceSerieType,
} from "../../../utils/sources/core"
import {
	JAPSCAN_GENRES,
	JAPSCAN_ORDER,
	JAPSCAN_SORT,
	JAPSCAN_STATUS,
	type JapscanSearchResult,
	transformJapscanGenre,
	transformJapscanStatus,
	transformSourceSort,
} from "./types"

const BASE_URL = "https://www.japscan.vip"

export class Japscan implements SourceProvider {
	#information: SourceInformation
	#apiInformation: SourceApiInformation
	#byparr: ByparrClient

	constructor(env: SourceEnv) {
		const enabledLanguages = env.ENABLED_LANGUAGE.filter(enabled_lang =>
			[SourceLanguage.Fr].some(lang => enabled_lang === lang),
		)

		this.#information = {
			id: "japscan",
			name: "Japscan",
			url: new URL(BASE_URL),
			// Japscan doesn't have a working favicon.ico, use a placeholder
			icon: new URL("https://www.google.com/s2/favicons?domain=japscan.vip&sz=64"),
			version: "1.0.0",
			nsfw: false,
			updatedAt: new Date("2025-01-01T00:00:00+00:00"),
			languages: [SourceLanguage.Fr],
			enabledLanguages,
			searchFilters: {
				artists: false,
				authors: false,
				genres: {
					include: false,
					exclude: false,
					acceptedValues: JAPSCAN_GENRES,
				},
				sort: JAPSCAN_SORT,
				order: JAPSCAN_ORDER,
				query: true,
				status: JAPSCAN_STATUS,
				types: [],
			},
		}

		this.#apiInformation = {
			api_url: new URL(BASE_URL),
			headers: new Map([
				["User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:71.0) Gecko/20100101 Firefox/77.0"],
				["Referer", `${BASE_URL}/`],
			]),
			canBlockScraping: true,
			minimumUpdateInterval: 300 * 60,
			timeout: 60,
			rateLimitMax: 1,
			rateLimitDuration: 5000, // 1 request per 5 seconds (Byparr is slow)
		}

		this.#byparr = new ByparrClient(env.BYPARR_URL ?? "http://localhost:8191")
	}

	sourceApiInformation(): SourceApiInformation {
		return this.#apiInformation
	}

	sourceInformation(): SourceInformation {
		return this.#information
	}

	serieUrl(serieId: SourceSerieId): URL {
		// serieId is the full path like "manga/one-piece" or "manhwa/solo-leveling"
		// Japscan requires trailing slash
		return new URL(`/${serieId}/`, this.#information.url)
	}

	parseUrl(url: string): { serieId: SourceSerieId } | null {
		try {
			const parsed = new URL(url)
			if (!parsed.hostname.endsWith("japscan.vip")) {
				return null
			}
			// Match /manga/{slug}, /manhwa/{slug}, or /manhua/{slug} patterns
			const match = parsed.pathname.match(/^\/(manga|manhwa|manhua)\/([^/]+)(?:\/|$)/)
			if (match?.[1] && match?.[2]) {
				// Return full path as ID: "manga/one-piece" or "manhwa/solo-leveling"
				return { serieId: `${match[1]}/${match[2]}` }
			}
			return null
		}
		catch {
			return null
		}
	}

	async fetchSearchSerie(page: number, filters: FetchSearchSerieFilter): Promise<SourcePaginatedSmallSerie> {
		// If there's a search query, use the POST endpoint
		if (filters.query) {
			const { solution } = await this.#byparr.post(
				`${BASE_URL}/ls/`,
				`search=${encodeURIComponent(filters.query)}`,
				{ maxTimeout: 30000 },
			)

			const results = JSON.parse(solution.response) as JapscanSearchResult[]

			return {
				hasNextPage: false,
				series: results.map((r) => {
					// Image can be relative path like "/imgs/mangas/one-piece.jpg" or absolute
					const imageUrl = r.image.startsWith("http") ? r.image : `${BASE_URL}${r.image}`
					// Keep full path as ID: "manga/one-piece" or "manhwa/solo-leveling"
					const id = r.url.replace(/^\//, "").replace(/\/$/, "")
					return {
						id,
						title: { [SourceLanguage.Fr]: [r.name] },
						cover: new URL(imageUrl),
					}
				}),
			}
		}

		// Otherwise use the paginated manga list
		const sort = filters.sort ? (transformSourceSort(filters.sort) ?? "popular") : "popular"
		const url = `${BASE_URL}/mangas/?sort=${sort}&p=${page}`

		const { solution } = await this.#byparr.get(url, { maxTimeout: 30000 })
		const $ = load(solution.response)

		const series: { id: string, title: Partial<Record<SourceLanguage, string[]>>, cover: URL }[] = []

		$(".mangas-list .manga-block").each((_, element) => {
			const $el = $(element)
			const link = $el.find("a").first()
			const href = link.attr("href")

			if (!href || href === "") return

			// Keep full path as ID: "manga/one-piece" or "manhwa/solo-leveling"
			const id = href.replace(/^\//, "").replace(/\/$/, "")
			const title = link.text().trim()
			// Try data-src first (lazy loading), then src
			const coverSrc = link.find("img").attr("data-src") ?? link.find("img").attr("src")

			if (!id || !coverSrc) return

			// Handle relative or absolute URLs
			const coverUrl = coverSrc.startsWith("http") ? coverSrc : `${BASE_URL}${coverSrc}`

			series.push({
				id,
				title: { [SourceLanguage.Fr]: [title] },
				cover: new URL(coverUrl),
			})
		})

		const hasNextPage = $(".pagination > li:last-child:not(.disabled)").length > 0

		return { series, hasNextPage }
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
		const { solution } = await this.#byparr.get(url.toString(), { maxTimeout: 30000 })
		const $ = load(solution.response)

		// Detect error pages (Cloudflare block, rate limit, 404, etc.)
		const pageTitle = $("title").text().trim()
		const h1Text = $("h1").first().text().trim()
		if (!pageTitle || h1Text === "Oops!" || solution.response.includes("lost.gif")) {
			throw new Error(`Japscan returned error page for ${serieId}. Title: "${pageTitle}", H1: "${h1Text}"`)
		}

		const info = $("#main .card-body")
		const titleText = $("h1").first().text().trim()
		const title: Partial<Record<SourceLanguage, string[]>> = titleText ? { [SourceLanguage.Fr]: [titleText] } : {}

		// Get cover image - try data-src first (lazy loading), then src
		const coverSrc = info.find("img").attr("data-src") ?? info.find("img").attr("src")
		let cover: URL
		if (coverSrc) {
			const coverUrl = coverSrc.startsWith("http") ? coverSrc : `${BASE_URL}${coverSrc}`
			cover = new URL(coverUrl)
		}
		else {
			cover = new URL("https://via.placeholder.com/300x400?text=No+Cover")
		}

		// Parse metadata from p elements
		let author = ""
		let artist = ""
		let statusText = ""
		let originalName = ""
		let synopsisText = ""
		const alternateNames: string[] = []
		const genres: SourceSerieGenre[] = []

		info.find("p").each((_, el) => {
			const $p = $(el)
			const text = $p.text().trim()

			// Extract label (text before colon) and value (text after colon)
			const colonIndex = text.indexOf(":")
			if (colonIndex === -1) return

			const label = text.substring(0, colonIndex).trim()
			const value = text.substring(colonIndex + 1).trim()

			if (label.includes("Auteur")) {
				author = value
			}
			else if (label.includes("Artiste")) {
				artist = value
			}
			else if (label.includes("Statut")) {
				statusText = value
			}
			else if (label.includes("Genre")) {
				// Split genres by comma and transform each
				value.split(",").forEach((g) => {
					const genre = transformJapscanGenre(g.trim())
					if (genre) genres.push(genre)
				})
			}
			else if (label.includes("Nom Original")) {
				originalName = value
			}
			else if (label.includes("Alternatif")) {
				// Split alternate names by comma
				value.split(",").forEach((name) => {
					const trimmed = name.trim()
					if (trimmed) alternateNames.push(trimmed)
				})
			}
			else if (label.includes("Synopsis")) {
				synopsisText = value
			}
		})

		// Build alternate titles including original name
		const alternatesTitles: Partial<Record<SourceLanguage, string[]>> = {}
		const allAlternates = [...alternateNames]
		if (originalName) allAlternates.unshift(originalName)
		if (allAlternates.length > 0) {
			alternatesTitles[SourceLanguage.Fr] = allAlternates
		}

		const synopsis: Partial<Record<SourceLanguage, string[]>> = synopsisText
			? { [SourceLanguage.Fr]: [synopsisText] }
			: {}

		// Parse status
		const status: SourceSerieStatus[] = []
		const parsedStatus = transformJapscanStatus(statusText)
		if (parsedStatus) {
			status.push(parsedStatus)
		}
		else {
			status.push(SourceSerieStatus.Unknown)
		}

		return {
			id: serieId,
			title,
			alternatesTitles,
			cover,
			synopsis,
			status,
			type: SourceSerieType.Manga,
			genres,
			authors: author ? [author] : [],
			artists: artist ? [artist] : [],
		}
	}

	async fetchSerieChapters(serieId: SourceSerieId): Promise<SourceChapters> {
		const url = this.serieUrl(serieId)
		const { solution } = await this.#byparr.get(url.toString(), { maxTimeout: 30000 })
		const $ = load(solution.response)

		// Detect error pages (Cloudflare block, rate limit, 404, etc.)
		const title = $("title").text().trim()
		const h1 = $("h1").first().text().trim()
		if (!title || h1 === "Oops!" || solution.response.includes("lost.gif")) {
			throw new Error(`Japscan returned error page for ${serieId}. Title: "${title}", H1: "${h1}"`)
		}

		const chapters: SourceSerieChapter[] = []

		// Filter out SPOILER and RAW chapters
		$("#list_chapters .list_chapters").each((_, el) => {
			const $el = $(el)

			// Skip spoiler/RAW/VUS chapters
			if ($el.find(".badge:contains(SPOILER), .badge:contains(RAW), .badge:contains(VUS)").length > 0) {
				return
			}

			// Like Mihon: search ALL attributes for chapter URLs, prefer non-href, then shorter URLs
			type UrlMatch = { name: string, url: string, isNonHref: boolean }
			const urlMatches: UrlMatch[] = []

			$el.find("a").each((_, a) => {
				const $a = $(a)
				const attribs = (a as unknown as { attribs: Record<string, string> }).attribs || {}

				for (const [attrName, attrValue] of Object.entries(attribs)) {
					if (
						typeof attrValue === "string"
						&& (attrValue.startsWith("/manga/")
							|| attrValue.startsWith("/manhua/")
							|| attrValue.startsWith("/manhwa/"))
					) {
						urlMatches.push({
							name: $a.text().trim() || $a.attr("title") || "",
							url: attrValue,
							isNonHref: attrName !== "href",
						})
					}
				}
			})

			// Sort: prefer non-href first, then shorter URLs (like Mihon)
			urlMatches.sort((a, b) => {
				if (a.isNonHref !== b.isNonHref) return a.isNonHref ? -1 : 1
				return a.url.length - b.url.length
			})

			// Deduplicate by URL
			const uniqueUrls = [...new Map(urlMatches.map(m => [m.url, m])).values()]
			const match = uniqueUrls[0]
			if (!match) return

			// Extract chapter ID from URL
			const segments = match.url.split("/").filter(Boolean)
			const chapterId = segments[segments.length - 1]
			if (!chapterId) return

			const title = match.name || `Chapitre ${chapterId}`

			// Parse chapter number from title or ID
			const numMatch = title.match(/(\d+(?:\.\d+)?)/) || chapterId.match(/^(\d+(?:\.\d+)?)$/)
			const chapterNumber = numMatch?.[1] ? parseFloat(numMatch[1]) : 0

			// Parse date
			const dateText = $el.find("span").first().text().trim()
			let dateUpload = new Date()
			try {
				// Japscan uses format like "14 Dec 2024"
				const parsed = new Date(dateText)
				if (!Number.isNaN(parsed.getTime())) {
					dateUpload = parsed
				}
			}
			catch {
				// Keep default date
			}

			chapters.push({
				id: chapterId,
				title: { [SourceLanguage.Fr]: [title] },
				chapterNumber,
				volumeNumber: null,
				volumeName: null,
				language: SourceLanguage.Fr,
				dateUpload,
				externalUrl: new URL(match.url, BASE_URL),
				groups: [],
			})
		})

		// Deduplicate by ID (like Mihon's distinctBy), keep first occurrence
		const uniqueChapters = [...new Map(chapters.map(c => [c.id, c])).values()]

		return {
			chapters: uniqueChapters,
			missingChapters: calculateMissingChapters(uniqueChapters.map(c => c.chapterNumber)),
		}
	}

	async fetchChapterData(serieId: SourceSerieId, chapterId: SourceSerieChapterId): Promise<SourceSerieChapterData> {
		// serieId already includes type prefix (e.g., "manga/one-piece" or "manhwa/solo-leveling")
		// Japscan requires trailing slash
		const chapterUrl = `${BASE_URL}/${serieId}/${chapterId}/`

		// Init script runs BEFORE page scripts - sets up trap to capture imagesLink
		// Same technique Mihon uses - intercepts when obfuscated JS sets imagesLink
		const initScript = `
			window.__capturedImagesLink = null;
			Object.defineProperty(Object.prototype, 'imagesLink', {
				set: function(value) {
					window.__capturedImagesLink = value;
					Object.defineProperty(this, '_imagesLink', {
						value: value,
						writable: true,
						enumerable: false,
						configurable: true
					});
				},
				get: function() {
					return this._imagesLink;
				},
				enumerable: false,
				configurable: true
			});
		`

		// Post-load script retrieves the captured value
		const retrieveScript = `window.__capturedImagesLink`

		const { solution } = await this.#byparr.get(chapterUrl, {
			maxTimeout: 60000,
			initJs: initScript,
			js: retrieveScript,
		})

		const imageUrls = solution.jsResult as string[] | null

		if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
			throw new Error("Could not extract chapter images. imagesLink not captured.")
		}

		// Filter to japscan CDN and add ?y=1 parameter (like Mihon does)
		const baseUrlHost = new URL(BASE_URL).hostname.replace("www.", "")

		const images: SourceSerieChapterData = imageUrls
			.filter((url) => {
				try {
					return new URL(url).hostname.endsWith(baseUrlHost)
				}
				catch {
					return false
				}
			})
			.map((url, index) => ({
				type: "image" as const,
				index: index + 1,
				url: new URL(`${url}?y=1`),
			}))

		if (images.length === 0) {
			throw new Error("No valid chapter images found from japscan CDN.")
		}

		return images
	}
}
