import type { SourceProvider } from "../sources/core"

/**
 * A manga entry parsed from a backup file
 */
export interface ParsedMangaEntry {
	/** Unique ID within the backup */
	id: number | string
	/** Manga title */
	title: string
	/** Source identifier from the backup (e.g., Tachiyomi source ID) */
	backupSourceId: string
	/** Source name from the backup */
	backupSourceName: string
	/** Relative URL or identifier for the manga on the source */
	relativeUrl: string
	/** Categories/collections the manga belongs to */
	categories: string[]
}

/**
 * A category parsed from a backup file
 */
export interface ParsedCategory {
	id: number | string
	name: string
}

/**
 * Raw result from parsing a backup file
 */
export interface BackupParseResult {
	/** All manga entries found in the backup */
	manga: ParsedMangaEntry[]
	/** Categories defined in the backup */
	categories: ParsedCategory[]
	/** Map of manga ID to category IDs */
	mangaCategories: Map<number | string, (number | string)[]>
}

/**
 * Result of mapping a backup source to a Dokusho source
 */
export interface SourceMappingResult {
	/** Dokusho source ID (e.g., "mangadex", "weebcentral") */
	sourceId: string
	/** Type of source */
	type: "native" | "suwayomi"
}

/**
 * Interface that backup parsers must implement
 */
export interface BackupParser {
	/**
	 * Unique identifier for this backup type
	 */
	readonly type: string

	/**
	 * Human-readable name for this backup type
	 */
	readonly displayName: string

	/**
	 * File extensions this parser handles (e.g., [".tmb", ".tachibk"])
	 */
	readonly extensions: string[]

	/**
	 * Parse the backup file buffer
	 */
	parse(buffer: Buffer): Promise<BackupParseResult>

	/**
	 * Map a backup source ID to a Dokusho source
	 * @param backupSourceId - Source ID from the backup
	 * @param availableSources - List of available Dokusho sources
	 */
	mapSource(
		backupSourceId: string,
		availableSources: SourceProvider[],
	): SourceMappingResult | null

	/**
	 * Extract the serie ID that Dokusho expects
	 * @param source - The Dokusho source provider
	 * @param backupSourceId - Source ID from the backup
	 * @param relativeUrl - Relative URL from the backup
	 */
	extractSerieId(
		source: SourceProvider,
		backupSourceId: string,
		relativeUrl: string,
	): string | null

	/**
	 * Get display name for a source
	 * @param sourceId - Dokusho source ID
	 * @param availableSources - List of available Dokusho sources
	 */
	getSourceName(
		sourceId: string,
		availableSources: SourceProvider[],
	): string | null
}
