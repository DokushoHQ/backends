<script setup lang="ts">
import type { SelectedSerie } from "~/composables/useImportCart"

definePageMeta({
	layout: "default",
	middleware: "import-guard",
})

const router = useRouter()
const cart = useImportCart()
const review = useImportReview()

// Track selected item for desktop panel
const selectedKey = ref<string | null>(null)

// Section collapse state (all expanded by default)
const sectionsExpanded = ref({
	cartDuplicates: true,
	libraryDuplicates: true,
	clean: true,
})

function toggleSection(section: keyof typeof sectionsExpanded.value) {
	sectionsExpanded.value[section] = !sectionsExpanded.value[section]
}

const selectedSerie = computed(() => {
	if (!selectedKey.value) return null
	return cart.cartItems.value.find(s => cart.getCartKey(s.sourceId, s.externalId) === selectedKey.value) || null
})

function selectSerie(serie: SelectedSerie) {
	selectedKey.value = cart.getCartKey(serie.sourceId, serie.externalId)
}

function handleSetAction(action: "import" | "link", linkTo?: string, linkToTitle?: string, linkToCover?: string | null) {
	if (!selectedSerie.value) return
	review.setAction(selectedSerie.value.sourceId, selectedSerie.value.externalId, action, linkTo, linkToTitle, linkToCover)
}

function handleRemove() {
	if (!selectedSerie.value) return
	const key = selectedKey.value
	cart.removeFromCart(selectedSerie.value.sourceId, selectedSerie.value.externalId)
	// Select next item or clear selection
	if (cart.cartItems.value.length > 0) {
		const idx = cart.cartItems.value.findIndex(s => cart.getCartKey(s.sourceId, s.externalId) === key)
		const nextIdx = Math.min(idx, cart.cartItems.value.length - 1)
		const nextItem = cart.cartItems.value[nextIdx]
		if (nextIdx >= 0 && nextItem) {
			selectedKey.value = cart.getCartKey(nextItem.sourceId, nextItem.externalId)
		}
	}
	else {
		selectedKey.value = null
	}
}

function handleOpenLibrarySearch() {
	if (!selectedSerie.value) return
	review.openLibrarySearch(cart.getCartKey(selectedSerie.value.sourceId, selectedSerie.value.externalId))
}

function handleSetGroupPrimary(cartKey: string) {
	cart.setGroupPrimary(cartKey)
}

function handleConfirmImport() {
	router.push("/series/import/processing")
}

// Initialize
onMounted(async () => {
	cart.hydrateFromStorage()

	// Auto-select first item
	const firstItem = cart.cartItems.value[0]
	if (firstItem) {
		selectedKey.value = cart.getCartKey(firstItem.sourceId, firstItem.externalId)
	}

	// Fetch similarities
	await review.fetchSimilaritiesForCart()
})

// Auto-select first item when cart changes
watch(() => cart.cartItems.value, (items) => {
	const firstItem = items[0]
	if (items.length > 0 && !selectedKey.value && firstItem) {
		selectedKey.value = cart.getCartKey(firstItem.sourceId, firstItem.externalId)
	}
})
</script>

