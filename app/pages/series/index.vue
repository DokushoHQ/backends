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
	})),
})

// Fetch sources for filter
const { data: sources } = await useFetch("/api/v1/sources")

// Computed values
const series = computed(() => (data.value?.data ?? []).filter((s): s is NonNullable<typeof s> => s !== null))
const pagination = computed(() => data.value?.pagination ?? { page: 1, pageSize: 24, total: 0, totalPages: 0 })
const isFailingFilter = computed(() => filterType.value === "failing")
const hasActiveFilters = computed(() => !!filterType.value || !!sourceFilter.value)

// Get source name if filtering
const currentSourceName = computed(() => {
	if (!sourceFilter.value || !sources.value) return null
	return sources.value.find(s => s.id === sourceFilter.value)?.name ?? null
})

// Page description
const pageDescription = computed(() => {
	const total = pagination.value.total.toLocaleString()
	if (isFailingFilter.value) {
		return `${total} series with update failures${currentSourceName.value ? ` from ${currentSourceName.value}` : ""}`
	}
	if (currentSourceName.value) {
		return `${total} series from ${currentSourceName.value}`
	}
	return `${total} series in your library`
})

// Helper to update URL params
function updateFilters(updates: Record<string, string | undefined>) {
	// Convert route.query values to string | undefined (ignoring arrays and nulls)
	const query: Record<string, string | undefined> = {}
	for (const [key, value] of Object.entries(route.query)) {
		if (typeof value === "string") {
			query[key] = value
		}
	}

	for (const [key, value] of Object.entries(updates)) {
		if (value === undefined) {
			query[key] = undefined
		}
		else {
			query[key] = value
		}
	}

	// Reset page when changing other filters
	if (!("page" in updates) && Object.keys(updates).length > 0) {
		query.page = undefined
	}

	// Filter out undefined values for router
	const cleanQuery = Object.fromEntries(
		Object.entries(query).filter(([_, v]) => v !== undefined),
	)
	router.push({ query: cleanQuery })
}

function clearFilters() {
	router.push({ query: {} })
	searchInput.value = ""
}

function setPage(newPage: number) {
	if (newPage === 1) {
		updateFilters({ page: undefined })
	}
	else {
		updateFilters({ page: String(newPage) })
	}
}

// Get failure count for a series
function getFailureCount(serie: unknown): number {
	if (typeof serie === "object" && serie !== null && "failureCount" in serie) {
		return (serie as { failureCount: number }).failureCount ?? 0
	}
	return 0
}

// Filter dropdown items
const filterItems = computed(() => {
	const items = [
		[
			{ label: "All", onSelect: () => updateFilters({ filter: undefined }) },
			{ label: "Failing", onSelect: () => updateFilters({ filter: "failing" }) },
		],
	]

	if (sources.value?.length) {
		items.push([
			{ label: "All sources", onSelect: () => updateFilters({ source: undefined }) },
			...sources.value.map(s => ({
				label: s.name,
				onSelect: () => updateFilters({ source: s.id }),
			})),
		])
	}

	return items
})
</script>

