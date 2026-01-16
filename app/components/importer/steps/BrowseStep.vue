<script setup lang="ts">
import { useImportWizardInjected } from "~/composables/useImportWizard"

const wizard = useImportWizardInjected()

const searchInput = ref("")
const searchTimeout = ref<NodeJS.Timeout | null>(null)

// Track selected card for desktop panel
const selectedResultId = ref<string | null>(null)

function handleSearchInput(value: string) {
	searchInput.value = value
	wizard.searchQuery.value = value

	// Debounce search
	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value)
	}
	searchTimeout.value = setTimeout(() => {
		wizard.search()
	}, 300)
}

function handleResultClick(result: { id: string, title: string, cover: string | null, imported: boolean }) {
	if (result.imported) return

	selectedResultId.value = result.id
	wizard.fetchDetail(result.id)
}

function handleToggle(result: { id: string, title: string, cover: string | null, imported: boolean }) {
	if (result.imported || !wizard.selectedSource.value) return

	wizard.toggleSelection({
		sourceId: wizard.selectedSource.value.id,
		sourceName: wizard.selectedSource.value.name,
		externalId: result.id,
		title: result.title,
		cover: result.cover,
		type: "",
		status: [],
	})
}

function handlePanelToggle() {
	if (!wizard.selectedSerieDetail.value || !wizard.selectedSource.value) return

	wizard.toggleSelection({
		sourceId: wizard.selectedSource.value.id,
		sourceName: wizard.selectedSource.value.name,
		externalId: wizard.selectedSerieDetail.value.id,
		title: wizard.selectedSerieDetail.value.title,
		cover: wizard.selectedSerieDetail.value.cover,
		type: wizard.selectedSerieDetail.value.type,
		status: wizard.selectedSerieDetail.value.status,
	})
}

// Check if we're on desktop
const isDesktop = ref(false)
onMounted(() => {
	isDesktop.value = window.innerWidth >= 1024
	window.addEventListener("resize", () => {
		isDesktop.value = window.innerWidth >= 1024
	})
})

onUnmounted(() => {
	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value)
	}
})
</script>

