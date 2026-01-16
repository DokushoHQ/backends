import { defineProvider } from "@nuxt/image/runtime"

/**
 * Smart image provider that automatically detects URLs from allowed hosts and proxies them
 * through the backend API. All other URLs pass through unchanged.
 */
export default defineProvider({
	getImage(src) {
		const runtimeConfig = useRuntimeConfig()
		const allowedHosts = runtimeConfig.public.allowedImageProxy
			.split(",")
			.map(h => h.trim())
			.filter(Boolean)

		if (allowedHosts.length > 0) {
			try {
				const srcUrl = new URL(src)
				if (allowedHosts.includes(srcUrl.host)) {
					return {
						url: `/api/v1/proxy/image?url=${encodeURIComponent(src)}`,
					}
				}
			}
			catch {
				// Invalid URL, pass through
			}
		}

		return { url: src }
	},
})
