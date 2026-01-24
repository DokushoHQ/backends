/**
 * Import Processing Composable
 *
 * Manages state for the processing step: job queuing, progress tracking, and polling.
 */

import type { SelectedSerie } from "./useImportCart"

// ==================== Status Helpers ====================

export function getProcessingStatusIcon(state?: string): string {
	const icons: Record<string, string> = {
		done: "i-lucide-check-circle",
		error: "i-lucide-x-circle",
		processing: "i-lucide-loader-2",
		queued: "i-lucide-clock",
	}
	return icons[state ?? ""] ?? "i-lucide-circle"
}

export function getProcessingStatusClass(state?: string): string {
	const classes: Record<string, string> = {
		done: "status--done",
		error: "status--error",
		processing: "status--processing",
		queued: "status--queued",
	}
	return classes[state ?? ""] ?? "status--pending"
}

export function getProcessingStatusLabel(state?: string, linkToCartKey?: string): string {
	if (state === "done") return "Complete"
	if (state === "error") return "Failed"
	if (state === "processing") return "Processing..."
	if (state === "queued") return "Queued"
	if (state === "pending" && linkToCartKey) return "Waiting for primary"
	if (state === "pending") return "Pending"
	return "Waiting..."
}

// ==================== Composable ====================

export function useImportProcessing() {
	const cart = useImportCart()

	// ==================== State ====================
	const processingStarted = ref(false)

	// ==================== Computed ====================

	const processingProgress = computed(() => {
		if (cart.cartCount.value === 0) return 0
		const completed = cart.cartItems.value.filter(s =>
			s.processingState === "done" || s.processingState === "error",
		).length
		return Math.round((completed / cart.cartCount.value) * 100)
	})

	const processingComplete = computed(() => {
		return cart.cartItems.value.every(s =>
			s.processingState === "done" || s.processingState === "error",
		)
	})

	const processingStats = computed(() => {
		const items = cart.cartItems.value
		// Imported: Primary items (isPrimaryInGroup) or regular imports without cart duplicates
		const imported = items.filter(s =>
			s.processingState === "done"
			&& (s.isPrimaryInGroup || (s.action === "import" && !s.cartDuplicates?.length)),
		).length
		// Linked: Link to existing library series OR link to cart item (post-import link)
		const linked = items.filter(s =>
			s.processingState === "done"
			&& ((s.action === "link" && s.linkToSerieId) || s.linkToCartKey),
		).length
		return {
			total: items.length,
			linked,
			imported,
			errors: items.filter(s => s.processingState === "error").length,
		}
	})

	// Categorized items for display
	const importItems = computed(() =>
		cart.cartItems.value.filter(s =>
			s.isPrimaryInGroup || (s.action === "import" && !s.cartDuplicates?.length),
		),
	)

	const linkExistingItems = computed(() =>
		cart.cartItems.value.filter(s =>
			s.action === "link" && s.linkToSerieId,
		),
	)

	const postImportLinkItems = computed(() =>
		cart.cartItems.value.filter(s =>
			s.linkToCartKey && !s.linkToSerieId,
		),
	)

	// ==================== Methods ====================

	async function startProcessing() {
		if (!cart.allDecisionsMade.value) return

		processingStarted.value = true

		// Track: cartKey -> { jobId, serieId (when done) }
		const importJobs = new Map<string, { jobId: string, serieId?: string }>()
		const linkJobs = new Map<string, { jobId: string }>()

		// Step 1: Queue all import jobs
		for (const serie of importItems.value) {
			const key = cart.getCartKey(serie.sourceId, serie.externalId)
			const item = cart.selectedSeries.value.get(key)
			if (!item) continue

			item.processingState = "queued"
			item.processingMessage = "Queued for import..."

			try {
				const result = await $fetch<{ status: string, serieId?: string, jobId?: string }>(
					`/api/v1/sources/${item.sourceId}/import`,
					{
						method: "POST",
						body: { serieId: item.externalId },
					},
				)

				if (result.status === "exists" && result.serieId) {
					// Already exists - mark as done immediately
					item.processingState = "done"
					item.processingMessage = "Already exists"
					importJobs.set(key, { jobId: "", serieId: result.serieId })
				}
				else if (result.jobId) {
					item.jobId = result.jobId
					importJobs.set(key, { jobId: result.jobId })
				}
			}
			catch (e: unknown) {
				const fetchError = e as { data?: { message?: string }, message?: string }
				item.processingState = "error"
				item.processingMessage = fetchError.data?.message || fetchError.message || "Failed to queue"
			}
		}

		// Step 2: Queue all link-to-existing jobs
		for (const serie of linkExistingItems.value) {
			const key = cart.getCartKey(serie.sourceId, serie.externalId)
			const item = cart.selectedSeries.value.get(key)
			if (!item || !item.linkToSerieId) continue

			item.processingState = "queued"
			item.processingMessage = "Queued for linking..."

			try {
				const result = await $fetch<{ status: string, jobId?: string }>(
					`/api/v1/serie/${item.linkToSerieId}/link-source`,
					{
						method: "POST",
						body: {
							sourceId: item.sourceId,
							externalId: item.externalId,
						},
					},
				)

				if (result.status === "already_linked") {
					item.processingState = "done"
					item.processingMessage = "Already linked"
				}
				else if (result.jobId) {
					item.jobId = result.jobId
					linkJobs.set(key, { jobId: result.jobId })
				}
			}
			catch (e: unknown) {
				const fetchError = e as { data?: { message?: string }, message?: string }
				item.processingState = "error"
				item.processingMessage = fetchError.data?.message || fetchError.message || "Failed to queue"
			}
		}

		// Step 3: Poll jobs and trigger post-import links progressively
		await pollAllJobsProgressively(importJobs, linkJobs)
	}

	async function pollAllJobsProgressively(
		importJobs: Map<string, { jobId: string, serieId?: string }>,
		linkJobs: Map<string, { jobId: string }>,
	) {
		// Combine all jobs that need polling
		const pendingJobs = new Map<string, { item: SelectedSerie, jobId: string, type: "import" | "link" }>()

		for (const item of importItems.value) {
			const key = cart.getCartKey(item.sourceId, item.externalId)
			const job = importJobs.get(key)
			// Only add if job exists and not already completed (e.g., "already exists")
			if (job?.jobId && cart.selectedSeries.value.get(key)?.processingState !== "done") {
				pendingJobs.set(key, { item, jobId: job.jobId, type: "import" })
			}
		}

		for (const item of linkExistingItems.value) {
			const key = cart.getCartKey(item.sourceId, item.externalId)
			const job = linkJobs.get(key)
			if (job?.jobId && cart.selectedSeries.value.get(key)?.processingState !== "done") {
				pendingJobs.set(key, { item, jobId: job.jobId, type: "link" })
			}
		}

		// Mark post-import links as pending
		for (const item of postImportLinkItems.value) {
			const selectedItem = cart.selectedSeries.value.get(cart.getCartKey(item.sourceId, item.externalId))
			if (selectedItem) {
				selectedItem.processingState = "pending"
				selectedItem.processingMessage = "Waiting for primary import..."
			}
		}

		while (pendingJobs.size > 0) {
			for (const [cartKey, { jobId, type }] of pendingJobs) {
				const selectedItem = cart.selectedSeries.value.get(cartKey)
				if (!selectedItem) {
					pendingJobs.delete(cartKey)
					continue
				}

				try {
					const status = await $fetch<{
						id: string
						state: string
						progress: unknown
						returnvalue?: { serie_id?: string }
						failedReason?: string
					}>(`/api/jobs/serieInserter/${jobId}`)

					if (status.state === "active") {
						selectedItem.processingState = "processing"
						selectedItem.processingMessage = type === "import" ? "Importing..." : "Linking..."
					}
					else if (status.state === "completed") {
						selectedItem.processingState = "done"
						selectedItem.processingMessage = type === "import" ? "Import complete" : "Linked successfully"
						pendingJobs.delete(cartKey)

						// If this was an import, get the serieId and trigger dependent links
						if (type === "import") {
							const serieId = status.returnvalue?.serie_id
							if (serieId) {
								const jobInfo = importJobs.get(cartKey)
								if (jobInfo) jobInfo.serieId = serieId

								// Queue post-import links waiting for this import
								for (const linkItem of postImportLinkItems.value) {
									const linkSelectedItem = cart.selectedSeries.value.get(
										cart.getCartKey(linkItem.sourceId, linkItem.externalId),
									)
									if (
										linkSelectedItem
										&& linkSelectedItem.linkToCartKey === cartKey
										&& linkSelectedItem.processingState === "pending"
									) {
										linkSelectedItem.processingState = "queued"
										linkSelectedItem.processingMessage = "Queued for linking..."

										try {
											const result = await $fetch<{ status: string, jobId?: string }>(
												`/api/v1/serie/${serieId}/link-source`,
												{
													method: "POST",
													body: {
														sourceId: linkItem.sourceId,
														externalId: linkItem.externalId,
													},
												},
											)

											if (result.jobId) {
												linkSelectedItem.jobId = result.jobId
												const linkKey = cart.getCartKey(linkItem.sourceId, linkItem.externalId)
												pendingJobs.set(linkKey, { item: linkItem, jobId: result.jobId, type: "link" })
											}
										}
										catch (e: unknown) {
											const fetchError = e as { data?: { message?: string }, message?: string }
											linkSelectedItem.processingState = "error"
											linkSelectedItem.processingMessage = fetchError.data?.message || fetchError.message || "Failed to queue"
										}
									}
								}
							}
						}
					}
					else if (status.state === "failed") {
						selectedItem.processingState = "error"
						selectedItem.processingMessage = status.failedReason || "Job failed"
						pendingJobs.delete(cartKey)

						// Mark dependent links as failed
						if (type === "import") {
							for (const linkItem of postImportLinkItems.value) {
								const linkSelectedItem = cart.selectedSeries.value.get(
									cart.getCartKey(linkItem.sourceId, linkItem.externalId),
								)
								if (linkSelectedItem && linkSelectedItem.linkToCartKey === cartKey) {
									linkSelectedItem.processingState = "error"
									linkSelectedItem.processingMessage = "Primary import failed"
								}
							}
						}
					}
				}
				catch {
					// Ignore polling errors, will retry on next iteration
				}
			}

			if (pendingJobs.size > 0) {
				await new Promise(r => setTimeout(r, 2000)) // Poll every 2 seconds
			}
		}
	}

	function reset() {
		processingStarted.value = false
	}

	return {
		// State
		processingStarted,

		// Computed
		processingProgress,
		processingComplete,
		processingStats,
		importItems,
		linkExistingItems,
		postImportLinkItems,

		// Methods
		startProcessing,
		reset,
	}
}
