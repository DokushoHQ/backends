/**
 * Import Guard Middleware
 *
 * Validates navigation within import flow:
 * - Prevents accessing /review with empty cart
 * - Prevents accessing /backup/select without backup results
 * - Prevents leaving /processing
 */

export default defineNuxtRouteMiddleware((to) => {
	// Only apply to import routes
	if (!to.path.startsWith("/dashboard/series/import")) {
		return
	}

	// Review requires cart items
	if (to.path === "/dashboard/series/import/review") {
		const cart = useImportCart()
		if (cart.cartCount.value === 0) {
			return navigateTo("/dashboard/series/import")
		}
	}

	// Backup select requires backup results
	if (to.path === "/dashboard/series/import/backup/select") {
		const backup = useImportBackup()
		if (!backup.backupResults.value) {
			return navigateTo("/dashboard/series/import/backup")
		}
	}

	// Processing requires all decisions made
	if (to.path === "/dashboard/series/import/processing") {
		const cart = useImportCart()
		if (!cart.allDecisionsMade.value) {
			return navigateTo("/dashboard/series/import/review")
		}
	}
})
