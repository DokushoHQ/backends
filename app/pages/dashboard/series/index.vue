<script setup lang="ts">
definePageMeta({
	title: "Series",
})

const route = useRoute()
const router = useRouter()
const { isAdmin } = await useAuth()

// URL-based state (no more page param)
const searchQuery = computed(() => (route.query.q as string) || "")
const filterType = computed(() => (route.query.filter as string) || "")
const sourceFilter = computed(() => (route.query.source as string) || "")

// Metadata filters
const genreFilter = computed(() => (route.query.genre as string) || "")
const authorFilter = computed(() => (route.query.author as string) || "")
const artistFilter = computed(() => (route.query.artist as string) || "")
const statusFilter = computed(() => (route.query.status as string) || "")
const typeFilter = computed(() => (route.query.type as string) || "")
const languageFilter = computed(() => (route.query.language as string) || "")

// Language options for filter
const languageOptions = [
	{ value: "En", label: "English" },
	{ value: "Fr", label: "French" },
	{ value: "Jp", label: "Japanese" },
	{ value: "JpRo", label: "Japanese (Romaji)" },
	{ value: "Ko", label: "Korean" },
	{ value: "KoRo", label: "Korean (Romaji)" },
	{ value: "Zh", label: "Chinese" },
	{ value: "ZhHk", label: "Chinese (HK)" },
]

// Debounced search
const searchInput = ref(searchQuery.value)
const debouncedSearch = useDebounceFn((value: string) => {
	updateFilters({ q: value || undefined })
}, 300)

watch(searchInput, (value) => {
	debouncedSearch(value)
})

// Build query params for fetching
const fetchQuery = computed(() => ({
	q: searchQuery.value || undefined,
	filter: filterType.value || undefined,
	source: sourceFilter.value || undefined,
	genre: genreFilter.value || undefined,
	author: authorFilter.value || undefined,
	artist: artistFilter.value || undefined,
	status: statusFilter.value || undefined,
	type: typeFilter.value || undefined,
	language: languageFilter.value || undefined,
}))

// Fetch first page with useFetch for SSR
const { data: initialData, pending, error, refresh } = await useFetch("/api/v1/serie", {
	query: computed(() => ({ page: 1, ...fetchQuery.value })),
})

// Fetch sources for filter
const { data: sources } = await useFetch("/api/v1/sources")

// Series item type that covers both normal and failing-filter response shapes
interface SeriesItem {
	id: string
	title: string
	synopsis: string | null
	cover: string | null
	type: string
	status: string[]
	updated_at: string
	_count: { chapters: number }
	failureCount?: number
	sources?: string[]
	last_chapter_at?: string | null
}

// Infinite scroll state
const allSeries = ref<SeriesItem[]>([])
const currentPage = ref(1)
const totalPages = ref(0)
const totalCount = ref(0)
const isFetchingNextPage = ref(false)
const nextPageError = ref(false)

// Sync initial data
function syncInitialData() {
	if (initialData.value) {
		allSeries.value = initialData.value.data.filter((s): s is NonNullable<typeof s> => s !== null) as SeriesItem[]
		currentPage.value = 1
		totalPages.value = initialData.value.pagination.totalPages
		totalCount.value = initialData.value.pagination.total
	}
}
// Sync whenever initialData updates (SSR, filter changes, refresh/retry)
watch(initialData, () => {
	syncInitialData()
	nextPageError.value = false
}, { immediate: true })

const hasNextPage = computed(() => currentPage.value < totalPages.value)
const series = computed(() => allSeries.value)

async function loadNextPage() {
	if (isFetchingNextPage.value || !hasNextPage.value || nextPageError.value) return
	isFetchingNextPage.value = true
	try {
		const nextPage = currentPage.value + 1
		const result = await $fetch("/api/v1/serie", {
			query: { page: nextPage, ...fetchQuery.value },
		})
		const newSeries = (result.data ?? []).filter((s): s is NonNullable<typeof s> => s !== null) as SeriesItem[]
		allSeries.value = [...allSeries.value, ...newSeries]
		currentPage.value = nextPage
		totalPages.value = result.pagination.totalPages
		totalCount.value = result.pagination.total
	}
	catch {
		nextPageError.value = true
	}
	finally {
		isFetchingNextPage.value = false
	}
}

