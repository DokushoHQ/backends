/**
 * Dashboard Middleware
 *
 * Restricts /dashboard/* routes to admin users only.
 * Non-admin users are redirected to the reader landing page.
 */
export default defineNuxtRouteMiddleware(async (to) => {
	if (!to.path.startsWith("/dashboard")) {
		return
	}

	const { isAdmin } = await useAuth()

	if (!isAdmin.value) {
		const toast = useToast()
		toast.add({
			title: "Access denied",
			description: "Dashboard is restricted to administrators.",
			color: "error",
		})
		return navigateTo("/")
	}
})
