<script setup lang="ts">
definePageMeta({
	layout: "default",
	middleware: "import-guard",
})

const route = useRoute()
const router = useRouter()
const cart = useImportCart()
const browse = useImportBrowse()

const sourceId = computed(() => route.params.sourceId as string)
const source = computed(() => browse.getSourceById(sourceId.value))

const searchInput = ref("")
const searchTimeout = ref<NodeJS.Timeout | null>(null)
const selectedResultId = ref<string | null>(null)
const mobileSheetOpen = ref(false)
const searchFocused = ref(false)

// Scroll area + infinite scroll sentinel
const resultsAreaRef = ref<HTMLElement | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)

// Hydrate cart on mount
onMounted(async () => {
	cart.hydrateFromStorage()

	// Ensure sources are loaded
	if (browse.sources.value.length === 0) {
		await browse.fetchSources()
	}

	// Reset search state
	browse.resetSearch()

	// Auto-fetch popular/latest
	browse.fetchSearchResults(sourceId.value, "", 1, false)
})

onMounted(() => {
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries[0]?.isIntersecting && browse.hasMore.value && !browse.searching.value) {
				browse.loadMore(sourceId.value)
			}
		},
		{ root: resultsAreaRef.value, rootMargin: "200px" },
	)

	watch(sentinelRef, (el, _, onCleanup) => {
		if (el) observer.observe(el)
		onCleanup(() => {
			if (el) observer.unobserve(el)
		})
	}, { immediate: true })

	onUnmounted(() => observer.disconnect())
})

onUnmounted(() => {
	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value)
	}
})

function handleSearchInput(value: string) {
	searchInput.value = value
	browse.searchQuery.value = value

	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value)
	}
	searchTimeout.value = setTimeout(() => {
		browse.search(sourceId.value)
	}, 300)
}

function handleResultClick(result: { id: string, title: string, cover: string | null, imported: boolean }) {
	if (result.imported) return

	selectedResultId.value = result.id
	browse.fetchDetail(sourceId.value, result.id)

	// Open mobile sheet on smaller screens
	if (window.innerWidth < 1024) {
		mobileSheetOpen.value = true
	}
}

function handlePanelToggle() {
	if (!browse.selectedSerieDetail.value || !source.value) return

	cart.toggleSelection({
		sourceId: source.value.id,
		sourceName: source.value.name,
		externalId: browse.selectedSerieDetail.value.id,
		title: browse.selectedSerieDetail.value.title,
		cover: browse.selectedSerieDetail.value.cover,
		type: browse.selectedSerieDetail.value.type,
		status: browse.selectedSerieDetail.value.status,
	})
}
</script>

