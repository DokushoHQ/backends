<script setup lang="ts">
definePageMeta({
	title: "Series",
})

const route = useRoute()
const router = useRouter()
const { isAdmin } = await useAuth()

// URL-based state
const page = computed(() => Math.max(1, Number.parseInt(String(route.query.page || "1"), 10)))
const searchQuery = computed(() => (route.query.q as string) || "")
const filterType = computed(() => (route.query.filter as string) || "")
const sourceFilter = computed(() => (route.query.source as string) || "")

// Metadata filters
const genreFilter = computed(() => (route.query.genre as string) || "")
const authorFilter = computed(() => (route.query.author as string) || "")
const artistFilter = computed(() => (route.query.artist as string) || "")
const statusFilter = computed(() => (route.query.status as string) || "")
const typeFilter = computed(() => (route.query.type as string) || "")

// Debounced search
const searchInput = ref(searchQuery.value)
const debouncedSearch = useDebounceFn((value: string) => {
	updateFilters({ q: value || undefined, page: undefined })
}, 300)

watch(searchInput, (value) => {
	debouncedSearch(value)
})

// Fetch series data
const { data, pending, error, refresh } = await useFetch("/api/v1/serie", {
	query: computed(() => ({
		page: page.value,
		q: searchQuery.value || undefined,
		filter: filterType.value || undefined,
		source: sourceFilter.value || undefined,
		genre: genreFilter.value || undefined,
		author: authorFilter.value || undefined,
		artist: artistFilter.value || undefined,
		status: statusFilter.value || undefined,
		type: typeFilter.value || undefined,
	})),
})

// Fetch sources for filter
const { data: sources } = await useFetch("/api/v1/sources")

// Computed values
const series = computed(() => (data.value?.data ?? []).filter((s): s is NonNullable<typeof s> => s !== null))
const pagination = computed(() => data.value?.pagination ?? { page: 1, pageSize: 24, total: 0, totalPages: 0 })
const isFailingFilter = computed(() => filterType.value === "failing")
const hasMetadataFilters = computed(() => !!genreFilter.value || !!authorFilter.value || !!artistFilter.value || !!statusFilter.value || !!typeFilter.value)
const hasActiveFilters = computed(() => !!filterType.value || !!sourceFilter.value || hasMetadataFilters.value)

// Count active filters for badge
const activeFilterCount = computed(() => {
	let count = 0
	if (isFailingFilter.value) count++
	if (sourceFilter.value) count++
	if (genreFilter.value) count++
	if (authorFilter.value) count++
	if (artistFilter.value) count++
	if (statusFilter.value) count++
	if (typeFilter.value) count++
	return count
})

// Get source name if filtering
const currentSourceName = computed(() => {
	if (!sourceFilter.value || !sources.value) return null
	return sources.value.find(s => s.id === sourceFilter.value)?.name ?? null
})

// Page description
const pageDescription = computed(() => {
	const total = pagination.value.total.toLocaleString()
	const filters: string[] = []

	if (isFailingFilter.value) filters.push("failing")
	if (currentSourceName.value) filters.push(`from ${currentSourceName.value}`)
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

	// Reset page when changing other filters
	if (!("page" in updates) && Object.keys(updates).length > 0) {
		query.page = undefined
	}

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
	})
}

function setPage(newPage: number) {
	if (newPage === 1) {
		updateFilters({ page: undefined })
	}
	else {
		updateFilters({ page: String(newPage) })
	}
}
</script>

<template>
	<div class="series-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UDashboardNavbar
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
										<!-- Status section -->
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
											</div>
										</div>

										<!-- Sources section -->
										<div
											v-if="sources?.length"
											class="filter-section"
										>
											<div class="filter-section-header">
												Source
											</div>
											<div class="filter-options">
												<button
													class="filter-option"
													:class="{ active: !sourceFilter }"
													@click="updateFilters({ source: undefined })"
												>
													<UIcon
														name="i-lucide-database"
														class="filter-option-icon"
													/>
													<span class="filter-option-label">All sources</span>
													<UIcon
														v-if="!sourceFilter"
														name="i-lucide-check"
														class="filter-option-check"
													/>
												</button>
												<button
													v-for="source in sources"
													:key="source.id"
													class="filter-option"
													:class="{ active: sourceFilter === source.id }"
													@click="updateFilters({ source: source.id })"
												>
													<NuxtImg
														v-if="source.icon"
														:src="source.icon"
														:alt="source.name"
														class="filter-option-img"
													/>
													<UIcon
														v-else
														name="i-lucide-globe"
														class="filter-option-icon"
													/>
													<span class="filter-option-label">{{ source.name }}</span>
													<UIcon
														v-if="sourceFilter === source.id"
														name="i-lucide-check"
														class="filter-option-check"
													/>
												</button>
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
								to="/series/import"
							>
								<span class="hidden sm:inline">Import</span>
							</UButton>
						</div>
					</template>
				</UDashboardNavbar>
			</template>

			<template #body>
				<!-- Loading state -->
				<SeriesGridSkeleton
					v-if="pending"
					:count="24"
				/>

				<!-- Error state -->
				<div
					v-else-if="error"
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
				<SeriesEmptyState
					v-else-if="series.length === 0"
					:type="emptyStateType"
					:search-query="searchQuery"
					:is-admin="isAdmin"
					@clear-filters="clearFilters"
				/>

				<!-- Series grid -->
				<div
					v-else
					class="series-page-content"
				>
					<div class="series-grid">
						<SeriesCard
							v-for="serie in series"
							:key="serie.id"
							:serie="serie"
						/>
					</div>

					<UiPagination
						:page="page"
						:total-pages="pagination.totalPages"
						@update:page="setPage"
					/>
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
	width: 14rem;
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

/* Series grid */
.series-grid {
	display: grid;
	gap: 1rem;
	grid-template-columns: repeat(2, 1fr);
	align-items: start;
}

@media (min-width: 640px) {
	.series-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

@media (min-width: 768px) {
	.series-grid {
		grid-template-columns: repeat(4, 1fr);
	}
}

@media (min-width: 1024px) {
	.series-grid {
		grid-template-columns: repeat(5, 1fr);
	}
}

@media (min-width: 1280px) {
	.series-grid {
		grid-template-columns: repeat(6, 1fr);
	}
}

@media (min-width: 1536px) {
	.series-grid {
		grid-template-columns: repeat(8, 1fr);
	}
}

/* Error state */
.error-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 3rem 1.5rem;
	text-align: center;
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
</style>
