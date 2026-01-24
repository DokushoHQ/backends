<script setup lang="ts">
definePageMeta({
	title: "Attention",
})

// Fetch duplicate count and recent duplicates
const { data: duplicatesData } = await useFetch("/api/v1/duplicates", {
	query: { status: "Pending", limit: 5 },
})

// Fetch issues with counts and preview
const { data: issuesData } = await useFetch("/api/v1/attention/issues", {
	query: { type: "all", limit: 5 },
})

// Fetch chapter health stats
const { data: chapterStats } = await useFetch("/api/v1/chapters/failed-stats")

// Fetch series with chapter data issues
const { data: chapterIssuesData } = await useFetch("/api/v1/attention/issues", {
	query: { type: "chapter_data_missing", limit: 5 },
})

const pendingDuplicates = computed(() => duplicatesData.value?.pagination?.total ?? 0)
const recentDuplicates = computed(() => duplicatesData.value?.groups?.slice(0, 5) ?? [])

const issueCounts = computed(() => issuesData.value?.counts ?? {
	all: 0,
	pending_deletion: 0,
	missing_cover: 0,
	scrape_failures: 0,
	chapter_data_missing: 0,
})
const recentIssues = computed(() => issuesData.value?.series?.slice(0, 5) ?? [])

const totalItems = computed(() => pendingDuplicates.value + issueCounts.value.all)

const issueTypes: Array<{ key: string, label: string, icon: string, color: "orange" | "yellow" | "red" | "purple" }> = [
	{ key: "pending_deletion", label: "Pending Deletion", icon: "i-lucide-trash-2", color: "orange" },
	{ key: "missing_cover", label: "Missing Cover", icon: "i-lucide-image-off", color: "yellow" },
	{ key: "scrape_failures", label: "Scrape Failed", icon: "i-lucide-wifi-off", color: "red" },
	{ key: "chapter_data_missing", label: "Chapter Data", icon: "i-lucide-file-warning", color: "purple" },
]

// Chapter health data
const chapterHealthData = computed(() => ({
	pendingChapters: chapterStats.value?.pendingChapters ?? 0,
	failedChapters: chapterStats.value?.failedChapters ?? 0,
	partialChapters: chapterStats.value?.partialChapters ?? 0,
	failedPages: chapterStats.value?.failedPages ?? 0,
}))

const chapterHealthSeries = computed(() =>
	(chapterIssuesData.value?.series ?? []).slice(0, 5),
)

const hasChapterIssues = computed(() =>
	chapterHealthData.value.pendingChapters > 0
	|| chapterHealthData.value.failedChapters > 0
	|| chapterHealthData.value.partialChapters > 0,
)
</script>

