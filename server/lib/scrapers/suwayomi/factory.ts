import type { SuwayomiClient } from "../../suwayomi-client"
import type { SourceProvider, SourceEnv } from "../../../utils/sources/core"
import { SuwayomiSource } from "./index"
import { mapSuwayomiLang } from "./types"

export type SuwayomiSourceEnv = SourceEnv & {
	SUWAYOMI_URL?: string
	SUWAYOMI_DISABLED_SOURCES?: string[]
}

/**
 * Create Source instances from available Suwayomi extensions
 * Filters out sources we have native implementations for
 * @param client - Suwayomi GraphQL client
 * @param env - Source environment configuration
 * @param nativeSources - Native source implementations to exclude from Suwayomi
 */
export async function createSuwayomiSources(
	client: SuwayomiClient,
	env: SuwayomiSourceEnv,
	nativeSources: SourceProvider[],
): Promise<SuwayomiSource[]> {
	try {
		const availableSources = await client.getSources()

		// Build exclusion set from native source names (case-insensitive)
		const nativeSourceNames = new Set(nativeSources.map(s => s.sourceInformation().name.toLowerCase()))

		return (
			availableSources
			// Exclude Suwayomi's internal "Local source"
				.filter(s => s.id !== "0" && s.name !== "Local source")
			// Exclude native implementations by name (case-insensitive)
				.filter(s => !nativeSourceNames.has(s.name.toLowerCase()))
			// Filter by enabled languages
				.filter((s) => {
					const sourceLang = mapSuwayomiLang(s.lang)
					return env.ENABLED_LANGUAGE.includes(sourceLang)
				})
			// Exclude disabled sources
				.filter(s => !env.SUWAYOMI_DISABLED_SOURCES?.includes(s.id))
			// Create SuwayomiSource instances
				.map(s => new SuwayomiSource(client, s.id, s, env))
		)
	}
	catch (error) {
		console.error("Failed to load Suwayomi sources:", error)
		return []
	}
}