function retryNextPage() {
	nextPageError.value = false
	loadNextPage()
}

// Infinite scroll sentinel
const sentinelRef = ref<HTMLElement | null>(null)

onMounted(() => {
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries[0]?.isIntersecting && hasNextPage.value && !isFetchingNextPage.value && !nextPageError.value) {
				loadNextPage()
			}
		},
		{ rootMargin: "200px" },
	)

	watch(sentinelRef, (el, _, onCleanup) => {
		if (el) observer.observe(el)
		onCleanup(() => {
			if (el) observer.unobserve(el)
		})
	}, { immediate: true })

	onUnmounted(() => observer.disconnect())
})

// Computed values
const isFailingFilter = computed(() => filterType.value === "failing")
const isNoChaptersFilter = computed(() => filterType.value === "no-chapters")
const isUnfilledGapsFilter = computed(() => filterType.value === "unfilled-gaps")
const isFilledGapsFilter = computed(() => filterType.value === "filled-gaps")
const hasMetadataFilters = computed(() => !!genreFilter.value || !!authorFilter.value || !!artistFilter.value || !!statusFilter.value || !!typeFilter.value || !!languageFilter.value)
const hasActiveFilters = computed(() => !!filterType.value || !!sourceFilter.value || hasMetadataFilters.value)

// Count active filters for badge
const activeFilterCount = computed(() => {
	let count = 0
	if (isFailingFilter.value) count++
	if (isNoChaptersFilter.value) count++
	if (isUnfilledGapsFilter.value) count++
	if (isFilledGapsFilter.value) count++
	if (sourceFilter.value) count++
	if (genreFilter.value) count++
	if (authorFilter.value) count++
	if (artistFilter.value) count++
	if (statusFilter.value) count++
	if (typeFilter.value) count++
	if (languageFilter.value) count++
	return count
})

// Get source name if filtering
const currentSourceName = computed(() => {
	if (!sourceFilter.value || !sources.value) return null
	return sources.value.find(s => s.id === sourceFilter.value)?.name ?? null
})

// Get current language label
const currentLanguageLabel = computed(() => {
	if (!languageFilter.value) return null
	return languageOptions.find(l => l.value === languageFilter.value)?.label ?? languageFilter.value
})

// Page description
const pageDescription = computed(() => {
	const total = totalCount.value.toLocaleString()
	const filters: string[] = []

	if (isFailingFilter.value) filters.push("failing")
	if (isNoChaptersFilter.value) filters.push("no chapters")
	if (isUnfilledGapsFilter.value) filters.push("unfilled gaps")
	if (isFilledGapsFilter.value) filters.push("filled gaps")
	if (currentSourceName.value) filters.push(`from ${currentSourceName.value}`)
	if (currentLanguageLabel.value) filters.push(`in ${currentLanguageLabel.value}`)
	if (typeFilter.value) filters.push(typeFilter.value)
	if (statusFilter.value) filters.push(statusFilter.value)
	if (genreFilter.value) filters.push(genreFilter.value)
	if (authorFilter.value) filters.push(`by ${authorFilter.value}`)
	if (artistFilter.value) filters.push(`art by ${artistFilter.value}`)

	if (filters.length > 0) {
		return `${total} ${filters.join(" · ")}`
	}
	return `${total} series in your library`
})

// Empty state type
const emptyStateType = computed(() => {
	if (isFailingFilter.value) return "no-failures" as const
	if (isNoChaptersFilter.value) return "no-results" as const
	if (searchQuery.value || hasActiveFilters.value) return "no-results" as const
	return "empty" as const
})

// Helper to update URL params
function updateFilters(updates: Record<string, string | undefined>) {
	const query: Record<string, string | undefined> = {}

	// Copy existing string query params
	for (const [key, value] of Object.entries(route.query)) {
		if (typeof value === "string") {
			query[key] = value
		}
	}

	// Apply updates
	Object.assign(query, updates)

	// Remove page param (no longer used)
	query.page = undefined

	const cleanQuery = Object.fromEntries(
		Object.entries(query).filter(([_, v]) => v !== undefined),
	)
	router.push({ query: cleanQuery })
}

