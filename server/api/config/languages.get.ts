export default defineEventHandler(() => {
	const config = useRuntimeConfig()
	const enabled = config.enabledLanguages?.split(",").map(l => l.trim()).filter(Boolean) || ["En"]
	return { languages: enabled, primary: config.primaryLanguage || "En" }
})
