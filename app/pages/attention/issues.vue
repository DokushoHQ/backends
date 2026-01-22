<script setup lang="ts">
definePageMeta({
	title: "Series Issues",
})

const route = useRoute()
const router = useRouter()

// URL-based state
const page = computed(() => Math.max(1, Number.parseInt(String(route.query.page || "1"), 10)))
const typeFilter = computed(() => (route.query.type as string) || "all")

// Two-way binding for segmented control
const selectedType = computed({
	get: () => typeFilter.value,
	set: (value: string) => setType(value),
})

// Fetch issues
const { data, pending, error, refresh } = await useFetch("/api/v1/attention/issues", {
	query: computed(() => ({
		page: page.value,
		type: typeFilter.value,
	})),
})

const series = computed(() => data.value?.series ?? [])
const pagination = computed(() => data.value?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 })
const counts = computed(() => data.value?.counts ?? { all: 0, pending_deletion: 0, missing_cover: 0, scrape_failures: 0, chapter_data_missing: 0 })

const filterOptions = computed(() => [
	{ label: "All", value: "all", count: counts.value.all },
	{ label: "Deletion", value: "pending_deletion", count: counts.value.pending_deletion },
	{ label: "Cover", value: "missing_cover", count: counts.value.missing_cover },
	{ label: "Scrape", value: "scrape_failures", count: counts.value.scrape_failures },
	{ label: "Data", value: "chapter_data_missing", count: counts.value.chapter_data_missing },
])

function getIssueBadge(issue: string) {
	switch (issue) {
		case "pending_deletion":
			return { label: "Pending Deletion", color: "orange" }
		case "missing_cover":
			return { label: "Missing Cover", color: "yellow" }
		case "scrape_failures":
			return { label: "Scrape Failed", color: "red" }
		case "chapter_data_missing":
			return { label: "Chapter Data", color: "purple" }
		default:
			return { label: issue, color: "gray" }
	}
}

function setType(type: string) {
	router.push({ query: { type, page: undefined } })
}

function setPage(newPage: number) {
	const query = { ...route.query }
	if (newPage === 1) {
		delete query.page
	}
	else {
		query.page = String(newPage)
	}
	router.push({ query })
}
</script>

<template>
	<div class="issues-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UDashboardNavbar
					title="Series Issues"
					:description="`${pagination.total} series need attention`"
				>
					<template #right>
						<div class="navbar-right">
							<UiSegmentedControl
								v-model="selectedType"
								:options="filterOptions"
								class="desktop-only"
							/>
							<UiBackButton to="/attention" />
						</div>
					</template>
				</UDashboardNavbar>
				<div class="mobile-filter-bar">
					<UiSegmentedControl
						v-model="selectedType"
						:options="filterOptions"
					/>
				</div>
			</template>

			<template #body>
				<!-- Loading state -->
				<div
					v-if="pending"
					class="state-container"
				>
					<div class="state-icon-wrapper">
						<UIcon
							name="i-lucide-loader-2"
							class="h-8 w-8 animate-spin text-primary/60"
						/>
					</div>
				</div>

				<!-- Error state -->
				<div
					v-else-if="error"
					class="state-container"
				>
					<div class="state-icon-wrapper error">
						<UIcon
							name="i-lucide-alert-triangle"
							class="h-8 w-8"
						/>
					</div>
					<h3 class="state-title">
						Failed to load
					</h3>
					<p class="state-description">
						{{ error.message }}
					</p>
					<button
						class="retry-button"
						@click="refresh()"
					>
						Try again
					</button>
				</div>

				<!-- Empty state -->
				<div
					v-else-if="series.length === 0"
					class="state-container"
				>
					<div class="state-icon-wrapper success">
						<UIcon
							name="i-lucide-check"
							class="h-8 w-8"
						/>
					</div>
					<h3 class="state-title">
						{{ typeFilter === 'all' ? 'All clear' : 'No issues in this category' }}
					</h3>
					<p class="state-description">
						{{ typeFilter === 'all' ? 'No series need attention right now.' : 'Try checking other categories.' }}
					</p>
				</div>

				<!-- Series list -->
				<div
					v-else
					class="series-container"
				>
					<div class="series-list">
						<NuxtLink
							v-for="serie in series"
							:key="serie.id"
							:to="`/series/${serie.id}`"
							class="series-row"
						>
							<div class="series-cover">
								<NuxtImg
									v-if="serie.cover"
									:src="serie.cover"
									:alt="serie.title"
									class="cover-image"
								/>
								<div
									v-else
									class="cover-placeholder"
								>
									<UIcon
										name="i-lucide-image-off"
										class="h-5 w-5"
									/>
								</div>
							</div>

							<div class="series-info">
								<h4 class="series-title">
									{{ serie.title }}
								</h4>
								<div class="series-badges">
									<span
										v-for="issue in serie.issues"
										:key="issue"
										class="issue-badge"
										:class="`color-${getIssueBadge(issue).color}`"
									>
										{{ getIssueBadge(issue).label }}
										<template v-if="issue === 'chapter_data_missing' && serie.chaptersNeedingData">
											({{ serie.chaptersNeedingData }})
										</template>
									</span>
								</div>
								<div
									v-if="serie.failedSources.length > 0"
									class="failed-sources"
								>
									<span
										v-for="source in serie.failedSources"
										:key="source.name"
									>
										{{ source.name }}: {{ source.failures }} failures
									</span>
								</div>
							</div>

							<UIcon
								name="i-lucide-chevron-right"
								class="h-5 w-5 text-muted-foreground"
							/>
						</NuxtLink>
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
.issues-page {
	--orange: oklch(0.75 0.18 50);
	--orange-soft: oklch(0.75 0.18 50 / 0.15);
	--yellow: oklch(0.82 0.14 85);
	--yellow-soft: oklch(0.82 0.14 85 / 0.15);
	--red: oklch(0.7 0.2 25);
	--red-soft: oklch(0.7 0.2 25 / 0.15);
	--purple: oklch(0.75 0.15 280);
	--purple-soft: oklch(0.75 0.15 280 / 0.15);
	--success: oklch(0.75 0.15 160);
	--success-soft: oklch(0.75 0.15 160 / 0.15);
}