function clearFilters() {
	router.push({ query: {} })
	searchInput.value = ""
}

function clearAllFilters() {
	updateFilters({
		filter: undefined,
		source: undefined,
		genre: undefined,
		author: undefined,
		artist: undefined,
		status: undefined,
		type: undefined,
		language: undefined,
	})
}
</script>

<template>
	<div class="series-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UiPageHeader
					title="Series"
					:description="pageDescription"
				>
					<template #right>
						<div class="toolbar">
							<!-- Active filter chips (hidden on mobile) -->
							<div
								v-if="hasActiveFilters"
								class="filter-chips"
							>
								<button
									v-if="isFailingFilter"
									class="filter-chip filter-chip-error"
									@click="updateFilters({ filter: undefined })"
								>
									<UIcon
										name="i-lucide-alert-triangle"
										class="chip-icon"
									/>
									Failing
									<UIcon
										name="i-lucide-x"
										class="chip-close"
									/>
								</button>
								<button
									v-if="isNoChaptersFilter"
									class="filter-chip filter-chip-warning"
									@click="updateFilters({ filter: undefined })"
								>
									<UIcon
										name="i-lucide-book-x"
										class="chip-icon"
									/>
									No chapters
									<UIcon
										name="i-lucide-x"
										class="chip-close"
									/>
								</button>
								<button
									v-if="isUnfilledGapsFilter"
									class="filter-chip filter-chip-purple"
									@click="updateFilters({ filter: undefined })"
								>
									<UIcon
										name="i-lucide-puzzle"
										class="chip-icon"
									/>
									Unfilled gaps
									<UIcon
										name="i-lucide-x"
										class="chip-close"
									/>
								</button>
								<button
									v-if="isFilledGapsFilter"
									class="filter-chip filter-chip-success"
									@click="updateFilters({ filter: undefined })"
								>
									<UIcon
										name="i-lucide-check-circle"
										class="chip-icon"
									/>
									Filled gaps
									<UIcon
										name="i-lucide-x"
										class="chip-close"
									/>
								</button>
								<button
									v-if="currentSourceName"
									class="filter-chip"
									@click="updateFilters({ source: undefined })"
								>
									{{ currentSourceName }}
									<UIcon
										name="i-lucide-x"
										class="chip-close"
									/>
								</button>
								<button
									v-if="currentLanguageLabel"
									class="filter-chip"
									@click="updateFilters({ language: undefined })"
								>
									<UIcon
										name="i-lucide-languages"
										class="chip-icon"
									/>
									{{ currentLanguageLabel }}
									<UIcon
										name="i-lucide-x"
										class="chip-close"
									/>
								</button>
								<button
									v-if="typeFilter"
									class="filter-chip"
									@click="updateFilters({ type: undefined })"
								>
									{{ typeFilter }}
									<UIcon
										name="i-lucide-x"
										class="chip-close"
									/>
								</button>
								<button
									v-if="statusFilter"
									class="filter-chip"
									@click="updateFilters({ status: undefined })"
								>
									{{ statusFilter }}
									<UIcon
										name="i-lucide-x"
										class="chip-close"
									/>
								</button>
								<button
									v-if="genreFilter"
									class="filter-chip"
									@click="updateFilters({ genre: undefined })"
								>
									{{ genreFilter }}
									<UIcon
										name="i-lucide-x"
										class="chip-close"
									/>
								</button>
								<button
									v-if="authorFilter"
									class="filter-chip"
									@click="updateFilters({ author: undefined })"
								>
									<UIcon
										name="i-lucide-user"
										class="chip-icon"
									/>
									{{ authorFilter }}
									<UIcon
										name="i-lucide-x"
										class="chip-close"
									/>
								</button>
								<button
									v-if="artistFilter"
									class="filter-chip"
									@click="updateFilters({ artist: undefined })"
								>
									<UIcon
										name="i-lucide-pen"
										class="chip-icon"
									/>
									{{ artistFilter }}
									<UIcon
										name="i-lucide-x"
										class="chip-close"
									/>
								</button>
							</div>

							<!-- Search input -->
							<div class="search-wrapper">
								<UIcon
									name="i-lucide-search"
									class="search-icon"
								/>
								<input
									v-model="searchInput"
									type="text"
									placeholder="Search library..."
									class="search-input"
								>
								<button
									v-if="searchInput"
									class="search-clear"
									@click="searchInput = ''"
								>
									<UIcon name="i-lucide-x" />
								</button>
							</div>

							<!-- Filter popover -->
							<UPopover>
								<button
									class="filter-button"
									:class="{ active: hasActiveFilters }"
								>
									<UIcon
										name="i-lucide-sliders-horizontal"
										class="filter-button-icon"
									/>
									<span class="filter-button-label">Filter</span>
									<span
										v-if="hasActiveFilters"
										class="filter-count"
									>
										{{ activeFilterCount }}
									</span>
								</button>

								<template #content>
									<div class="filter-panel">
										<!-- Status section - Primary filters as full-width buttons -->
										<div class="filter-section">
											<div class="filter-section-header">
												Status
											</div>
											<div class="filter-options">
												<button
													class="filter-option"
													:class="{ active: !filterType }"
													@click="updateFilters({ filter: undefined })"
												>
													<UIcon
														name="i-lucide-library"
														class="filter-option-icon"
													/>
													<span class="filter-option-label">All series</span>
													<UIcon
														v-if="!filterType"
														name="i-lucide-check"
														class="filter-option-check"
													/>
												</button>
												<button
													class="filter-option"
													:class="{ active: isFailingFilter }"
													@click="updateFilters({ filter: 'failing' })"
												>
													<UIcon
														name="i-lucide-alert-triangle"
														class="filter-option-icon filter-option-icon-error"
													/>
													<span class="filter-option-label">Failing updates</span>
													<UIcon
														v-if="isFailingFilter"
														name="i-lucide-check"
														class="filter-option-check"
													/>
												</button>
												<button
													class="filter-option"
													:class="{ active: isNoChaptersFilter }"
													@click="updateFilters({ filter: 'no-chapters' })"
												>
													<UIcon
														name="i-lucide-book-x"
														class="filter-option-icon filter-option-icon-warning"
													/>
													<span class="filter-option-label">No chapters</span>
													<UIcon
														v-if="isNoChaptersFilter"
														name="i-lucide-check"
														class="filter-option-check"
													/>
												</button>
												<button
													class="filter-option"
													:class="{ active: isUnfilledGapsFilter }"
													@click="updateFilters({ filter: 'unfilled-gaps' })"
												>
													<UIcon
														name="i-lucide-puzzle"
														class="filter-option-icon filter-option-icon-purple"
													/>
													<span class="filter-option-label">Unfilled gaps</span>
													<UIcon
														v-if="isUnfilledGapsFilter"
														name="i-lucide-check"
														class="filter-option-check"
													/>
												</button>
												<button
													class="filter-option"
													:class="{ active: isFilledGapsFilter }"
													@click="updateFilters({ filter: 'filled-gaps' })"
												>
													<UIcon
														name="i-lucide-check-circle"
														class="filter-option-icon filter-option-icon-success"
													/>
													<span class="filter-option-label">Filled gaps</span>
													<UIcon
														v-if="isFilledGapsFilter"
														name="i-lucide-check"
														class="filter-option-check"
													/>
												</button>
											</div>
										</div>

										<!-- Two-column grid for Source and Language -->
										<div class="filter-grid">
											<!-- Sources section - Compact pills -->
											<div
												v-if="sources?.length"
												class="filter-section filter-section-compact"
											>
												<div class="filter-section-header">
													Source
												</div>
												<div class="filter-pills">
													<button
														class="filter-pill"
														:class="{ active: !sourceFilter }"
														@click="updateFilters({ source: undefined })"
													>
														All
													</button>
													<button
														v-for="source in sources"
														:key="source.id"
														class="filter-pill"
														:class="{ active: sourceFilter === source.id }"
														@click="updateFilters({ source: source.id })"
													>
														<NuxtImg
															v-if="source.icon"
															:src="source.icon"
															:alt="source.name"
															class="filter-pill-img"
														/>
														{{ source.name.replace(/\s*\([^)]*\)/g, '') }}
													</button>
												</div>
											</div>

											<!-- Language section - Compact pills -->
											<div class="filter-section filter-section-compact">
												<div class="filter-section-header">
													Language
												</div>
												<div class="filter-pills">
													<button
														class="filter-pill"
														:class="{ active: !languageFilter }"
														@click="updateFilters({ language: undefined })"
													>
														All
													</button>
													<button
														v-for="lang in languageOptions"
														:key="lang.value"
														class="filter-pill"
														:class="{ active: languageFilter === lang.value }"
														@click="updateFilters({ language: lang.value })"
													>
														{{ lang.label }}
													</button>
												</div>
											</div>
										</div>

										<!-- Clear filters -->
										<div
											v-if="hasActiveFilters"
											class="filter-section filter-section-clear"
										>
											<button
												class="filter-clear-button"
												@click="clearAllFilters"
											>
												<UIcon
													name="i-lucide-x"
													class="filter-clear-icon"
												/>
												Clear all filters
											</button>
										</div>
									</div>
								</template>
							</UPopover>

							<!-- Import button -->
							<UButton
								v-if="isAdmin"
								icon="i-lucide-plus"
								class="shrink-0"
								to="/dashboard/series/import"
							>
								<span class="hidden sm:inline">Import</span>
							</UButton>
						</div>
					</template>
				</UiPageHeader>
			</template>

			<template #body>
				<!-- Loading state -->
				<SeriesGridSkeleton
					v-if="pending && allSeries.length === 0"
					:count="24"
				/>

				<!-- Error state -->
				<div
					v-else-if="error && allSeries.length === 0"
					class="error-state"
				>
					<UIcon
						name="i-lucide-alert-circle"
						class="error-icon"
					/>
					<h3 class="error-title">
						Failed to load series
					</h3>
					<p class="error-message">
						{{ error.message }}
					</p>
					<UButton
						variant="outline"
						@click="refresh()"
					>
						Try again
					</UButton>
				</div>

				<!-- Empty state -->
				<div
					v-else-if="series.length === 0 && !pending"
					class="empty-state-wrapper"
				>
					<SeriesEmptyState
						:type="emptyStateType"
						:search-query="searchQuery"
						:is-admin="isAdmin"
						@clear-filters="clearFilters"
					/>
				</div>

				<!-- Series grid -->
				<div
					v-else
					class="series-page-content"
				>
					<SeriesGrid>
						<SeriesCard
							v-for="serie in series"
							:key="serie.id"
							:serie="serie"
						/>
					</SeriesGrid>

					<!-- Sentinel for infinite scroll -->
					<div
						v-if="hasNextPage || isFetchingNextPage"
						ref="sentinelRef"
						class="scroll-sentinel"
					>
						<div
							v-if="isFetchingNextPage"
							class="loading-more"
						>
							<UIcon
								name="i-lucide-loader-2"
								class="loading-spinner"
							/>
						</div>
						<div
							v-else-if="nextPageError"
							class="load-error"
						>
							<span>Failed to load more</span>
							<button
								class="retry-btn"
								@click="retryNextPage"
							>
								Retry
							</button>
						</div>
					</div>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
