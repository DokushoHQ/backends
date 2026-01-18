import type { SourceProvider } from "../sources/core"
import type { SourceMappingResult } from "../backup-parsers/types"

/**
 * Known Tachiyomi source IDs for native Dokusho sources
 * These IDs are extracted from Tachimanga backups and map to native scrapers
 */
export const NATIVE_SOURCE_MAP: Record<string, string> = {
	// MangaDex (all language variants map to the same native source)
	"2499283573021220255": "mangadex", // MangaDex (en)

	// WeebCentral
	"2131019126180322627": "weebcentral", // WeebCentral (en)

	// Japscan - add ID when discovered from backup
	// "...": "japscan",
}

/**
 * Map a Tachiyomi source ID to a Dokusho source
 *
 * Priority:
 * 1. Check if it maps to a native source (MangaDex, WeebCentral, etc.)
 * 2. Fall back to Suwayomi source if available
 *
 * @param tachiyomiSourceId - The source ID from Tachimanga backup
 * @param availableSources - List of available Dokusho sources
 * @returns Mapping result or null if no matching source found
 */
export function mapTachiyomiToSource(
	tachiyomiSourceId: string,
	availableSources: SourceProvider[],
): SourceMappingResult | null {
	// 1. Check native mapping first
	const nativeId = NATIVE_SOURCE_MAP[tachiyomiSourceId]
	if (nativeId) {
		const source = availableSources.find(s => s.sourceInformation().id === nativeId)
		if (source) {
			return { sourceId: nativeId, type: "native" }
		}
	}

	// 2. Check for Suwayomi source (format: suwayomi-{tachiyomi_id})
	const suwayomiId = `suwayomi-${tachiyomiSourceId}`
	const suwayomiSource = availableSources.find(s => s.sourceInformation().id === suwayomiId)
	if (suwayomiSource) {
		return { sourceId: suwayomiId, type: "suwayomi" }
	}

	return null
}

/**
 * Get the display name for a source by its Dokusho source ID
 */
export function getSourceName(sourceId: string, availableSources: SourceProvider[]): string | null {
	const source = availableSources.find(s => s.sourceInformation().id === sourceId)
	return source?.sourceInformation().name ?? null
}