<template>
	<div class="review-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UDashboardNavbar
					title="Review Selection"
					description="Review before importing"
				>
					<template #leading>
						<UButton
							icon="i-lucide-arrow-left"
							variant="ghost"
							size="sm"
							@click="router.push('/series/import')"
						/>
					</template>
					<template #right>
						<ImporterSharedCartBadge
							v-if="cart.cartCount.value > 0"
							:count="cart.cartCount.value"
							@click="router.push('/series/import/review')"
						/>
					</template>
				</UDashboardNavbar>
			</template>

			<template #body>
				<!-- Loading similarities -->
				<div
					v-if="review.loadingSimilarities.value"
					class="loading-state"
				>
					<UIcon
						name="i-lucide-loader-2"
						class="loading-spinner"
					/>
					<span class="loading-text">Checking for duplicates...</span>
				</div>

				<!-- Main content -->
				<template v-else>
					<div class="review-layout">
						<!-- Left: Categorized list -->
						<div class="review-main">
							<div class="review-content">
								<!-- Cart Duplicates Section -->
								<section
									v-if="review.cartDuplicateItems.value.length > 0"
									class="review-section"
								>
									<button
										type="button"
										class="section-header section-header--warning"
										@click="toggleSection('cartDuplicates')"
									>
										<UIcon
											name="i-lucide-chevron-right"
											class="section-chevron"
											:class="{ 'section-chevron--open': sectionsExpanded.cartDuplicates }"
										/>
										<UIcon
											name="i-lucide-copy"
											class="section-icon"
										/>
										<h3 class="section-title">
											Duplicates in your selection ({{ review.cartDuplicateItems.value.length }})
										</h3>
									</button>
									<div
										v-show="sectionsExpanded.cartDuplicates"
										class="section-content"
									>
										<p class="section-description">
											These appear to be the same series from different sources. Choose which becomes primary.
										</p>
										<!-- Desktop: Grid -->
										<div class="review-grid hidden lg:grid">
											<ImporterSharedReviewItemCompact
												v-for="serie in review.cartDuplicateItems.value"
												:key="cart.getCartKey(serie.sourceId, serie.externalId)"
												:serie="serie"
												:selected="selectedKey === cart.getCartKey(serie.sourceId, serie.externalId)"
												@click="selectSerie(serie)"
											/>
										</div>
										<!-- Mobile: Full cards -->
										<div class="lg:hidden space-y-3">
											<ImporterSharedReviewItemCard
												v-for="serie in review.cartDuplicateItems.value"
												:key="cart.getCartKey(serie.sourceId, serie.externalId)"
												:serie="serie"
												@set-action="(action: 'import' | 'link', linkTo?: string, linkToTitle?: string, linkToCover?: string | null) => review.setAction(serie.sourceId, serie.externalId, action, linkTo, linkToTitle, linkToCover)"
												@remove="cart.removeFromCart(serie.sourceId, serie.externalId)"
												@open-library-search="review.openLibrarySearch(cart.getCartKey(serie.sourceId, serie.externalId))"
												@set-group-primary="handleSetGroupPrimary"
											/>
										</div>
									</div>
								</section>

								<!-- Library Duplicates Section -->
								<section
									v-if="review.libraryDuplicateItems.value.length > 0"
									class="review-section"
								>
									<button
										type="button"
										class="section-header section-header--amber"
										@click="toggleSection('libraryDuplicates')"
									>
										<UIcon
											name="i-lucide-chevron-right"
											class="section-chevron"
											:class="{ 'section-chevron--open': sectionsExpanded.libraryDuplicates }"
										/>
										<UIcon
											name="i-lucide-alert-triangle"
											class="section-icon"
										/>
										<h3 class="section-title">
											Matches in your library ({{ review.libraryDuplicateItems.value.length }})
										</h3>
									</button>
									<div
										v-show="sectionsExpanded.libraryDuplicates"
										class="section-content"
									>
										<p class="section-description">
											These may already exist in your library. Choose to link or import as new.
										</p>
										<!-- Desktop: Grid -->
										<div class="review-grid hidden lg:grid">
											<ImporterSharedReviewItemCompact
												v-for="serie in review.libraryDuplicateItems.value"
												:key="cart.getCartKey(serie.sourceId, serie.externalId)"
												:serie="serie"
												:selected="selectedKey === cart.getCartKey(serie.sourceId, serie.externalId)"
												@click="selectSerie(serie)"
											/>
										</div>
										<!-- Mobile: Full cards -->
										<div class="lg:hidden space-y-3">
											<ImporterSharedReviewItemCard
												v-for="serie in review.libraryDuplicateItems.value"
												:key="cart.getCartKey(serie.sourceId, serie.externalId)"
												:serie="serie"
												@set-action="(action: 'import' | 'link', linkTo?: string, linkToTitle?: string, linkToCover?: string | null) => review.setAction(serie.sourceId, serie.externalId, action, linkTo, linkToTitle, linkToCover)"
												@remove="cart.removeFromCart(serie.sourceId, serie.externalId)"
												@open-library-search="review.openLibrarySearch(cart.getCartKey(serie.sourceId, serie.externalId))"
											/>
										</div>
									</div>
								</section>

								<!-- Clean Items Section -->
								<section
									v-if="review.cleanItems.value.length > 0"
									class="review-section"
								>
									<button
										type="button"
										class="section-header section-header--success"
										@click="toggleSection('clean')"
									>
										<UIcon
											name="i-lucide-chevron-right"
											class="section-chevron"
											:class="{ 'section-chevron--open': sectionsExpanded.clean }"
										/>
										<UIcon
											name="i-lucide-check-circle"
											class="section-icon"
										/>
										<h3 class="section-title">
											Ready to import ({{ review.cleanItems.value.length }})
										</h3>
									</button>
									<div
										v-show="sectionsExpanded.clean"
										class="section-content"
									>
										<!-- Desktop: Grid -->
										<div class="review-grid hidden lg:grid">
											<ImporterSharedReviewItemCompact
												v-for="serie in review.cleanItems.value"
												:key="cart.getCartKey(serie.sourceId, serie.externalId)"
												:serie="serie"
												:selected="selectedKey === cart.getCartKey(serie.sourceId, serie.externalId)"
												@click="selectSerie(serie)"
											/>
										</div>
										<!-- Mobile: Full cards -->
										<div class="lg:hidden space-y-3">
											<ImporterSharedReviewItemCard
												v-for="serie in review.cleanItems.value"
												:key="cart.getCartKey(serie.sourceId, serie.externalId)"
												:serie="serie"
												@set-action="(action: 'import' | 'link', linkTo?: string, linkToTitle?: string, linkToCover?: string | null) => review.setAction(serie.sourceId, serie.externalId, action, linkTo, linkToTitle, linkToCover)"
												@remove="cart.removeFromCart(serie.sourceId, serie.externalId)"
												@open-library-search="review.openLibrarySearch(cart.getCartKey(serie.sourceId, serie.externalId))"
											/>
										</div>
									</div>
								</section>
							</div>

							<!-- Footer -->
							<div class="review-footer">
								<UButton
									variant="outline"
									class="hidden sm:inline-flex"
									@click="router.push('/series/import')"
								>
									<UIcon
										name="i-lucide-arrow-left"
										class="w-4 h-4 mr-2"
									/>
									Back
								</UButton>
								<span
									v-if="!cart.allDecisionsMade.value"
									class="footer-warning"
								>
									Configure all series
								</span>
								<UButton
									class="confirm-btn"
									:disabled="!cart.allDecisionsMade.value"
									@click="handleConfirmImport"
								>
									Confirm Import ({{ cart.cartCount.value }})
									<UIcon
										name="i-lucide-arrow-right"
										class="w-4 h-4 ml-2"
									/>
								</UButton>
							</div>
						</div>

						<!-- Right: Action Panel (desktop only) -->
						<div class="review-panel hidden lg:block">
							<ImporterSharedReviewActionPanel
								:key="selectedKey ?? 'none'"
								:serie="selectedSerie"
								:has-selection="selectedKey !== null"
								@set-action="handleSetAction"
								@remove="handleRemove"
								@open-library-search="handleOpenLibrarySearch"
								@set-group-primary="handleSetGroupPrimary"
							/>
						</div>
					</div>
				</template>

				<!-- Library Search Sheet -->
				<ImporterSharedLibrarySearchSheet
					v-model:open="review.showLibrarySearchSheet.value"
					:search-query="review.librarySearchQuery.value"
					:search-results="review.librarySearchResults.value"
					:recent-series="review.recentSeries.value"
					:loading-search="review.loadingLibrarySearch.value"
					:loading-recent="review.loadingRecentSeries.value"
					@update:search-query="review.librarySearchQuery.value = $event"
					@search="review.searchLibrary($event)"
					@select="(serieId: string, serieTitle: string, serieCover: string | null) => review.selectLibrarySerie(serieId, serieTitle, serieCover)"
					@close="review.closeLibrarySearch()"
				/>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