/* Toolbar */
.toolbar {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

@media (min-width: 640px) {
	.toolbar {
		gap: 0.625rem;
	}
}

/* Filter chips */
.filter-chips {
	display: none;
	align-items: center;
	gap: 0.375rem;
}

@media (min-width: 640px) {
	.filter-chips {
		display: flex;
	}
}

.filter-chip {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text);
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 2rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.filter-chip:hover {
	background: var(--ui-bg-elevated);
	border-color: var(--ui-text-muted);
}

.filter-chip-error {
	background: var(--ui-error-soft);
	border-color: color-mix(in oklch, var(--ui-error) 30%, transparent);
	color: var(--ui-error);
}

.filter-chip-error:hover {
	background: color-mix(in oklch, var(--ui-error) 20%, transparent);
}

.filter-chip-warning {
	background: var(--ui-warning-soft);
	border-color: color-mix(in oklch, var(--ui-warning) 30%, transparent);
	color: var(--ui-warning);
}

.filter-chip-warning:hover {
	background: color-mix(in oklch, var(--ui-warning) 20%, transparent);
}

.filter-chip-purple {
	background: var(--color-purple-soft);
	border-color: color-mix(in oklch, var(--color-purple) 30%, transparent);
	color: var(--color-purple);
}

.filter-chip-purple:hover {
	background: color-mix(in oklch, var(--color-purple) 20%, transparent);
}

.filter-chip-success {
	background: var(--ui-success-soft);
	border-color: color-mix(in oklch, var(--ui-success) 30%, transparent);
	color: var(--ui-success);
}

.filter-chip-success:hover {
	background: color-mix(in oklch, var(--ui-success) 20%, transparent);
}

.chip-icon {
	width: 0.75rem;
	height: 0.75rem;
}

.chip-close {
	width: 0.75rem;
	height: 0.75rem;
	opacity: 0.6;
	transition: opacity 0.15s ease;
}

.filter-chip:hover .chip-close {
	opacity: 1;
}

/* Search input */
.search-wrapper {
	position: relative;
	display: flex;
	align-items: center;
}

.search-icon {
	position: absolute;
	left: 0.625rem;
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
	pointer-events: none;
	transition: color 0.15s ease;
}

.search-input {
	width: 8rem;
	padding: 0.5rem 2rem 0.5rem 2.25rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text);
	background: var(--ui-bg-muted);
	border: 1px solid transparent;
	border-radius: 2rem;
	outline: none;
	transition: all 0.2s ease;
}

