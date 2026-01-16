export default defineEventHandler(async (event) => {
	const { url } = getQuery(event)

	if (!url || typeof url !== "string") {
		throw createError({ statusCode: 400, message: "Missing url parameter" })
	}

	const config = useRuntimeConfig()

	// Build list of allowed hosts from public config + suwayomi
	const allowedHosts = new Set<string>()

	// Add hosts from public allowedImageProxy
	const proxyHosts = config.public.allowedImageProxy
	if (proxyHosts) {
		proxyHosts.split(",").map(h => h.trim()).filter(Boolean).forEach(h => allowedHosts.add(h))
	}

	// Also allow suwayomi host (backward compat, in case user didn't add it to allowedImageProxy)
	if (config.suwayomiUrl) {
		try {
			allowedHosts.add(new URL(config.suwayomiUrl).host)
		}
		catch { /* ignore invalid URL */ }
	}

	if (allowedHosts.size === 0) {
		throw createError({ statusCode: 500, message: "No allowed proxy hosts configured" })
	}

	const parsedUrl = new URL(url)
	if (!allowedHosts.has(parsedUrl.host)) {
		throw createError({ statusCode: 403, message: "Forbidden host" })
	}

	// Proxy the request directly (no body reading, streams directly)
	return proxyRequest(event, url, {
		headers: {
			"Cache-Control": "public, max-age=86400", // 24h cache
		},
	})
})
