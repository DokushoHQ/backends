import { defineProvider } from "@nuxt/image/runtime"

/**
 * Smart image provider for non-S3 images:
 * - Allowed proxy hosts → backend image proxy
 * - Everything else → pass through unchanged
 *
 * S3 images use the default `ipx` provider directly.
 */
export default defineProvider({
	getImage(src) {
		const runtimeConfig = useRuntimeConfig()

		// Proxy images from allowed hosts
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
