<script setup lang="ts">
import type { Source } from "~/composables/useSourceBrowser"
import type { UIParsedUrlItem } from "#shared/ui/type/source"

const _props = defineProps<{
	sources: Source[]
}>()

const emit = defineEmits<{
	imported: []
}>()

const open = defineModel<boolean>("open", { default: false })
const router = useRouter()

// Use shared composable
const browser = useSourceBrowser()

// Tab state
const activeTab = ref<"browse" | "url">("browse")

// Import-specific state
const importingIds = ref<Set<string>>(new Set())
const importedIds = ref<Set<string>>(new Set())

// URL import state (batch mode)
const parsedUrls = ref<UIParsedUrlItem[]>([])
const uploadingCsv = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Tab items
const tabItems = [
	{ label: "Browse", slot: "browse", icon: "i-lucide-search" },
	{ label: "Import by URL", slot: "url", icon: "i-lucide-link" },
]

// Reset state when dialog closes
watch(open, (isOpen) => {
	if (!isOpen) {
		browser.reset()
		activeTab.value = "browse"
		importingIds.value = new Set()
		importedIds.value = new Set()
		parsedUrls.value = []
		uploadingCsv.value = false
	}
})

function handleBack() {
	browser.selectedSource.value = null
	browser.resetSearch()
}

async function handleImport(serieId: string) {
	if (!browser.selectedSource.value) return

	importingIds.value = new Set([...importingIds.value, serieId])

	try {
		const data = await $fetch<{ status: string, serieId?: string, jobId?: string }>(
			`/api/v1/sources/${browser.selectedSource.value.id}/import`,
			{
				method: "POST",
				body: { serieId },
			},
		)

		importedIds.value = new Set([...importedIds.value, serieId])

		if (data.status === "exists" && data.serieId) {
			router.push(`/series/${data.serieId}`)
			open.value = false
		}
		else {
			emit("imported")
		}
	}
	catch (e: unknown) {
		browser.searchError.value = e instanceof Error ? e.message : "Failed to import series"
	}
	finally {
		const newSet = new Set(importingIds.value)
		newSet.delete(serieId)
		importingIds.value = newSet
	}
}

function handleNavigate(serieId: string) {
	router.push(`/series/${serieId}`)
	open.value = false
}

// URL Import functions
async function handleParseUrl() {
	const result = await browser.parseUrl(browser.urlInput.value)
	if (result) {
		parsedUrls.value = [...parsedUrls.value, { url: browser.urlInput.value.trim(), result }]
		browser.urlInput.value = ""
	}
}

async function handleCsvUpload(e: Event) {
	const file = (e.target as HTMLInputElement).files?.[0]
	if (!file) return

	uploadingCsv.value = true
	browser.urlError.value = null

	try {
		const text = await file.text()
		const urls = text
			.split("\n")
			.map(line => line.trim())
			.filter(line => line && !line.startsWith("#"))

		if (urls.length === 0) {
			browser.urlError.value = "No valid URLs found in file"
			return
		}

		if (urls.length > 100) {
			browser.urlError.value = "Maximum 100 URLs allowed per file"
			return
		}

		const newItems: UIParsedUrlItem[] = []
		for (const url of urls) {
			const result = await browser.parseUrl(url)
			if (result) {
				newItems.push({ url, result })
			}
		}
		parsedUrls.value = [...parsedUrls.value, ...newItems]
	}
	catch (e: unknown) {
		browser.urlError.value = e instanceof Error ? e.message : "Failed to process file"
	}
	finally {
		uploadingCsv.value = false
		if (fileInputRef.value) {
			fileInputRef.value.value = ""
		}
	}
}

