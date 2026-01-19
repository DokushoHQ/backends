import { configureSerieIndex } from "../utils/meilisearch"

export default defineNitroPlugin(async () => {
	const config = useRuntimeConfig()

	// Skip if disabled (useful for worker processes)
	if (config.skipMeilisearchConfig) {
		console.log("Skipping Meilisearch index configuration (disabled via env)")
		return
	}

	try {
		await configureSerieIndex()
		console.log("Meilisearch index configured")
	}
	catch (error) {
		console.error("Failed to configure Meilisearch index:", error)
	}
})