<template>
	<div class="browse-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UiPageHeader
					:title="source?.name || 'Browse'"
					description="Search and select series to import"
					back-to="/dashboard/series/import/browse"
				>
					<template #right>
						<ImporterSharedCartBadge
							v-if="cart.cartCount.value > 0"
							:count="cart.cartCount.value"
							@click="router.push('/dashboard/series/import/review')"
						/>
						<UButton
							icon="i-lucide-x"
							variant="ghost"
							size="sm"
							@click="router.push('/dashboard/series')"
						/>
					</template>
				</UiPageHeader>
			</template>

			<template #body>
				<div class="browse-layout">
					<!-- Left: Search and Results -->
					<div class="browse-main">
						<!-- Search Input -->
						<div class="search-container">
							<div
								class="search-input-wrapper"
								:class="{ 'is-focused': searchFocused, 'is-searching': browse.searching.value }"
							>
								<UIcon
									name="i-lucide-search"
									class="search-icon"
								/>
								<input
									v-model="searchInput"
									type="text"
									class="search-input"
									:placeholder="`Search ${source?.name || 'series'}...`"
									@input="handleSearchInput(($event.target as HTMLInputElement).value)"
									@focus="searchFocused = true"
									@blur="searchFocused = false"
									@keydown.enter="browse.search(sourceId)"
								>
								<button
									v-if="searchInput"
									class="search-clear"
									type="button"
									@click="handleSearchInput('')"
								>
									<UIcon
										name="i-lucide-x"
										class="clear-icon"
									/>
								</button>
								<div class="search-border" />
								<div class="search-glow" />
							</div>
							<div
								v-if="browse.searching.value"
								class="search-progress"
							/>
						</div>

						<!-- Error -->
						<div
							v-if="browse.searchError.value"
							class="search-error"
						>
							{{ browse.searchError.value }}
						</div>

						<!-- Results Area -->
						<div
							ref="resultsAreaRef"
							class="results-area"
						>
							<!-- Loading -->
							<SeriesGridSkeleton
								v-if="browse.searching.value && browse.searchResults.value.length === 0"
								:count="12"
								compact
							/>

							<!-- Virtualized Results Grid -->
							<template v-else-if="browse.searchResults.value.length > 0">
								<SeriesGrid compact>
									<SeriesImportSeriesCard
										v-for="result in browse.searchResults.value"
										:key="result.id"
										:title="result.title"
										:cover="result.cover"
										:selected="cart.isInCart(sourceId, result.id)"
										:imported="result.imported"
										@click="handleResultClick(result)"
									/>
								</SeriesGrid>

								<!-- Sentinel for infinite scroll -->
								<div
									v-if="browse.hasMore.value || browse.searching.value"
									ref="sentinelRef"
									class="scroll-sentinel"
								>
									<div
										v-if="browse.searching.value"
										class="loading-more"
									>
										<UIcon
											name="i-lucide-loader-2"
											class="loading-spinner"
										/>
									</div>
								</div>
							</template>

							<!-- Empty State -->
							<div
								v-else
								class="empty-state"
							>
								<UIcon
									name="i-lucide-search"
									class="empty-icon"
								/>
								<p class="empty-text">
									Search for series to import
								</p>
							</div>
						</div>

						<!-- Footer -->
						<div class="browse-footer">
							<UButton
								variant="outline"
								@click="router.push('/dashboard/series/import/browse')"
							>
								<UIcon
									name="i-lucide-arrow-left"
									class="w-4 h-4 mr-2"
								/>
								Sources
							</UButton>
							<UButton
								:disabled="cart.cartCount.value === 0"
								@click="router.push('/dashboard/series/import/review')"
							>
								Review ({{ cart.cartCount.value }})
								<UIcon
									name="i-lucide-arrow-right"
									class="w-4 h-4 ml-2"
								/>
							</UButton>
						</div>
					</div>

					<!-- Right: Detail Panel (desktop only) -->
					<div class="browse-panel hidden lg:block">
						<ImporterSharedSerieDetailPanel
							:detail="browse.selectedSerieDetail.value"
							:loading="browse.loadingDetail.value"
							:source-id="sourceId"
							:source-name="source?.name"
							:is-in-cart="browse.selectedSerieDetail.value ? cart.isInCart(sourceId, browse.selectedSerieDetail.value.id) : false"
							:has-selection="selectedResultId !== null"
							@toggle="handlePanelToggle"
						/>
					</div>
				</div>
			</template>
		</UDashboardPanel>

		<!-- Mobile Detail Sheet -->
		<ImporterSharedSerieDetailSheet
			v-model:open="mobileSheetOpen"
			:detail="browse.selectedSerieDetail.value"
			:loading="browse.loadingDetail.value"
			:source-id="sourceId"
			:source-name="source?.name"
			:is-in-cart="browse.selectedSerieDetail.value ? cart.isInCart(sourceId, browse.selectedSerieDetail.value.id) : false"
			@toggle="handlePanelToggle"
			@close="mobileSheetOpen = false"
		/>
	</div>
</template>

<style scoped>
.browse-layout {
	display: flex;
	flex: 1;
	gap: 1.5rem;
	min-height: 0;
}

.browse-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

/* Search Input */
.search-container {
	flex-shrink: 0;
	margin-bottom: 1rem;
	position: relative;
}

.search-input-wrapper {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0 1rem;
	height: 3rem;
	background: var(--ui-bg-elevated);
	border-radius: 0.5rem;
	transition: background-color 0.2s ease;
}