async function handleImportFromUrl(item: UIParsedUrlItem) {
	if (!item.result.success) return

	parsedUrls.value = parsedUrls.value.map(p =>
		p.url === item.url ? { ...p, importing: true } : p,
	)

	try {
		const data = await $fetch<{ status: string, serieId?: string, jobId?: string }>(
			`/api/v1/sources/${item.result.sourceId}/import`,
			{
				method: "POST",
				body: { serieId: item.result.serieId },
			},
		)

		parsedUrls.value = parsedUrls.value.map((p) => {
			if (p.url !== item.url || !p.result.success) return p
			return {
				...p,
				importing: false,
				result: {
					...p.result,
					imported: true,
					existingSerieId: data.status === "exists" && data.serieId ? data.serieId : p.result.existingSerieId,
				},
			}
		})

		if (data.status === "exists" && data.serieId) {
			router.push(`/series/${data.serieId}`)
			open.value = false
		}
		else {
			emit("imported")
		}
	}
	catch {
		parsedUrls.value = parsedUrls.value.map(p =>
			p.url === item.url ? { ...p, importing: false } : p,
		)
		browser.urlError.value = "Failed to import series"
	}
}

function handleRemoveUrl(url: string) {
	parsedUrls.value = parsedUrls.value.filter(p => p.url !== url)
}

function handleClearUrls() {
	parsedUrls.value = []
}

function handleToggleSelect(url: string) {
	parsedUrls.value = parsedUrls.value.map(p =>
		p.url === url ? { ...p, selected: !p.selected } : p,
	)
}

// Computed values for selection
const importableUrls = computed(() =>
	parsedUrls.value.filter(p => p.result.success && !p.result.imported),
)
const selectedCount = computed(() => parsedUrls.value.filter(p => p.selected).length)
const allSelected = computed(() =>
	importableUrls.value.length > 0 && importableUrls.value.every(p => p.selected),
)
const importingSelected = computed(() => parsedUrls.value.some(p => p.selected && p.importing))

function handleSelectAll() {
	parsedUrls.value = parsedUrls.value.map(p =>
		p.result.success && !p.result.imported ? { ...p, selected: true } : p,
	)
}

function handleDeselectAll() {
	parsedUrls.value = parsedUrls.value.map(p => ({ ...p, selected: false }))
}

async function handleImportSelected() {
	const toImport = parsedUrls.value.filter(p => p.selected && p.result.success && !p.result.imported)
	for (const item of toImport) {
		await handleImportFromUrl(item)
	}
}

// Action button state
const isActionDisabled = computed(() => {
	if (!browser.serieDetail.value) return true
	return importingIds.value.has(browser.serieDetail.value.id) || importedIds.value.has(browser.serieDetail.value.id)
})

const isActionPending = computed(() => {
	if (!browser.serieDetail.value) return false
	return importingIds.value.has(browser.serieDetail.value.id)
})

const actionLabel = computed(() => {
	if (!browser.serieDetail.value) return "Import this Series"
	if (importedIds.value.has(browser.serieDetail.value.id)) return "Imported"
	return "Import this Series"
})

const actionIcon = computed(() => {
	if (!browser.serieDetail.value) return "i-lucide-download"
	if (importedIds.value.has(browser.serieDetail.value.id)) return "i-lucide-check"
	return "i-lucide-download"
})
</script>

