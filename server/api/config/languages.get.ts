export default defineEventHandler(() => {
	const config = useRuntimeConfig()
	const enabled = config.enabledLanguages?.split(",").map(l => l.trim()).filter(Boolean)
	return { languages: enabled?.length ? enabled : ["En"], primary: config.primaryLanguage || "En" }
})