<template>
	<div class="h-full flex flex-col min-h-0">
		<!-- Main content with split panel -->
		<div class="flex-1 flex gap-6 min-h-0">
			<!-- Left: Search and Results -->
			<div class="flex-1 min-w-0 flex flex-col min-h-0">
				<!-- Search Input -->
				<div class="flex-shrink-0 mb-4">
					<UInput
						:model-value="searchInput"
						placeholder="Search series..."
						icon="i-lucide-search"
						size="lg"
						@update:model-value="handleSearchInput"
					/>
				</div>

				<!-- Error -->
				<div
					v-if="wizard.searchError.value"
					class="flex-shrink-0 p-3 bg-destructive/10 text-destructive text-sm rounded-lg mb-4"
				>
					{{ wizard.searchError.value }}
				</div>

				<!-- Results Area -->
				<div class="flex-1 overflow-y-auto min-h-0 p-0.5 -m-0.5">
					<!-- Loading -->
					<div
						v-if="wizard.searching.value && wizard.searchResults.value.length === 0"
						class="flex justify-center py-8"
					>
						<UIcon
							name="i-lucide-loader-2"
							class="w-6 h-6 animate-spin text-muted-foreground"
						/>
					</div>

					<!-- Grid Results (desktop) / List Results (mobile) -->
					<div
						v-else-if="wizard.searchResults.value.length > 0"
						class="space-y-4"
					>
						<!-- Grid for desktop -->
						<div class="hidden lg:grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
							<div
								v-for="result in wizard.searchResults.value"
								:key="result.id"
								class="group rounded-lg bg-card overflow-hidden border transition-all cursor-pointer"
								:class="[
									result.imported ? 'opacity-60 cursor-not-allowed' : 'hover:ring-1 hover:ring-primary/50',
									selectedResultId === result.id ? 'ring-2 ring-primary' : 'border-border',
									wizard.isInCart(wizard.selectedSource.value?.id || '', result.id) ? 'ring-2 ring-primary' : '',
								]"
								@click="handleResultClick(result)"
							>
								<div class="aspect-[2/3] relative bg-muted overflow-hidden">
									<NuxtImg
										v-if="result.cover"
										:src="result.cover"
										:alt="result.title"
										class="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
									/>
									<div
										v-else
										class="absolute inset-0 flex items-center justify-center"
									>
										<UIcon
											name="i-lucide-book-open"
											class="h-12 w-12 text-muted-foreground/50"
										/>
									</div>
									<!-- Selection indicator -->
									<div
										v-if="wizard.isInCart(wizard.selectedSource.value?.id || '', result.id)"
										class="absolute top-2 right-2"
									>
										<div class="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
											<UIcon
												name="i-lucide-check"
												class="w-4 h-4 text-primary-foreground"
											/>
										</div>
									</div>
									<!-- Imported indicator -->
									<div
										v-if="result.imported"
										class="absolute top-2 right-2"
									>
										<div class="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
											<UIcon
												name="i-lucide-lock"
												class="w-4 h-4 text-muted-foreground"
											/>
										</div>
									</div>
									<div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-3 pt-8">
										<p class="font-medium text-white text-sm truncate">
											{{ result.title }}
										</p>
									</div>
								</div>
							</div>
						</div>

						<!-- List for mobile -->
						<div class="lg:hidden space-y-2">
							<ImporterSharedImportSerieCard
								v-for="result in wizard.searchResults.value"
								:key="result.id"
								:title="result.title"
								:cover="result.cover"
								:imported="result.imported"
								:selected="wizard.isInCart(wizard.selectedSource.value?.id || '', result.id)"
								@click="handleResultClick(result)"
								@toggle="handleToggle(result)"
							/>
						</div>

						<!-- Load More -->
						<UButton
							v-if="wizard.hasMore.value"
							variant="outline"
							class="w-full"
							:loading="wizard.searching.value"
							@click="wizard.loadMore()"
						>
							Load More
						</UButton>
					</div>

					<!-- Empty State -->
					<div
						v-else
						class="text-center py-8 text-muted-foreground"
					>
						<UIcon
							name="i-lucide-search"
							class="w-10 h-10 mx-auto mb-3 opacity-50"
						/>
						<p>Search for series to import</p>
					</div>
				</div>

				<!-- Footer -->
				<div class="flex-shrink-0 pt-4 border-t border-border flex justify-between items-center mt-4">
					<UButton
						variant="outline"
						@click="wizard.goBackToSources()"
					>
						<UIcon
							name="i-lucide-arrow-left"
							class="w-4 h-4 mr-2"
						/>
						Sources
					</UButton>
					<UButton
						:disabled="wizard.cartCount.value === 0"
						@click="wizard.goToReview()"
					>
						Review ({{ wizard.cartCount.value }})
						<UIcon
							name="i-lucide-arrow-right"
							class="w-4 h-4 ml-2"
						/>
					</UButton>
				</div>
			</div>

			<!-- Right: Detail Panel (desktop only) -->
			<div class="hidden lg:block w-80 xl:w-96 flex-shrink-0 border-l border-border -mr-4 -my-4">
				<ImporterSharedSerieDetailPanel
					:detail="wizard.selectedSerieDetail.value"
					:loading="wizard.loadingDetail.value"
					:source-id="wizard.selectedSource.value?.id"
					:source-name="wizard.selectedSource.value?.name"
					:is-in-cart="wizard.selectedSerieDetail.value ? wizard.isInCart(wizard.selectedSource.value?.id || '', wizard.selectedSerieDetail.value.id) : false"
					:has-selection="selectedResultId !== null"
					@toggle="handlePanelToggle"
				/>
			</div>
		</div>
	</div>
</template>
