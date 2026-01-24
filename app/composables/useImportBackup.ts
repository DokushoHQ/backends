/**
 * Import Backup Composable
 *
 * Manages state for the backup import flow: uploading, parsing, and selecting manga.
 */

// ==================== Types ====================

export interface BackupParsedManga {
	id: number | string
	title: string
	backupSourceId: string
	backupSourceName: string
	relativeUrl: string
	categories: string[]
	mapped: boolean
	sourceId?: string
	sourceName?: string
	serieId?: string
	alreadyImported: boolean
	existingSerieId?: string
	selected: boolean // For UI selection
}

export interface BackupCategory {
	id: number | string
	name: string
	count: number
}

export interface BackupProgress {
	stage: "downloading" | "extracting" | "parsing" | "mapping" | "checking" | "complete"
	percent: number
	current?: number
	total?: number
}

export interface BackupParseResult {
	backupType: string
	manga: BackupParsedManga[]
	categories: BackupCategory[]
	stats: {
		total: number
		mapped: number
		unmapped: number
		alreadyImported: number
	}
}

interface SerieDetail {
	id: string
	title: string
	alternateTitles: string[]
	cover: string | null
	synopsis: string | null
	status: string[]
	type: string
	genres: string[]
	authors: string[]
	artists: string[]
}

// ==================== Composable ====================

