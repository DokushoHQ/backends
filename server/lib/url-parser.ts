import type { SourceProvider, SourceId, SourceSerieId } from "../utils/sources/core"

export type ParsedSerieUrl = {
	sourceId: SourceId
	serieId: SourceSerieId
}

/**
 * Attempts to parse a URL using all available sources.
 * Returns the source ID and series ID if a match is found.
 */
export function parseSerieUrl(sources: SourceProvider[], url: string): ParsedSerieUrl | null {
	for (const source of sources) {
		const result = source.parseUrl(url)
		if (result) {
			return {
				sourceId: source.sourceInformation().id,
				serieId: result.serieId,
			}
		}
	}
	return null
}
