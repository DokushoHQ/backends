import type { SourceProvider } from "../sources/core"
import {
	parseTmbBuffer,
	getCategoryNamesForManga,
	mapTachiyomiToSource,
	getSourceName,
	extractSerieIdFromSource,
} from "../tmb"
import type {
	BackupParser,
	BackupParseResult,
	ParsedMangaEntry,
	ParsedCategory,
	SourceMappingResult,
} from "./types"

/**
 * Parser for Tachimanga backup files (.tmb)
 */
export class TmbBackupParser implements BackupParser {
	readonly type = "tmb"
	readonly displayName = "Tachimanga Backup"
	readonly extensions = [".tmb"]

	async parse(buffer: Buffer): Promise<BackupParseResult> {
		const result = await parseTmbBuffer(buffer)

		const manga: ParsedMangaEntry[] = result.manga.map(m => ({
			id: m.id,
			title: m.title,
			backupSourceId: m.sourceId,
			backupSourceName: result.sources.get(m.sourceId)?.name ?? "Unknown",
			relativeUrl: m.url,
			categories: getCategoryNamesForManga(m.id, result.mangaCategories, result.categories),
		}))

		const categories: ParsedCategory[] = result.categories.map(c => ({
			id: c.id,
			name: c.name,
		}))

		return {
			manga,
			categories,
			mangaCategories: result.mangaCategories,
		}
	}

	mapSource(
		backupSourceId: string,
		availableSources: SourceProvider[],
	): SourceMappingResult | null {
		return mapTachiyomiToSource(backupSourceId, availableSources)
	}

	extractSerieId(
		source: SourceProvider,
		backupSourceId: string,
		relativeUrl: string,
	): string | null {
		return extractSerieIdFromSource(source, backupSourceId, relativeUrl)
	}

	getSourceName(
		sourceId: string,
		availableSources: SourceProvider[],
	): string | null {
		return getSourceName(sourceId, availableSources)
	}
}
