import type { SourceProvider } from "../sources/core"
import type {
	BackupParser,
	BackupParseResult,
	ParsedMangaEntry,
	ParsedCategory,
	SourceMappingResult,
} from "./types"

/**
 * Dokusho iOS app backup format
 *
 * Structure:
 * {
 *   scrapers: Array<{ id, name, ... }>
 *   collections: Array<{
 *     collection: { id, name, ... }
 *     mangas: Array<{
 *       manga: { id, title, scraperId, mangaId, ... }
 *       chapters: Array<{ ... }>
 *     }>
 *   }>
 * }
 */

interface DokushoScraper {
	id: string
	name: string
	position: number
	isActive: boolean
	isFavorite: boolean
}

interface DokushoCollection {
	id: string
	name: string
	position: number
	filter: string
	useList: boolean
	order: {
		direction: string
		field: string
	}
}

interface DokushoManga {
	id: string
	mangaId: string // External ID on the source
	scraperId: string
	title: string
	cover: string | null
	synopsis: string | null
	status: string
	type: string
	authors: string[]
	artists: string[]
	genres: string[]
	alternateTitles: string[]
	mangaCollectionId: string
}

interface DokushoChapter {
	id: string
	chapterId: string
	mangaId: string
	title: string
	position: number
	status: "read" | "unread"
	readAt?: number
	dateSourceUpload: number
}

interface DokushoBackupJson {
	scrapers: DokushoScraper[]
	collections: Array<{
		collection: DokushoCollection
		mangas: Array<{
			manga: DokushoManga
			chapters: DokushoChapter[]
		}>
	}>
}

/**
 * Known Dokusho scraper IDs mapped to Dokusho backend sources
 */
const DOKUSHO_SCRAPER_MAP: Record<string, string> = {
	// MangaDex
	"3599756D-8FA0-4CA2-AAFC-096C3D776AE1": "mangadex",
	// MangaSee / MangaLife - these don't have native sources currently
	// "FFAECF22-DBB3-4B13-B4AF-665DC31CE775": "mangasee",
	// "B6127CD7-A9C0-4610-8491-47DFCFD90DBC": "mangalife",
}

/**
 * Parser for Dokusho iOS app backup files (.json)
 */
export class DokushoBackupParser implements BackupParser {
	readonly type = "dokusho"
	readonly displayName = "Dokusho iOS Backup"
	readonly extensions = [".json"]

	async parse(buffer: Buffer): Promise<BackupParseResult> {
		const json = JSON.parse(buffer.toString("utf-8")) as DokushoBackupJson

		// Build scraper lookup
		const scraperMap = new Map<string, DokushoScraper>()
		for (const scraper of json.scrapers) {
			scraperMap.set(scraper.id, scraper)
		}

		// Build collection lookup
		const collectionMap = new Map<string, DokushoCollection>()
		for (const { collection } of json.collections) {
			collectionMap.set(collection.id, collection)
		}

		// Track unique manga (by id to dedupe across collections)
		const mangaMap = new Map<string, ParsedMangaEntry>()
		const mangaCategories = new Map<string, string[]>()

		for (const { collection, mangas } of json.collections) {
			for (const { manga } of mangas) {
				// Use manga.id as the unique key
				if (!mangaMap.has(manga.id)) {
					const scraper = scraperMap.get(manga.scraperId)

					mangaMap.set(manga.id, {
						id: manga.id,
						title: manga.title,
						backupSourceId: manga.scraperId,
						backupSourceName: scraper?.name ?? "Unknown",
						relativeUrl: manga.mangaId, // mangaId is the external ID on the source
						categories: [],
					})
					mangaCategories.set(manga.id, [])
				}

				// Add this collection as a category
				const categories = mangaCategories.get(manga.id)!
				if (!categories.includes(collection.name)) {
					categories.push(collection.name)
				}
			}
		}

		// Update manga entries with their categories
		const manga: ParsedMangaEntry[] = []
		for (const [id, entry] of mangaMap) {
			entry.categories = mangaCategories.get(id) ?? []
			manga.push(entry)
		}

		// Build categories from collections
		const categories: ParsedCategory[] = json.collections.map(({ collection }) => ({
			id: collection.id,
			name: collection.name,
		}))

		// Convert mangaCategories to use category IDs
		const mangaCategoryIds = new Map<string, string[]>()
		for (const [mangaId, categoryNames] of mangaCategories) {
			const categoryIds = categoryNames
				.map((name) => {
					const col = json.collections.find(c => c.collection.name === name)
					return col?.collection.id
				})
				.filter((id): id is string => id !== undefined)
			mangaCategoryIds.set(mangaId, categoryIds)
		}

		return {
			manga,
			categories,
			mangaCategories: mangaCategoryIds,
		}
	}

	mapSource(
		backupSourceId: string,
		availableSources: SourceProvider[],
	): SourceMappingResult | null {
		// Check native mapping first
		const nativeId = DOKUSHO_SCRAPER_MAP[backupSourceId]
		if (nativeId) {
			const source = availableSources.find(s => s.sourceInformation().id === nativeId)
			if (source) {
				return { sourceId: nativeId, type: "native" }
			}
		}

		return null
	}

	extractSerieId(
		source: SourceProvider,
		_backupSourceId: string,
		relativeUrl: string,
	): string | null {
		// For Dokusho backups, the relativeUrl (mangaId) is already the external ID
		// For MangaDex, mangaId is a UUID like "d8a959f7-648e-4c8d-8f23-f1f3f8e129f3"
		const sourceInfo = source.sourceInformation()

		if (sourceInfo.id === "mangadex") {
			// mangaId from Dokusho is already the MangaDex UUID
			return relativeUrl
		}

		// For other sources, try to parse as URL
		const baseUrl = sourceInfo.url.toString().replace(/\/$/, "")
		const fullUrl = `${baseUrl}/${relativeUrl}`

		try {
			const parsed = source.parseUrl(fullUrl)
			return parsed?.serieId ?? relativeUrl
		}
		catch {
			// If URL parsing fails, use the relativeUrl as-is
			return relativeUrl
		}
	}

	getSourceName(
		sourceId: string,
		availableSources: SourceProvider[],
	): string | null {
		const source = availableSources.find(s => s.sourceInformation().id === sourceId)
		return source?.sourceInformation().name ?? null
	}
}
