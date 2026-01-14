<script setup lang="ts">
import type { SelectedSerie } from "~/composables/useImportWizard"
import { useImportWizardInjected } from "~/composables/useImportWizard"

const wizard = useImportWizardInjected()

// Track selected item for desktop panel
const selectedKey = ref<string | null>(null)

const selectedSerie = computed(() => {
	if (!selectedKey.value) return null
	return wizard.cartItems.value.find(s => getCartKey(s.sourceId, s.externalId) === selectedKey.value) || null
})

function getCartKey(sourceId: string, externalId: string): string {
	return `${sourceId}:${externalId}`
}

function selectSerie(serie: SelectedSerie) {
	selectedKey.value = getCartKey(serie.sourceId, serie.externalId)
}

function handleSetAction(action: "import" | "link", linkTo?: string, linkToTitle?: string, linkToCover?: string | null) {
	if (!selectedSerie.value) return
	wizard.setAction(selectedSerie.value.sourceId, selectedSerie.value.externalId, action, linkTo, linkToTitle, linkToCover)
}

function handleRemove() {
	if (!selectedSerie.value) return
	const key = selectedKey.value
	wizard.removeFromCart(selectedSerie.value.sourceId, selectedSerie.value.externalId)
	// Select next item or clear selection
	if (wizard.cartItems.value.length > 0) {
		const idx = wizard.cartItems.value.findIndex(s => getCartKey(s.sourceId, s.externalId) === key)
		const nextIdx = Math.min(idx, wizard.cartItems.value.length - 1)
		const nextItem = wizard.cartItems.value[nextIdx]
		if (nextIdx >= 0 && nextItem) {
			selectedKey.value = getCartKey(nextItem.sourceId, nextItem.externalId)
		}
	}
	else {
		selectedKey.value = null
	}
}

function handleOpenLibrarySearch() {
	if (!selectedSerie.value) return
	wizard.openLibrarySearch(getCartKey(selectedSerie.value.sourceId, selectedSerie.value.externalId))
}

// Auto-select first item when entering step
watch(() => wizard.cartItems.value, (items) => {
	const firstItem = items[0]
	if (items.length > 0 && !selectedKey.value && firstItem) {
		selectedKey.value = getCartKey(firstItem.sourceId, firstItem.externalId)
	}
}, { immediate: true })
</script>

<template>
	<div class="h-full flex flex-col min-h-0">
		<!-- Loading similarities -->
		<div
			v-if="wizard.loadingSimilarities.value"
			class="flex items-center justify-center py-12 gap-2"
		>
			<UIcon
				name="i-lucide-loader-2"
				class="w-6 h-6 animate-spin"
			/>
			<span class="text-muted-foreground">Checking for duplicates...</span>
		</div>

		<!-- Main content with split panel -->
		<template v-else>
			<div class="flex-1 flex gap-6 min-h-0">
				<!-- Left: Grid of compact cards (desktop) / Full cards (mobile) -->
				<div class="flex-1 min-w-0 flex flex-col min-h-0">
					<div class="flex-1 overflow-y-auto min-h-0">
						<!-- Desktop: Grid of compact cards -->
						<div class="hidden lg:grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
							<ImporterSharedReviewItemCompact
								v-for="serie in wizard.cartItems.value"
								:key="getCartKey(serie.sourceId, serie.externalId)"
								:serie="serie"
								:selected="selectedKey === getCartKey(serie.sourceId, serie.externalId)"
								@click="selectSerie(serie)"
							/>
						</div>

						<!-- Mobile: Full stacked cards -->
						<div class="lg:hidden space-y-4">
							<ImporterSharedReviewItemCard
								v-for="serie in wizard.cartItems.value"
								:key="getCartKey(serie.sourceId, serie.externalId)"
								:serie="serie"
								@set-action="(action: 'import' | 'link', linkTo?: string, linkToTitle?: string, linkToCover?: string | null) => wizard.setAction(serie.sourceId, serie.externalId, action, linkTo, linkToTitle, linkToCover)"
								@remove="wizard.removeFromCart(serie.sourceId, serie.externalId)"
								@open-library-search="wizard.openLibrarySearch(getCartKey(serie.sourceId, serie.externalId))"
							/>
						</div>
					</div>

					<!-- Footer -->
					<div class="flex-shrink-0 pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
						<UButton
							variant="outline"
							@click="wizard.goBackFromReview()"
						>
							<UIcon
								name="i-lucide-arrow-left"
								class="w-4 h-4 mr-2"
							/>
							Back
						</UButton>
						<div class="flex items-center gap-3">
							<span
								v-if="!wizard.allDecisionsMade.value"
								class="text-sm text-destructive hidden sm:inline"
							>
								Configure all series
							</span>
							<UButton
								:disabled="!wizard.allDecisionsMade.value"
								@click="wizard.confirmImport()"
							>
								Confirm Import ({{ wizard.cartCount.value }})
								<UIcon
									name="i-lucide-arrow-right"
									class="w-4 h-4 ml-2"
								/>
							</UButton>
						</div>
					</div>
				</div>

				<!-- Right: Action Panel (desktop only) -->
				<div class="hidden lg:block w-80 xl:w-96 flex-shrink-0 border-l border-border -mr-4 -my-4">
					<ImporterSharedReviewActionPanel
						:key="selectedKey ?? 'none'"
						:serie="selectedSerie"
						:has-selection="selectedKey !== null"
						@set-action="handleSetAction"
						@remove="handleRemove"
						@open-library-search="handleOpenLibrarySearch"
					/>
				</div>
			</div>
		</template>
	</div>
</template>