@media (min-width: 640px) {
	.search-input {
		width: 14rem;
	}
}

.search-input::placeholder {
	color: var(--ui-text-dimmed);
}

.search-input:hover {
	background: var(--ui-bg-elevated);
	border-color: var(--ui-border);
}

.search-input:focus {
	width: 16rem;
	background: var(--ui-bg-elevated);
	border-color: var(--ui-primary);
	box-shadow: 0 0 0 3px color-mix(in oklch, var(--ui-primary) 15%, transparent);
}

@media (max-width: 639px) {
	.search-input:focus {
		width: 10rem;
	}
}

.search-wrapper:focus-within .search-icon {
	color: var(--ui-primary);
}

.search-clear {
	position: absolute;
	right: 0.5rem;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-text-muted);
	background: transparent;
	border: none;
	border-radius: 50%;
	cursor: pointer;
	transition: all 0.15s ease;
}

.search-clear:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

/* Filter button */
.filter-button {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.5rem 0.75rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.filter-button:hover {
	color: var(--ui-text);
	border-color: var(--ui-text-muted);
}

.filter-button.active {
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
	border-color: color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

.filter-button.active:hover {
	background: color-mix(in oklch, var(--ui-primary) 20%, transparent);
}

.filter-button-icon {
	width: 1rem;
	height: 1rem;
}

.filter-button-label {
	display: none;
}

@media (min-width: 640px) {
	.filter-button-label {
		display: inline;
	}
}

.filter-count {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 1.125rem;
	height: 1.125rem;
	padding: 0 0.25rem;
	font-size: 0.625rem;
	font-weight: 700;
	color: white;
	background: var(--ui-primary);
	border-radius: 2rem;
}

/* Filter panel */
.filter-panel {
	width: 20rem;
	max-height: calc(100vh - 8rem);
	overflow-y: auto;
	padding: 0.5rem;
}

.filter-section {
	padding: 0.25rem 0;
}

.filter-section:not(:last-child) {
	border-bottom: 1px solid var(--ui-border);
	padding-bottom: 0.5rem;
	margin-bottom: 0.25rem;
}

.filter-section-header {
	padding: 0.375rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--ui-text-muted);
}

.filter-options {
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
}

.filter-option {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	width: 100%;
	padding: 0.5rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text);
	background: transparent;
	border: none;
	border-radius: 0.375rem;
	cursor: pointer;
	transition: all 0.15s ease;
	text-align: left;
}