<template>
	<div class="attention-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UDashboardNavbar title="Attention Center">
					<template #description>
						<span
							class="status-pill"
							:class="{ 'all-clear': totalItems === 0 }"
						>
							<span class="status-dot" />
							{{ totalItems === 0 ? 'All clear' : `${totalItems} items need review` }}
						</span>
					</template>
				</UDashboardNavbar>
			</template>

			<template #body>
				<div class="attention-content">
					<!-- All clear state -->
					<div
						v-if="totalItems === 0"
						class="all-clear-state"
					>
						<div class="clear-icon">
							<UIcon
								name="i-lucide-sparkles"
								class="h-10 w-10"
							/>
						</div>
						<h2>Everything looks great</h2>
						<p>Your library is healthy. No duplicates or issues detected.</p>
						<NuxtLink
							to="/attention/duplicates"
							class="scan-link"
						>
							<UIcon
								name="i-lucide-radar"
								class="h-4 w-4"
							/>
							Run duplicate scan
						</NuxtLink>
					</div>

					<!-- Main content when there are items -->
					<template v-else>
						<!-- Stats overview -->
						<div class="stats-section">
							<UiStatCardGrid :cols="5">
								<UiStatCard
									:value="pendingDuplicates"
									label="Duplicates"
									icon="i-lucide-copy"
									color="purple"
								/>
								<UiStatCard
									v-for="issue in issueTypes"
									:key="issue.key"
									:value="issueCounts[issue.key as keyof typeof issueCounts]"
									:label="issue.label"
									:icon="issue.icon"
									:color="issue.color"
								/>
							</UiStatCardGrid>
						</div>

						<!-- Main sections -->
						<div class="sections-grid">
							<!-- Duplicates section -->
							<UiContentCard
								title="Duplicate Series"
								:description="`${pendingDuplicates} pairs to review`"
								icon="i-lucide-copy"
								color="purple"
								link-to="/attention/duplicates"
							>
								<div
									v-if="recentDuplicates.length > 0"
									class="preview-list"
								>
									<AttentionDuplicateRow
										v-for="group in recentDuplicates"
										:key="group.id"
										:group="group"
									/>
								</div>

								<div
									v-else
									class="empty-preview"
								>
									<p>No duplicates detected</p>
								</div>
							</UiContentCard>

							<!-- Issues section -->
							<UiContentCard
								title="Series Issues"
								:description="`${issueCounts.all} series need attention`"
								icon="i-lucide-alert-triangle"
								color="amber"
								link-to="/attention/issues"
							>
								<div
									v-if="recentIssues.length > 0"
									class="preview-list"
								>
									<AttentionIssueRow
										v-for="serie in recentIssues"
										:key="serie.id"
										:serie="serie"
									/>
								</div>

								<div
									v-else
									class="empty-preview"
								>
									<p>No issues detected</p>
								</div>
							</UiContentCard>

							<!-- Chapter Health section -->
							<AttentionChapterHealthCard
								v-if="hasChapterIssues"
								:pending-chapters="chapterHealthData.pendingChapters"
								:failed-chapters="chapterHealthData.failedChapters"
								:partial-chapters="chapterHealthData.partialChapters"
								:failed-pages="chapterHealthData.failedPages"
								:series="chapterHealthSeries"
							/>
						</div>
					</template>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
.attention-content {
	padding: 1rem;
}

/* Status pill */
.status-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.25rem 0.75rem;
	font-size: 0.8125rem;
	font-weight: 500;
	color: var(--ui-warning);
	background: var(--ui-warning-soft);
	border-radius: 2rem;
}

.status-pill.all-clear {
	color: var(--ui-success);
	background: var(--ui-success-soft);
}

.status-dot {
	width: 0.5rem;
	height: 0.5rem;
	border-radius: 50%;
	background: currentColor;
	animation: pulse 2s ease-in-out infinite;
}

.status-pill.all-clear .status-dot {
	animation: none;
}

@keyframes pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.4; }
}

/* All clear state */
.all-clear-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	text-align: center;
}

.clear-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 4.5rem;
	height: 4.5rem;
	margin-bottom: 1.5rem;
	border-radius: 50%;
	background: var(--ui-success-soft);
	color: var(--ui-success);
}

.all-clear-state h2 {
	font-size: 1.25rem;
	font-weight: 600;
	color: var(--ui-text);
	margin-bottom: 0.5rem;
}

.all-clear-state p {
	font-size: 0.875rem;
	color: var(--ui-text-muted);
	max-width: 24rem;
	margin-bottom: 1.5rem;
}

.scan-link {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.625rem 1.25rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--color-purple);
	background: var(--color-purple-soft);
	border-radius: 0.5rem;
	transition: all 0.15s ease;
}

.scan-link:hover {
	background: color-mix(in oklch, var(--color-purple) 20%, transparent);
}

/* Stats section */
.stats-section {
	margin-bottom: 1.5rem;
}

/* Sections grid */
.sections-grid {
	display: grid;
	gap: 1rem;
}

@media (min-width: 768px) {
	.sections-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (min-width: 1200px) {
	.sections-grid:has(> :nth-child(3)) {
		grid-template-columns: repeat(3, 1fr);
	}
}

/* Preview list */
.preview-list {
	display: flex;
	flex-direction: column;
	flex: 1;
}

/* Empty preview */
.empty-preview {
	padding: 2rem 1rem;
	text-align: center;
}

.empty-preview p {
	font-size: var(--font-size-md);
	color: var(--ui-text-muted);
}
</style>