export function useImportBackup() {
	const cart = useImportCart()
	const browse = useImportBrowse()

	// ==================== State ====================
	// Use useState for SSR-compatible global state (persists across navigation)
	const backupJobId = useState<string | null>("import-backup-job-id", () => null)
	const backupProgress = useState<BackupProgress>("import-backup-progress", () => ({ stage: "extracting", percent: 0 }))
	const backupResults = useState<BackupParseResult | null>("import-backup-results", () => null)
	const backupError = useState<string | null>("import-backup-error", () => null)
	const backupSelectedCategory = useState<number | string | null>("import-backup-category", () => null)
	const backupUploading = useState("import-backup-uploading", () => false)
	const backupPolling = useState("import-backup-polling", () => false)
	const backupAddingToCart = useState("import-backup-adding", () => false)

	// ==================== Computed ====================

	const backupFilteredManga = computed(() => {
		if (!backupResults.value) return []
		const manga = backupResults.value.manga
		if (backupSelectedCategory.value === null) return manga
		const category = backupResults.value.categories.find(c => c.id === backupSelectedCategory.value)
		if (!category) return manga
		return manga.filter(m => m.categories.includes(category.name))
	})

	const backupImportableManga = computed(() => {
		return backupFilteredManga.value.filter(m => m.mapped && !m.alreadyImported && m.selected)
	})

	const backupSelectedCount = computed(() => {
		if (!backupResults.value) return 0
		return backupResults.value.manga.filter(m => m.selected).length
	})

	const isProcessing = computed(() => backupUploading.value || backupPolling.value)

	const STAGE_LABELS: Record<BackupProgress["stage"] | "default", string> = {
		downloading: "Downloading backup...",
		extracting: "Extracting backup file...",
		parsing: "Parsing manga database...",
		mapping: "Mapping sources...",
		checking: "Checking existing imports...",
		complete: "Complete!",
		default: "Processing...",
	}

	const stageLabel = computed(() =>
		STAGE_LABELS[backupProgress.value.stage] ?? STAGE_LABELS.default,
	)

	// ==================== Methods ====================

	async function uploadBackupFile(file: File) {
		backupUploading.value = true
		backupError.value = null

		try {
			const formData = new FormData()
			formData.append("file", file)

			const response = await $fetch<{ jobId: string }>("/api/v1/import-backup/upload", {
				method: "POST",
				body: formData,
			})

			backupJobId.value = response.jobId
			// Start polling for status
			await pollBackupStatus()
		}
		catch (e: unknown) {
			const fetchError = e as { data?: { message?: string }, message?: string }
			backupError.value = fetchError.data?.message || fetchError.message || "Failed to upload file"
		}
		finally {
			backupUploading.value = false
		}
	}

	async function pollBackupStatus(): Promise<boolean> {
		if (!backupJobId.value) return false

		backupPolling.value = true

		try {
			while (true) {
				const status = await $fetch<{
					id: string
					state: string
					progress: BackupProgress | null
					result: BackupParseResult | null
					failedReason: string | null
				}>(`/api/v1/import-backup/${backupJobId.value}/status`)

				if (status.progress) {
					backupProgress.value = status.progress
				}

				if (status.state === "completed" && status.result) {
					// Add selected flag to manga and auto-select importable ones
					backupResults.value = {
						...status.result,
						manga: status.result.manga.map(m => ({
							...m,
							selected: m.mapped && !m.alreadyImported,
						})),
					}
					return true
				}
				else if (status.state === "failed") {
					backupError.value = status.failedReason || "Parsing failed"
					return false
				}

				// Wait before next poll
				await new Promise(resolve => setTimeout(resolve, 1000))
			}
		}
		catch (e: unknown) {
			const fetchError = e as { data?: { message?: string }, message?: string }
			backupError.value = fetchError.data?.message || fetchError.message || "Failed to get status"
			return false
		}
		finally {
			backupPolling.value = false
		}
	}

	function toggleBackupMangaSelection(mangaId: number | string) {
		if (!backupResults.value) return
		const manga = backupResults.value.manga.find(m => m.id === mangaId)
		if (manga && manga.mapped && !manga.alreadyImported) {
			manga.selected = !manga.selected
		}
	}

	function selectAllBackupManga() {
		const filteredIds = new Set(backupFilteredManga.value.map(m => m.id))
		if (!backupResults.value) return
		for (const manga of backupResults.value.manga) {
			if (filteredIds.has(manga.id) && manga.mapped && !manga.alreadyImported) {
				manga.selected = true
			}
		}
	}

	function deselectAllBackupManga() {
		const filteredIds = new Set(backupFilteredManga.value.map(m => m.id))
		if (!backupResults.value) return
		for (const manga of backupResults.value.manga) {
			if (filteredIds.has(manga.id)) {
				manga.selected = false
			}
		}
	}

	async function addBackupToCart(): Promise<void> {
		const selectedManga = backupImportableManga.value

		if (selectedManga.length === 0) return

		backupAddingToCart.value = true

		const missingSourceIds = new Set<string>()
		let addedCount = 0

		try {
			// Ensure sources are loaded (required for mapping external_id to database UUID)
			if (browse.sources.value.length === 0) {
				await browse.fetchSources()
			}

			for (const manga of selectedManga) {
				if (!manga.sourceId || !manga.serieId || !manga.sourceName) continue

				// Find the database source by external_id
				// manga.sourceId is the external_id (e.g., "mangadex"), we need the database UUID
				const dbSource = browse.getSourceByExternalId(manga.sourceId)

				if (!dbSource) {
					missingSourceIds.add(manga.sourceId)
					continue
				}

				// Fetch detail to get full info using database source ID
				try {
					const detail = await $fetch(`/api/v1/sources/${dbSource.id}/detail`, {
						query: { serieId: manga.serieId },
					}) as SerieDetail

					cart.addToCart({
						sourceId: dbSource.id,
						sourceName: manga.sourceName,
						externalId: manga.serieId,
						title: detail.title,
						cover: detail.cover,
						type: detail.type,
						status: detail.status,
					})
					addedCount++
				}
				catch {
					// If can't fetch detail, use basic info from backup
					cart.addToCart({
						sourceId: dbSource.id,
						sourceName: manga.sourceName,
						externalId: manga.serieId,
						title: manga.title,
						cover: null,
						type: "Unknown",
						status: [],
					})
					addedCount++
				}
			}

			if (addedCount === 0 && selectedManga.length > 0) {
				if (missingSourceIds.size > 0) {
					console.warn(`[Backup Import] Missing sources: ${[...missingSourceIds].join(", ")}`)
					alert(`Could not add any items. Missing sources: ${[...missingSourceIds].join(", ")}\n\nMake sure these sources are enabled in the database.`)
				}
			}
		}
		finally {
			backupAddingToCart.value = false
		}
	}

	function reset() {
		backupJobId.value = null
		backupProgress.value = { stage: "extracting", percent: 0 }
		backupResults.value = null
		backupError.value = null
		backupSelectedCategory.value = null
		backupUploading.value = false
		backupPolling.value = false
		backupAddingToCart.value = false
	}

	return {
		// State
		backupJobId,
		backupProgress,
		backupResults,
		backupError,
		backupSelectedCategory,
		backupUploading,
		backupPolling,
		backupAddingToCart,

		// Computed
		backupFilteredManga,
		backupImportableManga,
		backupSelectedCount,
		isProcessing,
		stageLabel,

		// Methods
		uploadBackupFile,
		pollBackupStatus,
		toggleBackupMangaSelection,
		selectAllBackupManga,
		deselectAllBackupManga,
		addBackupToCart,
		reset,
	}
}
