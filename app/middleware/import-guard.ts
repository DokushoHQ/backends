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
	if (!to.path.startsWith("/series/import")) {
		return
	}

	// Review requires cart items
	if (to.path === "/series/import/review") {
		const cart = useImportCart()
		if (cart.cartCount.value === 0) {
			return navigateTo("/series/import")
		}
	}

	// Backup select requires backup results
	if (to.path === "/series/import/backup/select") {
		const backup = useImportBackup()
		if (!backup.backupResults.value) {
			return navigateTo("/series/import/backup")
		}
	}

	// Processing requires all decisions made
	if (to.path === "/series/import/processing") {
		const cart = useImportCart()
		if (!cart.allDecisionsMade.value) {
			return navigateTo("/series/import/review")
		}
	}
})
