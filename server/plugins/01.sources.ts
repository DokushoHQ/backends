import { createSources, type SourceEnvWithSuwayomi } from "../utils/sources"
import { syncSources } from "../utils/sync-sources"

export default defineNitroPlugin(async () => {
	const config = useRuntimeConfig()

	console.log("Initializing sources...")

	try {
		// Create source environment from runtime config
		// Parse comma-separated enabled languages (e.g., "Fr,En")
		const enabledLanguages = config.enabledLanguages
			?.split(",")
			.map((lang: string) => lang.trim())
			.filter(Boolean) as ("En" | "Fr")[]

		const sourceEnv: SourceEnvWithSuwayomi = {
			ENABLED_LANGUAGE: enabledLanguages?.length ? enabledLanguages : ["En"],
			BYPARR_URL: config.byparrUrl,
			// Suwayomi support (optional)
			SUWAYOMI_URL: config.suwayomiUrl,
			SUWAYOMI_DISABLED_SOURCES: [],
		}

		// Create all source instances
		const sources = await createSources(sourceEnv)

		// Get disabled source IDs from config
		const disabledSourceIds = config.forceDisableSource?.split(",").filter(Boolean) || []

		// Sync sources to database
		await syncSources(sources, disabledSourceIds)

		console.log(`Synced ${sources.length} sources to database`)
	}
	catch (error) {
		console.error("Failed to initialize sources:", error)
	}
})