/* Loading State */
.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	padding: 3rem 1rem;
}

.loading-spinner {
	width: 1.5rem;
	height: 1.5rem;
	color: var(--ui-primary);
	animation: spin 1s linear infinite;
}

.loading-text {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Layout */
.review-layout {
	display: flex;
	flex: 1;
	gap: 1.5rem;
	min-height: 0;
}

.review-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.review-content {
	flex: 1;
	overflow-y: auto;
	min-height: 0;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

/* Section */
.review-section {
	display: flex;
	flex-direction: column;
}

.section-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0;
	margin-bottom: 0.75rem;
	background: none;
	border: none;
	cursor: pointer;
	text-align: left;
	transition: opacity 0.15s ease;
}

.section-header:hover {
	opacity: 0.8;
}

.section-chevron {
	width: 1rem;
	height: 1rem;
	transition: transform 0.2s ease;
}

.section-chevron--open {
	transform: rotate(90deg);
}

.section-icon {
	width: 1.25rem;
	height: 1.25rem;
}

.section-title {
	font-size: var(--font-size-base);
	font-weight: 600;
	margin: 0;
}

.section-header--warning .section-chevron,
.section-header--warning .section-icon,
.section-header--warning .section-title {
	color: var(--ui-warning);
}

.section-header--amber .section-chevron,
.section-header--amber .section-icon,
.section-header--amber .section-title {
	color: oklch(0.77 0.15 65);
}

.section-header--success .section-chevron,
.section-header--success .section-icon,
.section-header--success .section-title {
	color: var(--ui-success);
}

.section-content {
	padding-left: 1.5rem;
	padding-right: 0.5rem;
}

.section-description {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0 0 0.75rem;
}

/* Review Grid */
.review-grid {
	grid-template-columns: repeat(2, 1fr);
	column-gap: 0.75rem;
	row-gap: 1.5rem;
	padding-top: 1rem;
	align-items: start;
}

@media (min-width: 640px) {
	.review-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

@media (min-width: 768px) {
	.review-grid {
		grid-template-columns: repeat(4, 1fr);
	}
}

@media (min-width: 1024px) {
	.review-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

@media (min-width: 1280px) {
	.review-grid {
		grid-template-columns: repeat(4, 1fr);
	}
}

@media (min-width: 1536px) {
	.review-grid {
		grid-template-columns: repeat(5, 1fr);
	}
}

/* Footer */
.review-footer {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 0.75rem;
	padding-top: 1rem;
	margin-top: 1rem;
	border-top: 1px solid var(--ui-border);
}

@media (min-width: 640px) {
	.review-footer {
		justify-content: flex-start;
	}
}

.confirm-btn {
	flex-shrink: 0;
}

.footer-warning {
	display: none;
	font-size: var(--font-size-sm);
	color: var(--ui-error);
}

@media (min-width: 640px) {
	.footer-warning {
		display: inline;
		margin-left: auto;
	}
}

/* Action Panel */
.review-panel {
	width: 20rem;
	flex-shrink: 0;
	border-left: 1px solid var(--ui-border);
	margin: -1rem -1rem -1rem 0;
}

@media (min-width: 1280px) {
	.review-panel {
		width: 24rem;
	}
}
</style>
