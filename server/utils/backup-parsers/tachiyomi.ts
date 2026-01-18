import { gunzipSync } from "node:zlib"
import protobuf from "protobufjs"
import type { SourceProvider } from "../sources/core"
import type {
	BackupParser,
	BackupParseResult,
	ParsedCategory,
	ParsedMangaEntry,
	SourceMappingResult,
} from "./types"

/**
 * Tachiyomi/Mihon backup protobuf structure
 */
interface TachiyomiBackup {
	backupManga: TachiyomiManga[]
	backupCategories: TachiyomiCategory[]
	backupSources: TachiyomiSource[]
}

interface TachiyomiManga {
	source: number | Long
	url: string
	title: string
	artist?: string
	author?: string
	description?: string
	genre: string[]
	status: number
	thumbnailUrl?: string
	dateAdded: number | Long
	chapters: TachiyomiChapter[]
	categories: (number | Long)[]
	tracking: TachiyomiTracking[]
	favorite: boolean
	history: TachiyomiHistory[]
}

interface TachiyomiChapter {
	url: string
	name: string
	scanlator?: string
	read: boolean
	bookmark: boolean
	lastPageRead: number | Long
	dateFetch: number | Long
	dateUpload: number | Long
	chapterNumber: number
	sourceOrder: number | Long
}

interface TachiyomiTracking {
	syncId: number
	libraryId: number | Long
	mediaId: number
	trackingUrl: string
	title: string
	lastChapterRead: number
	totalChapters: number
	score: number
	status: number
}

interface TachiyomiHistory {
	url: string
	lastRead: number | Long
}

interface TachiyomiCategory {
	name: string
	order: number | Long
	id: number | Long
	flags: number | Long
}

interface TachiyomiSource {
	name: string
	sourceId: number | Long
}

// Long type from protobufjs
interface Long {
	low: number
	high: number
	unsigned: boolean
	toNumber(): number
	toString(): string
}

function toSourceId(value: number | Long | undefined): string {
	if (value === undefined) return "0"
	if (typeof value === "number") return value.toString()
	// For source IDs, we need the string representation to preserve precision
	return value.toString()
}

/**
 * Known Tachiyomi source IDs mapped to Dokusho backend sources
 * These are the same as in TMB parser since Tachimanga uses Tachiyomi source IDs
 */
const TACHIYOMI_SOURCE_MAP: Record<string, string> = {
	// MangaDex (all language variants)
	"2499283573021220255": "mangadex",
	// WeebCentral
	"2131019126180322627": "weebcentral",
}

/**
 * Embedded protobuf schema for Tachiyomi/Mihon backups
 * Based on https://github.com/mihonapp/mihon/tree/main/app/src/main/java/eu/kanade/tachiyomi/data/backup/models
 */
const TACHIYOMI_PROTO_SCHEMA = `
syntax = "proto3";
package tachiyomi;

message Backup {
	repeated BackupManga backupManga = 1;
	repeated BackupCategory backupCategories = 2;
	repeated BackupSource backupSources = 101;
}

message BackupManga {
	int64 source = 1;
	string url = 2;
	string title = 3;
	string artist = 4;
	string author = 5;
	string description = 6;
	repeated string genre = 7;
	int32 status = 8;
	string thumbnailUrl = 9;
	int64 dateAdded = 13;
	int32 viewer = 14;
	repeated BackupChapter chapters = 16;
	repeated int64 categories = 17;
	repeated BackupTracking tracking = 18;
	bool favorite = 100;
	int32 chapterFlags = 101;
	int32 viewer_flags = 103;
	repeated BackupHistory history = 104;
}

message BackupChapter {
	string url = 1;
	string name = 2;
	string scanlator = 3;
	bool read = 4;
	bool bookmark = 5;
	int64 lastPageRead = 6;
	int64 dateFetch = 7;
	int64 dateUpload = 8;
	float chapterNumber = 9;
	int64 sourceOrder = 10;
}

message BackupTracking {
	int32 syncId = 1;
	int64 libraryId = 2;
	int32 mediaId = 3;
	string trackingUrl = 4;
	string title = 5;
	float lastChapterRead = 6;
	int32 totalChapters = 7;
	float score = 8;
	int32 status = 9;
	int64 startedReadingDate = 10;
	int64 finishedReadingDate = 11;
}

message BackupCategory {
	string name = 1;
	int64 order = 2;
	int64 id = 3;
	int64 flags = 100;
}

message BackupSource {
	string name = 1;
	int64 sourceId = 2;
}

message BackupHistory {
	string url = 1;
	int64 lastRead = 2;
}
`

/**
 * Parser for Tachiyomi/Mihon backup files (.tachibk, .proto.gz)
 */