<template>
	<UModal
		v-model:open="open"
		:ui="{ content: 'sm:max-w-7xl w-[95vw]' }"
	>
		<template #content>
			<UCard
				class="flex flex-col max-h-[85vh]"
				:ui="{ body: 'flex-1 overflow-hidden flex flex-col min-h-0' }"
			>
				<template #header>
					<div>
						<h2 class="text-lg font-semibold">
							Import Series
						</h2>
						<p class="text-sm text-muted-foreground">
							Search and import series from external sources
						</p>
					</div>
				</template>

				<UTabs
					v-model="activeTab"
					:items="tabItems"
				>
					<template #browse>
						<div
							v-if="!browser.selectedSource.value"
							class="p-4"
						>
							<SourcesSourceGrid
								:sources="sources"
								title="Select a source"
								@select="browser.selectedSource.value = $event"
							/>
						</div>

						<div
							v-else
							class="flex flex-col gap-4 p-4"
						>
							<div class="flex items-center gap-2">
								<UButton
									variant="ghost"
									size="sm"
									@click="handleBack"
								>
									&larr; Back
								</UButton>
								<span class="font-medium">{{ browser.selectedSource.value.name }}</span>
							</div>

							<form
								class="flex gap-2"
								@submit.prevent="browser.search"
							>
								<UInput
									v-model="browser.query.value"
									placeholder="Search series..."
									class="flex-1"
								/>
								<UButton
									type="submit"
									:disabled="browser.searching.value || !browser.query.value.trim()"
								>
									<UIcon
										v-if="browser.searching.value"
										name="i-lucide-loader-2"
										class="h-4 w-4 animate-spin"
									/>
									<UIcon
										v-else
										name="i-lucide-search"
										class="h-4 w-4"
									/>
									Search
								</UButton>
							</form>

							<p
								v-if="browser.searchError.value"
								class="text-sm text-destructive"
							>
								{{ browser.searchError.value }}
							</p>

							<!-- Split View -->
							<div class="flex gap-4 h-[50vh]">
								<!-- Left Panel - Search Results -->
								<div class="w-1/2 border rounded-lg p-2">
									<SourcesSerieSearchResults
										:results="browser.results.value"
										:selected-id="browser.selectedSerieId.value"
										:searching="browser.searching.value"
										:has-more="browser.hasMore.value"
										:additional-imported-ids="importedIds"
										@select="browser.selectSerie($event)"
										@navigate="handleNavigate"
										@load-more="browser.loadMore"
									/>
								</div>

								<!-- Right Panel - Detail Preview -->
								<div class="w-1/2 border rounded-lg overflow-hidden">
									<SourcesSerieDetailPanel
										:detail="browser.serieDetail.value"
										:loading="browser.loadingDetail.value"
										:has-selection="!!browser.selectedSerieId.value"
										:action-pending="isActionPending"
										:action-disabled="isActionDisabled"
										:action-label="actionLabel"
										action-loading-label="Importing..."
										:action-icon="actionIcon"
										@action="handleImport(browser.serieDetail.value!.id)"
									/>
								</div>
							</div>
						</div>
					</template>

					<template #url>
						<div class="space-y-4 p-4">
							<!-- URL Input -->
							<div class="flex gap-2">
								<UInput
									v-model="browser.urlInput.value"
									placeholder="Paste series URL (e.g., https://mangadex.org/title/...)"
									class="flex-1"
									@keydown.enter="handleParseUrl"
								/>
								<UButton
									:disabled="browser.parsingUrl.value || !browser.urlInput.value.trim()"
									@click="handleParseUrl"
								>
									<UIcon
										v-if="browser.parsingUrl.value"
										name="i-lucide-loader-2"
										class="h-4 w-4 animate-spin"
									/>
									<UIcon
										v-else
										name="i-lucide-plus"
										class="h-4 w-4"
									/>
									Add
								</UButton>
							</div>

							<!-- CSV Upload -->
							<div class="flex items-center gap-2">
								<input
									ref="fileInputRef"
									type="file"
									accept=".csv,.txt"
									class="hidden"
									@change="handleCsvUpload"
								>
								<UButton
									variant="outline"
									:disabled="uploadingCsv"
									@click="fileInputRef?.click()"
								>
									<UIcon
										v-if="uploadingCsv"
										name="i-lucide-loader-2"
										class="h-4 w-4 animate-spin"
									/>
									<UIcon
										v-else
										name="i-lucide-upload"
										class="h-4 w-4"
									/>
									Upload CSV
								</UButton>
								<span class="text-xs text-muted-foreground">One URL per line, max 100 URLs</span>
							</div>

							<p
								v-if="browser.urlError.value"
								class="text-sm text-destructive"
							>
								{{ browser.urlError.value }}
							</p>

							<!-- Parsed URLs List -->
							<div
								v-if="parsedUrls.length > 0"
								class="space-y-2 flex-1 flex flex-col min-h-0"
							>
								<div class="flex justify-between items-center gap-2 flex-wrap">
									<span class="text-sm font-medium">URLs ({{ parsedUrls.length }})</span>
									<div class="flex items-center gap-2">
										<template v-if="importableUrls.length > 0">
											<UButton
												variant="outline"
												size="sm"
												@click="allSelected ? handleDeselectAll() : handleSelectAll()"
											>
												<template v-if="allSelected">
													<UIcon
														name="i-lucide-square"
														class="h-3 w-3 mr-1"
													/>
													Deselect all
												</template>
												<template v-else>
													<UIcon
														name="i-lucide-check-square"
														class="h-3 w-3 mr-1"
													/>
													Select all
												</template>
											</UButton>
											<UButton
												v-if="selectedCount > 0"
												size="sm"
												:disabled="importingSelected"
												@click="handleImportSelected"
											>
												<UIcon
													:name="importingSelected ? 'i-lucide-loader-2' : 'i-lucide-download'"
													class="h-3 w-3 mr-1"
													:class="{ 'animate-spin': importingSelected }"
												/>
												Import {{ selectedCount }} selected
											</UButton>
										</template>
										<UButton
											variant="ghost"
											size="sm"
											@click="handleClearUrls"
										>
											Clear all
										</UButton>
									</div>
								</div>

								<div class="flex-1 min-h-0 overflow-y-auto max-h-[50vh]">
									<div class="space-y-2 pr-4">
										<div
											v-for="(item, idx) in parsedUrls"
											:key="`${item.url}-${idx}`"
											class="flex items-center gap-3 p-3 rounded-lg border"
											:class="item.result.success ? 'bg-background' : 'bg-red-50 border-red-200'"
										>
											<!-- Checkbox for selectable items -->
											<button
												v-if="item.result.success && !item.result.imported"
												type="button"
												class="shrink-0 cursor-pointer"
												@click="handleToggleSelect(item.url)"
											>
												<UIcon
													:name="item.selected ? 'i-lucide-check-square' : 'i-lucide-square'"
													:class="item.selected ? 'text-primary' : 'text-muted-foreground'"
													class="h-5 w-5"
												/>
											</button>

											<div class="min-w-0 flex-1">
												<p class="text-sm truncate">
													{{ item.url }}
												</p>
												<p
													v-if="item.result.success"
													class="text-xs text-muted-foreground truncate"
												>
													{{ item.result.sourceName }} &bull; {{ item.result.serieId }}
												</p>
												<p
													v-else
													class="text-xs text-destructive flex items-center gap-1"
												>
													<UIcon
														name="i-lucide-alert-circle"
														class="h-3 w-3 shrink-0"
													/>
													<span class="truncate">{{ item.result.error }}</span>
												</p>
											</div>

											<div class="flex items-center gap-1 shrink-0">
												<template v-if="item.result.success">
													<UButton
														v-if="item.result.imported"
														size="sm"
														variant="outline"
														@click="item.result.existingSerieId && (router.push(`/series/${item.result.existingSerieId}`), open = false)"
													>
														<UIcon
															name="i-lucide-check"
															class="h-3 w-3"
														/>
														Saved
													</UButton>
													<UButton
														v-else
														size="sm"
														:disabled="item.importing"
														@click="handleImportFromUrl(item)"
													>
														<UIcon
															:name="item.importing ? 'i-lucide-loader-2' : 'i-lucide-download'"
															class="h-3 w-3"
															:class="{ 'animate-spin': item.importing }"
														/>
													</UButton>
												</template>
												<UButton
													size="sm"
													variant="ghost"
													@click="handleRemoveUrl(item.url)"
												>
													<UIcon
														name="i-lucide-x"
														class="h-3 w-3"
													/>
												</UButton>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</template>
				</UTabs>
			</UCard>
		</template>
	</UModal>
</template>