.filter-option:hover {
	background: var(--ui-bg-muted);
}

.filter-option.active {
	background: var(--ui-primary-soft);
	color: var(--ui-primary);
}

.filter-option-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
	flex-shrink: 0;
}

.filter-option-img {
	width: 1rem;
	height: 1rem;
	border-radius: 0.25rem;
	object-fit: cover;
	flex-shrink: 0;
}

.filter-option.active .filter-option-icon {
	color: var(--ui-primary);
}

.filter-option-icon-error {
	color: var(--ui-error);
}

.filter-option.active .filter-option-icon-error {
	color: var(--ui-error);
}

.filter-option-icon-warning {
	color: var(--ui-warning);
}

.filter-option.active .filter-option-icon-warning {
	color: var(--ui-warning);
}

.filter-option-icon-purple {
	color: var(--color-purple);
}

.filter-option.active .filter-option-icon-purple {
	color: var(--color-purple);
}

.filter-option-icon-success {
	color: var(--ui-success);
}

.filter-option.active .filter-option-icon-success {
	color: var(--ui-success);
}

.filter-option-label {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.filter-option-check {
	width: 1rem;
	height: 1rem;
	color: var(--ui-primary);
	flex-shrink: 0;
}

/* Two-column grid for compact sections */
.filter-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 0.75rem;
	padding: 0.5rem 0;
	border-bottom: 1px solid var(--ui-border);
	margin-bottom: 0.25rem;
}

