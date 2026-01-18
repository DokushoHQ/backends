import type { SourceProvider } from "../sources/core"
import { NATIVE_SOURCE_MAP } from "./source-map"

/**
 * Transform relative URL paths to match what the source's parseUrl expects
 * Tachimanga stores URLs differently than what the sources expect
 */
const URL_TRANSFORMERS: Record<string, (relativeUrl: string) => string> = {
	// MangaDex: /manga/{uuid} -> /title/{uuid}
	mangadex: url => url.replace(/^\/manga\//, "/title/"),
	// WeebCentral: /series/{id}/{slug} -> /series/{id}/{slug} (no change needed)
	weebcentral: url => url,
	// Japscan: /{type}/{slug} -> /{type}/{slug} (no change needed)
	japscan: url => url,
}

/**
 * Reconstruct a full URL from a Tachimanga relative URL using a source provider
 *
 * @param source - The source provider instance (used to get base URL)
 * @param tachiyomiSourceId - The Tachiyomi source ID (used for URL transformation)
 * @param relativeUrl - The relative URL from Tachimanga
 * @returns Full URL or null if reconstruction failed
 */
export function reconstructUrl(
	source: SourceProvider,
	tachiyomiSourceId: string,
	relativeUrl: string,
): string | null {
	const nativeId = NATIVE_SOURCE_MAP[tachiyomiSourceId]
	const baseUrl = source.sourceInformation().url.toString().replace(/\/$/, "")

	if (nativeId) {
		const transformer = URL_TRANSFORMERS[nativeId]
		if (transformer) {
			const transformedPath = transformer(relativeUrl)
			return `${baseUrl}${transformedPath}`
		}
	}

	// Suwayomi or unknown sources: use base URL + relative path directly
	return `${baseUrl}${relativeUrl}`
}

/**
 * Extract the serie ID using the source's parseUrl method
 *
 * @param source - The source provider instance
 * @param tachiyomiSourceId - The Tachiyomi source ID (for URL transformation)
 * @param relativeUrl - The relative URL from Tachimanga
 * @returns The serie ID or null if extraction failed
 */
export function extractSerieIdFromSource(
	source: SourceProvider,
	tachiyomiSourceId: string,
	relativeUrl: string,
): string | null {
	const fullUrl = reconstructUrl(source, tachiyomiSourceId, relativeUrl)

	if (!fullUrl) {
		return null
	}

	const parsed = source.parseUrl(fullUrl)
	return parsed?.serieId ?? null
}