<template>
	<div class="flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UDashboardNavbar
					title="Series"
					:description="pageDescription"
				>
					<template #right>
						<div class="flex items-center gap-1.5 sm:gap-2">
							<!-- Active filter badges (hidden on mobile) -->
							<div
								v-if="hasActiveFilters"
								class="hidden sm:flex items-center gap-1"
							>
								<UBadge
									v-if="isFailingFilter"
									variant="subtle"
									class="gap-1"
								>
									Failing
									<UButton
										variant="ghost"
										size="xs"
										icon="i-lucide-x"
										class="ml-0.5 -mr-1"
										@click="updateFilters({ filter: undefined })"
									/>
								</UBadge>
								<UBadge
									v-if="currentSourceName"
									variant="subtle"
									class="gap-1"
								>
									{{ currentSourceName }}
									<UButton
										variant="ghost"
										size="xs"
										icon="i-lucide-x"
										class="ml-0.5 -mr-1"
										@click="updateFilters({ source: undefined })"
									/>
								</UBadge>
							</div>

							<UInput
								v-model="searchInput"
								placeholder="Search..."
								icon="i-lucide-search"
								class="w-32 sm:w-64"
							/>

							<UDropdownMenu :items="filterItems">
								<UButton
									variant="outline"
									icon="i-lucide-filter"
									class="shrink-0"
								>
									<span class="hidden sm:inline">Filter</span>
								</UButton>
							</UDropdownMenu>

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
				<div
					v-if="pending"
					class="flex items-center justify-center py-12"
				>
					<UIcon
						name="i-lucide-loader-2"
						class="h-8 w-8 animate-spin text-muted-foreground"
					/>
				</div>

				<!-- Error state -->
				<div
					v-else-if="error"
					class="flex flex-col items-center justify-center py-12 text-center"
				>
					<UIcon
						name="i-lucide-alert-circle"
						class="h-12 w-12 text-destructive mb-4"
					/>
					<h3 class="text-lg font-semibold">
						Failed to load series
					</h3>
					<p class="text-muted-foreground mt-1">
						{{ error.message }}
					</p>
					<UButton
						variant="outline"
						class="mt-4"
						@click="refresh()"
					>
						Try again
					</UButton>
				</div>

				<!-- Empty state -->
				<div
					v-else-if="series.length === 0"
					class="flex flex-col items-center justify-center py-12 text-center"
				>
					<UIcon
						:name="isFailingFilter ? 'i-lucide-alert-triangle' : 'i-lucide-book-open'"
						class="h-12 w-12 text-muted-foreground mb-4"
					/>
					<h3 class="text-lg font-semibold">
						{{ isFailingFilter ? "No failing series" : searchQuery ? "No results found" : "No series yet" }}
					</h3>
					<p class="text-muted-foreground mt-1">
						<template v-if="isFailingFilter">
							All series are updating successfully.
						</template>
						<template v-else-if="searchQuery">
							No series matching "{{ searchQuery }}". Try a different search term.
						</template>
						<template v-else>
							Your library is empty. Series will appear here once added.
						</template>
					</p>
					<UButton
						v-if="hasActiveFilters || searchQuery"
						variant="outline"
						class="mt-4"
						@click="clearFilters"
					>
						Clear filters
					</UButton>
				</div>

				<!-- Series grid -->
				<div
					v-else
					class="flex flex-col min-h-full"
				>
					<div class="flex-1">
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
							<NuxtLink
								v-for="serie in series"
								:key="serie.id"
								:to="`/series/${serie.id}`"
								class="group block rounded-lg bg-card overflow-hidden hover:ring-1 hover:ring-primary/50 transition-all"
							>
								<div class="aspect-2/3 relative bg-muted overflow-hidden">
									<NuxtImg
										v-if="serie.cover"
										:src="serie.cover"
										:alt="serie.title"
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
									<div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-3 pt-8">
										<p class="font-medium text-white text-sm truncate">{{ serie.title }}</p>
									</div>
								</div>
								<div class="p-2 flex items-center gap-1.5">
									<span class="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium">
										{{ serie._count?.chapters ?? 0 }} ch
									</span>
									<span
										v-if="getFailureCount(serie) > 0"
										class="inline-flex items-center gap-0.5 rounded-md bg-red-500/10 text-red-500 px-2 py-1 text-xs font-medium"
									>
										<UIcon
											name="i-lucide-alert-triangle"
											class="h-3 w-3"
										/>
										{{ getFailureCount(serie) }}
									</span>
								</div>
							</NuxtLink>
						</div>
					</div>

					<!-- Pagination -->
					<div
						v-if="pagination.totalPages > 1"
						class="flex items-center justify-center gap-2 mt-6 pb-4"
					>
						<UButton
							variant="outline"
							size="sm"
							:disabled="page <= 1"
							@click="setPage(page - 1)"
						>
							<UIcon
								name="i-lucide-chevron-left"
								class="h-4 w-4 mr-1"
							/>
							Previous
						</UButton>

						<div class="flex items-center gap-1">
							<template
								v-for="pageNum in Math.min(5, pagination.totalPages)"
								:key="pageNum"
							>
								<UButton
									:variant="pageNum === page ? 'solid' : 'outline'"
									size="sm"
									class="w-9"
									@click="setPage(pageNum)"
								>
									{{ pageNum }}
								</UButton>
							</template>
						</div>

						<UButton
							variant="outline"
							size="sm"
							:disabled="page >= pagination.totalPages"
							@click="setPage(page + 1)"
						>
							Next
							<UIcon
								name="i-lucide-chevron-right"
								class="h-4 w-4 ml-1"
							/>
						</UButton>
					</div>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>
