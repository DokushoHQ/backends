<script setup lang="ts">
import type { Source } from "~/composables/useSourceBrowser"

const props = defineProps<{
	serieId: string
	serieTitle: string
	linkedSourceIds: string[]
	sources: Source[]
}>()

const emit = defineEmits<{
	linked: []
}>()

const open = defineModel<boolean>("open", { default: false })

// Use shared composable
const browser = useSourceBrowser()

// Tab state
const activeTab = ref<"browse" | "url">("browse")

// Link-specific state
const isPending = ref(false)
const linkSuccess = ref(false)

// URL-specific state
const parsedUrl = ref<{ sourceId: string, sourceName: string, externalId: string } | null>(null)

// Filter out already-linked sources
const availableSources = computed(() => props.sources.filter(s => !props.linkedSourceIds.includes(s.id)))

// Tab items
const tabItems = [
	{ label: "Browse", slot: "browse", icon: "i-lucide-search" },
	{ label: "Paste URL", slot: "url", icon: "i-lucide-link" },
]

// Reset state when dialog closes
watch(open, (isOpen) => {
	if (!isOpen) {
		browser.reset()
		activeTab.value = "browse"
		isPending.value = false
		linkSuccess.value = false
		parsedUrl.value = null
	}
})

function handleBack() {
	browser.selectedSource.value = null
	browser.resetSearch()
}

async function handleLink(sourceId: string, externalId: string) {
	browser.searchError.value = null
	isPending.value = true

	try {
		const result = await $fetch(`/api/v1/serie/${props.serieId}/link-source`, {
			method: "POST",
			body: { sourceId, externalId },
		})

		if ((result as { status?: string }).status === "already_linked") {
			browser.searchError.value = "This source is already linked to this serie"
			return
		}

		linkSuccess.value = true
		setTimeout(() => {
			open.value = false
			emit("linked")
		}, 1000)
	}
	catch (e: unknown) {
		const fetchError = e as { data?: { message?: string } }
		browser.searchError.value = fetchError.data?.message || "Failed to link source"
	}
	finally {
		isPending.value = false
	}
}

async function handleParseUrl() {
	parsedUrl.value = null
	const result = await browser.parseUrl(browser.urlInput.value)

	if (!result) return

	if (!result.success) {
		browser.urlError.value = result.error
		return
	}

	// Check if this source is already linked
	if (props.linkedSourceIds.includes(result.sourceId)) {
		if (result.imported && result.existingSerieId === props.serieId) {
			browser.urlError.value = "This source entry is already linked to this serie"
			return
		}
		if (result.imported) {
			browser.urlError.value = "This source entry is already linked to a different serie"
			return
		}
	}

	parsedUrl.value = {
		sourceId: result.sourceId,
		sourceName: result.sourceName,
		externalId: result.serieId,
	}
}

function handleUrlInputChange() {
	parsedUrl.value = null
	browser.urlError.value = null
}
</script>

<template>
	<UModal
		v-model:open="open"
		:ui="{ content: 'sm:max-w-5xl w-[90vw] max-h-[85vh]' }"
	>
		<UButton
			variant="outline"
			size="sm"
			@click="open = true"
		>
			<UIcon
				name="i-lucide-link"
				class="h-4 w-4"
			/>
			<span class="hidden sm:inline">Link</span>
		</UButton>

		<template #content>
			<UCard
				class="flex flex-col max-h-[85vh]"
				:ui="{ body: 'flex-1 overflow-hidden flex flex-col min-h-0' }"
			>
				<template #header>
					<div>
						<h3 class="text-lg font-semibold">
							Link Source to Serie
						</h3>
						<p class="text-sm text-muted-foreground">
							Add another source to "{{ serieTitle.length > 50 ? `${serieTitle.slice(0, 50)}...` : serieTitle }}"
						</p>
					</div>
				</template>

				<!-- Success state -->
				<div
					v-if="linkSuccess"
					class="flex flex-col items-center justify-center py-12 gap-4"
				>
					<div class="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
						<UIcon
							name="i-lucide-check"
							class="h-8 w-8 text-green-600"
						/>
					</div>
					<p class="text-lg font-medium">
						Source linked successfully!
					</p>
					<p class="text-sm text-muted-foreground">
						Chapters are being imported...
					</p>
				</div>

				<!-- Main content -->
				<template v-else>
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
									:sources="availableSources"
									title="Select a source to link"
									empty-message="All available sources are already linked to this serie."
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
											:current-serie-id="serieId"
											@select="browser.selectSerie($event)"
											@navigate="() => {}"
											@load-more="browser.loadMore"
										/>
									</div>

									<!-- Right Panel - Detail Preview -->
									<div class="w-1/2 border rounded-lg overflow-hidden">
										<SourcesSerieDetailPanel
											:detail="browser.serieDetail.value"
											:loading="browser.loadingDetail.value"
											:has-selection="!!browser.selectedSerieId.value"
											:action-pending="isPending"
											action-label="Link this Source"
											action-loading-label="Linking..."
											action-icon="i-lucide-link"
											@action="handleLink(browser.selectedSource.value!.id, browser.serieDetail.value!.id)"
										/>
									</div>
								</div>
							</div>
						</template>

						<template #url>
							<div class="space-y-4 p-4">
								<div class="flex gap-2">
									<UInput
										v-model="browser.urlInput.value"
										placeholder="Paste series URL (e.g., https://mangadex.org/title/...)"
										class="flex-1"
										@keydown.enter="handleParseUrl"
										@update:model-value="handleUrlInputChange"
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
										Parse
									</UButton>
								</div>

								<div
									v-if="browser.urlError.value"
									class="flex items-center gap-2 text-destructive text-sm"
								>
									<UIcon
										name="i-lucide-alert-circle"
										class="h-4 w-4"
									/>
									{{ browser.urlError.value }}
								</div>

								<div
									v-if="browser.searchError.value"
									class="flex items-center gap-2 text-destructive text-sm"
								>
									<UIcon
										name="i-lucide-alert-circle"
										class="h-4 w-4"
									/>
									{{ browser.searchError.value }}
								</div>

								<div
									v-if="parsedUrl"
									class="p-4 border rounded-lg space-y-3"
								>
									<div class="flex items-center justify-between">
										<div>
											<p class="font-medium">
												Ready to link
											</p>
											<p class="text-sm text-muted-foreground">
												Source: {{ parsedUrl.sourceName }}
											</p>
											<p class="text-sm text-muted-foreground truncate">
												ID: {{ parsedUrl.externalId }}
											</p>
										</div>
									</div>
									<UButton
										class="w-full"
										:disabled="isPending"
										@click="handleLink(parsedUrl.sourceId, parsedUrl.externalId)"
									>
										<UIcon
											v-if="isPending"
											name="i-lucide-loader-2"
											class="h-4 w-4 animate-spin"
										/>
										<UIcon
											v-else
											name="i-lucide-link"
											class="h-4 w-4"
										/>
										{{ isPending ? "Linking..." : "Link Source" }}
									</UButton>
								</div>
							</div>
						</template>
					</UTabs>
				</template>
			</UCard>
		</template>
	</UModal>
</template>
