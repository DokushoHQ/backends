export default defineNuxtRouteMiddleware(async (to) => {
	// Public routes that don't require auth (including 2FA, password reset, email verification)
	const publicPaths = ["/login", "/api/auth", "/two-factor", "/forgot-password", "/reset-password", "/verify-email"]
	if (publicPaths.some(p => to.path.startsWith(p))) {
		return
	}

	// Fetch session directly - disable caching to always get fresh session
	const { data: session } = await authClient.useSession(useFetch)

	if (!session.value?.user) {
		return navigateTo("/login")
	}

	// Check if user needs to set up 2FA (password users without 2FA enabled)
	// Only check on page navigation, not for API calls
	if (!to.path.startsWith("/api/")) {
		const user = session.value.user

		// If user doesn't have 2FA enabled, check if they have password auth
		if (!user.twoFactorEnabled) {
			// Fetch 2FA requirement status
			const { data } = await useFetch("/api/auth/two-factor-required", {
				key: "two-factor-required",
			})

			if (data.value?.required) {
				return navigateTo("/two-factor")
			}
		}
	}
})