.filter-section-compact {
	padding: 0;
	border-bottom: none;
	margin-bottom: 0;
}

.filter-section-compact:not(:last-child) {
	border-bottom: none;
	padding-bottom: 0;
	margin-bottom: 0;
}

.filter-section-compact .filter-section-header {
	padding: 0 0 0.375rem 0;
}

/* Compact pill buttons */
.filter-pills {
	display: flex;
	flex-wrap: wrap;
	gap: 0.25rem;
}

.filter-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	padding: 0.25rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	border: 1px solid transparent;
	border-radius: 1rem;
	cursor: pointer;
	transition: all 0.15s ease;
	white-space: nowrap;
}

.filter-pill:hover {
	color: var(--ui-text);
	background: var(--ui-bg-elevated);
	border-color: var(--ui-border);
}

.filter-pill.active {
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
	border-color: color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

.filter-pill-img {
	width: 0.875rem;
	height: 0.875rem;
	border-radius: 0.1875rem;
	object-fit: cover;
	flex-shrink: 0;
}

.filter-section-clear {
	border-bottom: none;
	padding-bottom: 0.25rem;
	margin-bottom: 0;
}

.filter-clear-button {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	width: 100%;
	padding: 0.5rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: transparent;
	border: 1px dashed var(--ui-border);
	border-radius: 0.375rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.filter-clear-button:hover {
	color: var(--ui-error);
	border-color: var(--ui-error);
	background: var(--ui-error-soft);
}

.filter-clear-icon {
	width: 0.875rem;
	height: 0.875rem;
}

/* Empty state wrapper */
.empty-state-wrapper {
	display: flex;
	flex: 1;
	min-height: 60vh;
}

/* Error state */
.error-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 3rem 1.5rem;
	text-align: center;
	min-height: 60vh;
}

.error-icon {
	width: 3rem;
	height: 3rem;
	color: var(--ui-error);
	margin-bottom: 1rem;
}

.error-title {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0 0 0.25rem;
}

.error-message {
	font-size: var(--font-size-base);
	color: var(--ui-text-muted);
	margin: 0 0 1rem;
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

.load-error {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.75rem;
	padding: 1.5rem 0;
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

.retry-btn {
	padding: 0.25rem 0.75rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-primary);
	background: transparent;
	border: 1px solid var(--ui-primary);
	border-radius: 0.25rem;
	cursor: pointer;
	transition: background 0.15s ease;
}

.retry-btn:hover {
	background: var(--ui-primary-soft);
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
