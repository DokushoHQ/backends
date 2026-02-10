export default defineNuxtRouteMiddleware(async (to) => {
	// Public routes that don't require auth (including 2FA, password reset, email verification)
	const publicPaths = ["/login", "/api/auth", "/two-factor", "/forgot-password", "/reset-password", "/verify-email"]
	if (publicPaths.some(p => to.path.startsWith(p))) {
		return
	}

	if (import.meta.client) {
		// On client-side navigation, use $fetch directly to bypass Nuxt's useFetch cache.
		// useFetch caches by URL key and returns stale session data even after server-side expiry.
		const session = await $fetch<{ user?: { twoFactorEnabled?: boolean } }>("/api/auth/get-session").catch(() => null)

		if (!session?.user) {
			return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
		}

		if (!to.path.startsWith("/api/") && !session.user.twoFactorEnabled) {
			const data = await $fetch<{ required?: boolean }>("/api/auth/two-factor-required").catch(() => null)
			if (data?.required) {
				return navigateTo("/two-factor")
			}
		}
		return
	}

	// SSR: use authClient.useSession(useFetch) for hydration compatibility
	const { data: session } = await authClient.useSession(useFetch)

	if (!session.value?.user) {
		return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
	}

	// Check if user needs to set up 2FA (password users without 2FA enabled)
	// Only check on page navigation, not for API calls
	if (!to.path.startsWith("/api/")) {
		const user = session.value.user

		// If user doesn't have 2FA enabled, check if they have password auth
		if (!user.twoFactorEnabled) {
			// Fetch 2FA requirement status
			const { data } = await useFetch("/api/auth/two-factor-required")

			if (data.value?.required) {
				return navigateTo("/two-factor")
			}
		}
	}
})
