<script setup lang="ts">
import { ImportWizardKey } from "~/composables/useImportWizard"

definePageMeta({
	title: "Import Series",
})

const router = useRouter()
const wizard = useImportWizard()
provide(ImportWizardKey, wizard)

const showExitWarning = ref(false)
const isDesktop = ref(false)

const stepTitle = computed(() => {
	switch (wizard.step.value) {
		case "entry": return "Import Series"
		case "url-paste": return "Paste URLs"
		case "source-select": return "Select Source"
		case "browse": return wizard.selectedSource.value?.name || "Browse"
		case "review": return `Review (${wizard.cartCount.value})`
		case "processing": return "Importing..."
		default: return "Import"
	}
})

const stepDescription = computed(() => {
	switch (wizard.step.value) {
		case "entry": return "Choose how you want to add series"
		case "url-paste": return "Paste series URLs to import"
		case "source-select": return "Select a source to browse"
		case "browse": return "Search and select series to import"
		case "review": return "Review your selections before importing"
		case "processing": return "Importing your selections..."
		default: return ""
	}
})

const showCart = computed(() => {
	return wizard.step.value !== "entry"
		&& wizard.step.value !== "processing"
		&& wizard.cartCount.value > 0
})

const showBackButton = computed(() => {
	return wizard.step.value !== "processing"
})

function handleBack() {
	switch (wizard.step.value) {
		case "entry":
			attemptClose()
			break
		case "url-paste":
		case "source-select":
			wizard.goToEntry()
			break
		case "browse":
			wizard.goBackToSources()
			break
		case "review":
			wizard.goBackFromReview()
			break
	}
}

function attemptClose() {
	if (wizard.cartCount.value > 0 && wizard.step.value !== "processing") {
		showExitWarning.value = true
	}
	else {
		closeWizard()
	}
}

function closeWizard() {
	showExitWarning.value = false
	wizard.reset()
	router.push("/series")
}

function discardAndClose() {
	showExitWarning.value = false
	closeWizard()
}

// Check screen size for responsive behavior
function updateIsDesktop() {
	isDesktop.value = window.innerWidth >= 1024
}

// Fetch sources on mount
onMounted(() => {
	updateIsDesktop()
	window.addEventListener("resize", updateIsDesktop)

	if (wizard.sources.value.length === 0) {
		wizard.fetchSources()
	}
})

onUnmounted(() => {
	window.removeEventListener("resize", updateIsDesktop)
})
</script>

<template>
	<div class="flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UDashboardNavbar
					:title="stepTitle"
					:description="stepDescription"
				>
					<template #leading>
						<UButton
							v-if="showBackButton"
							icon="i-lucide-arrow-left"
							variant="ghost"
							size="sm"
							@click="handleBack"
						/>
					</template>
					<template #right>
						<div class="flex items-center gap-2">
							<ImporterSharedCartBadge
								v-if="showCart"
								:count="wizard.cartCount.value"
								@click="wizard.goToReview()"
							/>
							<UButton
								icon="i-lucide-x"
								variant="ghost"
								size="sm"
								@click="attemptClose"
							/>
						</div>
					</template>
				</UDashboardNavbar>
			</template>

			<template #body>
				<ImporterStepsEntryStep v-if="wizard.step.value === 'entry'" />
				<ImporterStepsUrlPasteStep v-else-if="wizard.step.value === 'url-paste'" />
				<ImporterStepsSourceSelectStep v-else-if="wizard.step.value === 'source-select'" />
				<ImporterStepsBrowseStep v-else-if="wizard.step.value === 'browse'" />
				<ImporterStepsReviewStep v-else-if="wizard.step.value === 'review'" />
				<ImporterStepsProcessingStep
					v-else-if="wizard.step.value === 'processing'"
					@close="closeWizard"
				/>
			</template>
		</UDashboardPanel>

		<!-- Exit Warning Dialog -->
		<UModal v-model:open="showExitWarning">
			<template #content>
				<UCard>
					<template #header>
						<h3 class="text-lg font-semibold">
							Discard Selection?
						</h3>
					</template>

					<p class="text-muted-foreground">
						You have {{ wizard.cartCount.value }} series selected.
						Leaving will discard your selection.
					</p>

					<template #footer>
						<div class="flex justify-end gap-2">
							<UButton
								variant="outline"
								@click="showExitWarning = false"
							>
								Cancel
							</UButton>
							<UButton
								color="error"
								@click="discardAndClose"
							>
								Discard
							</UButton>
						</div>
					</template>
				</UCard>
			</template>
		</UModal>

		<!-- Detail Sheet (mobile only) -->
		<ImporterSharedSerieDetailSheet
			v-if="!isDesktop"
			v-model:open="wizard.showDetailSheet.value"
			:detail="wizard.selectedSerieDetail.value"
			:loading="wizard.loadingDetail.value"
			:source-id="wizard.selectedSource.value?.id"
			:source-name="wizard.selectedSource.value?.name"
			:is-in-cart="wizard.selectedSerieDetail.value ? wizard.isInCart(wizard.selectedSource.value?.id || '', wizard.selectedSerieDetail.value.id) : false"
			@toggle="wizard.selectedSerieDetail.value && wizard.selectedSource.value && wizard.toggleSelection({
				sourceId: wizard.selectedSource.value.id,
				sourceName: wizard.selectedSource.value.name,
				externalId: wizard.selectedSerieDetail.value.id,
				title: wizard.selectedSerieDetail.value.title,
				cover: wizard.selectedSerieDetail.value.cover,
				type: wizard.selectedSerieDetail.value.type,
				status: wizard.selectedSerieDetail.value.status,
			})"
			@close="wizard.closeDetailSheet()"
		/>

		<!-- Library Search Sheet -->
		<ImporterSharedLibrarySearchSheet
			v-model:open="wizard.showLibrarySearchSheet.value"
			:search-query="wizard.librarySearchQuery.value"
			:search-results="wizard.librarySearchResults.value"
			:recent-series="wizard.recentSeries.value"
			:loading-search="wizard.loadingLibrarySearch.value"
			:loading-recent="wizard.loadingRecentSeries.value"
			@update:search-query="wizard.librarySearchQuery.value = $event"
			@search="wizard.searchLibrary($event)"
			@select="(id, title, cover) => wizard.selectLibrarySerie(id, title, cover)"
			@close="wizard.closeLibrarySearch()"
		/>
	</div>
</template>