/* Responsive navbar */
.navbar-right {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.desktop-only {
	display: none;
}

.mobile-filter-bar {
	display: flex;
	justify-content: center;
	padding: 0.75rem 1rem;
	border-bottom: 1px solid var(--color-border);
	background: var(--color-background);
}

.mobile-filter-bar :deep(.segmented-control) {
	flex: 1;
	max-width: 24rem;
}

@media (min-width: 640px) {
	.desktop-only {
		display: flex;
	}

	.mobile-filter-bar {
		display: none;
	}
}

/* State containers */
.state-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	text-align: center;
}

.state-icon-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 4rem;
	height: 4rem;
	margin-bottom: 1.5rem;
	border-radius: 1rem;
	background: var(--color-muted);
	color: var(--color-text-muted);
}

.state-icon-wrapper.success {
	background: var(--success-soft);
	color: var(--success);
}

.state-icon-wrapper.error {
	background: var(--red-soft);
	color: var(--red);
}

.state-title {
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--color-text);
	margin-bottom: 0.5rem;
}

.state-description {
	font-size: 0.875rem;
	color: var(--color-text-muted);
	max-width: 24rem;
}

.retry-button {
	margin-top: 1.5rem;
	padding: 0.5rem 1rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--color-text);
	background: var(--color-muted);
	border-radius: 0.5rem;
	transition: background 0.15s ease;
}

.retry-button:hover {
	background: var(--color-border);
}

/* Series list */
.series-container {
	padding: 1rem;
}

.series-list {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.series-row {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 0.875rem;
	background: var(--color-background);
	border: 1px solid var(--color-border);
	border-radius: 0.625rem;
	text-decoration: none;
	transition: all 0.15s ease;
}

.series-row:hover {
	border-color: var(--color-text-muted);
	background: var(--color-muted);
}

.series-cover {
	position: relative;
	width: 3rem;
	height: 4rem;
	border-radius: 0.375rem;
	overflow: hidden;
	background: var(--color-muted);
	flex-shrink: 0;
}

.cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.cover-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	color: var(--color-text-muted);
}

.series-info {
	flex: 1;
	min-width: 0;
}

.series-title {
	font-size: 0.875rem;
	font-weight: 600;
	color: var(--color-text);
	margin-bottom: 0.375rem;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.series-badges {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
	margin-bottom: 0.25rem;
}

.issue-badge {
	padding: 0.125rem 0.5rem;
	font-size: 0.6875rem;
	font-weight: 600;
	border-radius: 1rem;
}

.issue-badge.color-orange {
	color: var(--orange);
	background: var(--orange-soft);
}

.issue-badge.color-yellow {
	color: var(--yellow);
	background: var(--yellow-soft);
}

.issue-badge.color-red {
	color: var(--red);
	background: var(--red-soft);
}

.issue-badge.color-purple {
	color: var(--purple);
	background: var(--purple-soft);
}

.issue-badge.color-gray {
	color: var(--color-text-muted);
	background: var(--color-muted);
}

.failed-sources {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	font-size: 0.75rem;
	color: var(--color-text-muted);
}

/* Dark mode */
:root.dark .series-row {
	background: oklch(0.2 0.01 250);
}

:root.dark .filter-tab {
	background: oklch(0.2 0.01 250);
}
</style>