.search-input-wrapper:hover {
	background: var(--ui-bg-muted);
}

.search-input-wrapper.is-focused {
	background: var(--ui-bg-muted);
}

.search-border {
	position: absolute;
	inset: 0;
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	pointer-events: none;
	transition: border-color 0.2s ease;
}

.search-input-wrapper.is-focused .search-border {
	border-color: var(--ui-primary);
}

.search-glow {
	position: absolute;
	inset: -1px;
	background: var(--ui-primary);
	opacity: 0;
	border-radius: 0.5rem;
	pointer-events: none;
	filter: blur(8px);
	transition: opacity 0.3s ease;
	z-index: -1;
}

.search-input-wrapper.is-focused .search-glow {
	opacity: 0.15;
}

.search-icon {
	width: 1.125rem;
	height: 1.125rem;
	color: var(--ui-text-dimmed);
	flex-shrink: 0;
	transition: color 0.2s ease, transform 0.2s ease;
}

.search-input-wrapper.is-focused .search-icon {
	color: var(--ui-primary);
}

.search-input-wrapper.is-searching .search-icon {
	animation: pulse-search 1s ease infinite;
}

@keyframes pulse-search {
	0%, 100% {
		opacity: 1;
		transform: scale(1);
	}
	50% {
		opacity: 0.5;
		transform: scale(0.9);
	}
}

.search-input {
	flex: 1;
	min-width: 0;
	height: 100%;
	padding: 0;
	font-size: var(--font-size-base);
	font-weight: 500;
	color: var(--ui-text);
	background: transparent;
	border: none;
	outline: none;
}

.search-input::placeholder {
	color: var(--ui-text-dimmed);
	font-weight: 400;
}

.search-clear {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.5rem;
	height: 1.5rem;
	padding: 0;
	background: var(--ui-bg-muted);
	border: none;
	border-radius: 50%;
	cursor: pointer;
	flex-shrink: 0;
	transition: background-color 0.15s ease, transform 0.15s ease;
}

.search-clear:hover {
	background: color-mix(in oklch, var(--ui-text-muted) 20%, transparent);
	transform: scale(1.1);
}

.search-clear:active {
	transform: scale(0.95);
}

.clear-icon {
	width: 0.75rem;
	height: 0.75rem;
	color: var(--ui-text-muted);
}

.search-progress {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 2px;
	background: linear-gradient(
		90deg,
		transparent,
		var(--ui-primary),
		transparent
	);
	background-size: 200% 100%;
	animation: search-loading 1.5s ease infinite;
}

@keyframes search-loading {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}

.search-error {
	flex-shrink: 0;
	padding: 0.75rem;
	margin-bottom: 1rem;
	font-size: var(--font-size-sm);
	color: var(--ui-error);
	background: var(--ui-error-soft);
	border-radius: 0.5rem;
}

.results-area {
	flex: 1;
	overflow-y: auto;
	min-height: 0;
}

/* Infinite scroll */
.scroll-sentinel {
	height: 1px;
}

.loading-more {
	display: flex;
	justify-content: center;
	padding: 2rem 0;
}

.loading-spinner {
	width: 1.5rem;
	height: 1.5rem;
	color: var(--ui-primary);
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	text-align: center;
}

.empty-icon {
	width: 2.5rem;
	height: 2.5rem;
	color: var(--ui-text-dimmed);
	opacity: 0.5;
	margin-bottom: 0.75rem;
}

.empty-text {
	font-size: var(--font-size-base);
	color: var(--ui-text-muted);
	margin: 0;
}

.browse-footer {
	flex-shrink: 0;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-top: 1rem;
	margin-top: 1rem;
	border-top: 1px solid var(--ui-border);
}

.browse-panel {
	width: 20rem;
	flex-shrink: 0;
	border-left: 1px solid var(--ui-border);
	margin: -1rem -1rem -1rem 0;
}

@media (min-width: 1280px) {
	.browse-panel {
		width: 24rem;
	}
}
</style>
