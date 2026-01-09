import type { Language } from "./db"
import { db } from "./db"
import type { SourceProvider } from "./sources/core"

/**
 * Syncs sources from code to the database.
 * This should be called on app startup to ensure all sources are available.
 * @param sources - Array of source instances to sync
 * @param disabledSourceIds - Array of source IDs to disable (from FORCE_DISABLE_SOURCE env)
 */
export async function syncSources(sources: SourceProvider[], disabledSourceIds: string[] = []): Promise<void> {
	const disabledSet = new Set(disabledSourceIds)

	for (const source of sources) {
		const info = source.sourceInformation()
		const apiInfo = source.sourceApiInformation()
		const isEnabled = !disabledSet.has(info.id)

		await db.source.upsert({
			where: { external_id: info.id },
			update: {
				name: info.name,
				icon: info.icon.toString(),
				version: info.version,
				nsfw: info.nsfw,
				enabled: isEnabled,
				languages: info.enabledLanguages as Language[],
				search_filters: info.searchFilters,
				timeout: apiInfo.timeout,
				can_block_scraping: apiInfo.canBlockScraping,
				minimum_update_interval: apiInfo.minimumUpdateInterval,
				rate_limit_max: apiInfo.rateLimitMax,
				rate_limit_duration: apiInfo.rateLimitDuration,
				updated_at: info.updatedAt,
			},
			create: {
				external_id: info.id,
				name: info.name,
				icon: info.icon.toString(),
				version: info.version,
				nsfw: info.nsfw,
				enabled: isEnabled,
				languages: info.enabledLanguages as Language[],
				search_filters: info.searchFilters,
				timeout: apiInfo.timeout,
				can_block_scraping: apiInfo.canBlockScraping,
				minimum_update_interval: apiInfo.minimumUpdateInterval,
				rate_limit_max: apiInfo.rateLimitMax,
				rate_limit_duration: apiInfo.rateLimitDuration,
				updated_at: info.updatedAt,
			},
		})
	}
}