export class TachiyomiBackupParser implements BackupParser {
	readonly type = "tachiyomi"
	readonly displayName = "Tachiyomi/Mihon Backup"
	readonly extensions = [".tachibk", ".proto.gz"]

	private protoRoot: protobuf.Root | null = null

	private getProtoRoot(): protobuf.Root {
		if (this.protoRoot) return this.protoRoot

		const parsed = protobuf.parse(TACHIYOMI_PROTO_SCHEMA)
		this.protoRoot = parsed.root
		return this.protoRoot
	}

	async parse(buffer: Buffer): Promise<BackupParseResult> {
		// Decompress gzip
		const decompressed = gunzipSync(buffer)

		// Load protobuf schema
		const root = this.getProtoRoot()
		const BackupType = root.lookupType("tachiyomi.Backup")

		// Decode the backup
		const backup = BackupType.decode(decompressed) as unknown as TachiyomiBackup

		// Build source lookup
		const sourceMap = new Map<string, TachiyomiSource>()
		for (const source of backup.backupSources || []) {
			const sourceId = toSourceId(source.sourceId)
			sourceMap.set(sourceId, source)
		}

		// Build category lookup by order (manga categories reference order, not id)
		const categoryByOrder = new Map<string, TachiyomiCategory>()
		for (const category of backup.backupCategories || []) {
			const order = toSourceId(category.order)
			categoryByOrder.set(order, category)
		}

		// Process manga
		const manga: ParsedMangaEntry[] = []
		const mangaCategories = new Map<string, string[]>()

		for (let i = 0; i < (backup.backupManga || []).length; i++) {
			const m = backup.backupManga[i]!
			const sourceId = toSourceId(m.source)
			const source = sourceMap.get(sourceId)

			// Use index as unique ID
			const mangaId = `manga-${i}`

			// Get category names for this manga (categories reference order field)
			const categoryNames: string[] = []
			const categoryOrders: string[] = []
			for (const catOrder of m.categories || []) {
				const orderStr = toSourceId(catOrder)
				const category = categoryByOrder.get(orderStr)
				if (category) {
					categoryNames.push(category.name)
					categoryOrders.push(orderStr)
				}
			}

			manga.push({
				id: mangaId,
				title: m.title || "Unknown",
				backupSourceId: sourceId,
				backupSourceName: source?.name ?? `Source ${sourceId}`,
				relativeUrl: m.url,
				categories: categoryNames,
			})

			mangaCategories.set(mangaId, categoryOrders)
		}

		// Build categories (use order as ID since that's what manga reference)
		const categories: ParsedCategory[] = (backup.backupCategories || []).map(c => ({
			id: toSourceId(c.order),
			name: c.name,
		}))

		return {
			manga,
			categories,
			mangaCategories,
		}
	}

	mapSource(
		backupSourceId: string,
		availableSources: SourceProvider[],
	): SourceMappingResult | null {
		// Check native mapping first
		const nativeId = TACHIYOMI_SOURCE_MAP[backupSourceId]
		if (nativeId) {
			const source = availableSources.find(s => s.sourceInformation().id === nativeId)
			if (source) {
				return { sourceId: nativeId, type: "native" }
			}
		}

		// Check for Suwayomi source (format: suwayomi-{tachiyomi_id})
		const suwayomiId = `suwayomi-${backupSourceId}`
		const suwayomiSource = availableSources.find(s => s.sourceInformation().id === suwayomiId)
		if (suwayomiSource) {
			return { sourceId: suwayomiId, type: "suwayomi" }
		}

		return null
	}

	extractSerieId(
		source: SourceProvider,
		_backupSourceId: string,
		relativeUrl: string,
	): string | null {
		const sourceInfo = source.sourceInformation()

		// For MangaDex, the URL is like /manga/{uuid}
		if (sourceInfo.id === "mangadex") {
			const match = relativeUrl.match(/\/manga\/([a-f0-9-]{36})/)
			if (match) {
				return match[1]!
			}
		}

		// For other sources, try to build full URL and parse
		const baseUrl = sourceInfo.url.toString().replace(/\/$/, "")
		const fullUrl = `${baseUrl}${relativeUrl}`

		try {
			const parsed = source.parseUrl(fullUrl)
			return parsed?.serieId ?? null
		}
		catch {
			// If URL parsing fails, try to extract from relative URL
			// Common patterns: /manga/{id}, /series/{id}, /title/{id}
			const patterns = [
				/\/manga\/([^/]+)/,
				/\/series\/([^/]+)/,
				/\/title\/([^/]+)/,
				/\/comic\/([^/]+)/,
			]
			for (const pattern of patterns) {
				const match = relativeUrl.match(pattern)
				if (match) {
					return match[1]!
				}
			}
			return null
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
