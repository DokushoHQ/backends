// Core types and enums
import type { SourceProvider, SourceEnv, SourceId } from "./core"
import { SuwayomiClient } from "../../lib/suwayomi-client"
import { Japscan } from "../../lib/scrapers/japscan"
import { Mangadex } from "../../lib/scrapers/mangadex"
import { createSuwayomiSources } from "../../lib/scrapers/suwayomi/factory"
import { WeebCentral } from "../../lib/scrapers/weebcentral"

export * from "./core"
export { type ParsedSerieUrl, parseSerieUrl } from "../../lib/url-parser"

// Extended env type with Suwayomi options
export type SourceEnvWithSuwayomi = SourceEnv & {
	SUWAYOMI_URL?: string
	SUWAYOMI_DISABLED_SOURCES?: string[]
}

// Factory function to create all sources (async to support Suwayomi)
export const createSources = async (env: SourceEnvWithSuwayomi): Promise<SourceProvider[]> => {
	const nativeSources: SourceProvider[] = [new WeebCentral(env), new Mangadex(env), new Japscan(env)]

	// Optionally add Suwayomi sources if configured
	if (env.SUWAYOMI_URL) {
		try {
			const client = new SuwayomiClient(env.SUWAYOMI_URL)
			// Pass native sources so factory can exclude them dynamically
			const suwayomiSources = await createSuwayomiSources(client, env, nativeSources)
			return [...nativeSources, ...suwayomiSources]
		}
		catch (error) {
			console.error("Failed to initialize Suwayomi sources:", error)
			// Continue with native sources only
		}
	}

	return nativeSources
}

// Helper to get a specific source by ID
export const getSourceById = (sources: SourceProvider[], source_id: SourceId): SourceProvider => {
	const source = sources.find(s => s.sourceInformation().id === source_id)
	if (!source) throw new Error(`Source not found: ${source_id}`)
	return source
}

// Helper to get source environment from runtime config
export function getSourceEnv(): SourceEnvWithSuwayomi {
	const config = useRuntimeConfig()
	const enabledLanguages = (config.enabledLanguages as string)
		?.split(",")
		.map((lang: string) => lang.trim())
		.filter(Boolean) as ("En" | "Fr")[]

	return {
		ENABLED_LANGUAGE: enabledLanguages?.length ? enabledLanguages : ["En"],
		BYPARR_URL: config.byparrUrl as string | undefined,
		SUWAYOMI_URL: config.suwayomiUrl as string | undefined,
		SUWAYOMI_DISABLED_SOURCES: [],
	}
}

// Helper to get a source by its external_id (creates sources on demand)
export async function getSource(externalId: SourceId): Promise<SourceProvider> {
	const sources = await createSources(getSourceEnv())
	return getSourceById(sources, externalId)
}

// Helper to get all sources
export async function getSources(): Promise<SourceProvider[]> {
	return createSources(getSourceEnv())
}
