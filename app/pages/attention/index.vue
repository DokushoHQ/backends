<script setup lang="ts">
definePageMeta({
	title: "Attention",
})

// Fetch duplicate count and recent duplicates
const { data: duplicatesData } = await useFetch("/api/v1/duplicates", {
	query: { status: "Pending", limit: 3 },
})

// Fetch issues with counts and preview
const { data: issuesData } = await useFetch("/api/v1/attention/issues", {
	query: { type: "all", limit: 4 },
})

const pendingDuplicates = computed(() => duplicatesData.value?.pagination?.total ?? 0)
const recentDuplicates = computed(() => duplicatesData.value?.groups?.slice(0, 3) ?? [])

const issueCounts = computed(() => issuesData.value?.counts ?? {
	all: 0,
	pending_deletion: 0,
	missing_cover: 0,
	scrape_failures: 0,
	chapter_data_missing: 0,
})
const recentIssues = computed(() => issuesData.value?.series?.slice(0, 4) ?? [])

const totalItems = computed(() => pendingDuplicates.value + issueCounts.value.all)

const issueTypes: Array<{ key: string, label: string, icon: string, color: "orange" | "yellow" | "red" | "purple" }> = [
	{ key: "pending_deletion", label: "Pending Deletion", icon: "i-lucide-trash-2", color: "orange" },
	{ key: "missing_cover", label: "Missing Cover", icon: "i-lucide-image-off", color: "yellow" },
	{ key: "scrape_failures", label: "Scrape Failed", icon: "i-lucide-wifi-off", color: "red" },
	{ key: "chapter_data_missing", label: "Chapter Data", icon: "i-lucide-file-warning", color: "purple" },
]

function getIssueColor(issue: string) {
	return issueTypes.find(t => t.key === issue)?.color ?? "gray"
}
</script>

<template>
	<div class="attention-page">
		<UDashboardPanel>
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
									<NuxtLink
										v-for="group in recentDuplicates"
										:key="group.id"
										to="/attention/duplicates"
										class="preview-item duplicate-preview"
									>
										<div class="duplicate-covers">
											<div class="cover-stack">
												<div
													v-for="(serie, idx) in group.series.slice(0, 2)"
													:key="serie.id"
													class="stacked-cover"
													:style="{ '--idx': idx }"
												>
													<NuxtImg
														v-if="serie.cover"
														:src="serie.cover"
														:alt="serie.title"
														class="cover-img"
													/>
													<div
														v-else
														class="cover-placeholder"
													>
														<UIcon
															name="i-lucide-image"
															class="h-4 w-4"
														/>
													</div>
												</div>
											</div>
										</div>
										<div class="preview-info">
											<span class="preview-title">{{ group.series[0]?.title }}</span>
											<span class="preview-meta">
												<span class="confidence">{{ group.confidence }}% match</span>
											</span>
										</div>
										<UIcon
											name="i-lucide-chevron-right"
											class="h-4 w-4 text-muted-foreground"
										/>
									</NuxtLink>
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
									<NuxtLink
										v-for="serie in recentIssues"
										:key="serie.id"
										:to="`/series/${serie.id}`"
										class="preview-item"
									>
										<div class="serie-cover">
											<NuxtImg
												v-if="serie.cover"
												:src="serie.cover"
												:alt="serie.title"
												class="cover-img"
											/>
											<div
												v-else
												class="cover-placeholder"
											>
												<UIcon
													name="i-lucide-image-off"
													class="h-4 w-4"
												/>
											</div>
										</div>
										<div class="preview-info">
											<span class="preview-title">{{ serie.title }}</span>
											<div class="issue-badges">
												<span
													v-for="issue in serie.issues.slice(0, 2)"
													:key="issue"
													class="issue-badge"
													:class="`color-${getIssueColor(issue)}`"
												>
													{{ issueTypes.find(t => t.key === issue)?.label }}
												</span>
												<span
													v-if="serie.issues.length > 2"
													class="issue-badge color-gray"
												>
													+{{ serie.issues.length - 2 }}
												</span>
											</div>
										</div>
										<UIcon
											name="i-lucide-chevron-right"
											class="h-4 w-4 text-muted-foreground"
										/>
									</NuxtLink>
								</div>

								<div
									v-else
									class="empty-preview"
								>
									<p>No issues detected</p>
								</div>
							</UiContentCard>
						</div>
					</template>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
.attention-page {
	--purple: oklch(0.7 0.15 280);
	--purple-soft: oklch(0.7 0.15 280 / 0.12);
	--amber: oklch(0.75 0.15 70);
	--amber-soft: oklch(0.75 0.15 70 / 0.12);
	--orange: oklch(0.72 0.16 45);
	--orange-soft: oklch(0.72 0.16 45 / 0.12);
	--yellow: oklch(0.8 0.14 85);
	--yellow-soft: oklch(0.8 0.14 85 / 0.12);
	--red: oklch(0.65 0.2 25);
	--red-soft: oklch(0.65 0.2 25 / 0.12);
	--success: oklch(0.72 0.15 160);
	--success-soft: oklch(0.72 0.15 160 / 0.12);
}

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
	color: var(--amber);
	background: var(--amber-soft);
	border-radius: 2rem;
}

.status-pill.all-clear {
	color: var(--success);
	background: var(--success-soft);
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
	background: var(--success-soft);
	color: var(--success);
}

.all-clear-state h2 {
	font-size: 1.25rem;
	font-weight: 600;
	color: var(--color-text);
	margin-bottom: 0.5rem;
}

.all-clear-state p {
	font-size: 0.875rem;
	color: var(--color-text-muted);
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
	color: var(--purple);
	background: var(--purple-soft);
	border-radius: 0.5rem;
	transition: all 0.15s ease;
}

.scan-link:hover {
	background: oklch(0.7 0.15 280 / 0.2);
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

/* Preview list */
.preview-list {
	display: flex;
	flex-direction: column;
}

.preview-item {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	text-decoration: none;
	transition: background 0.15s ease;
	border-bottom: 1px solid var(--color-border);
}

.preview-item:last-child {
	border-bottom: none;
}

.preview-item:hover {
	background: var(--color-muted);
}

.serie-cover {
	width: 2.5rem;
	height: 3.5rem;
	border-radius: 0.25rem;
	overflow: hidden;
	background: var(--color-muted);
	flex-shrink: 0;
}

.cover-img {
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

/* Duplicate preview with stacked covers */
.duplicate-covers {
	width: 3.5rem;
	flex-shrink: 0;
}

.cover-stack {
	position: relative;
	width: 2.5rem;
	height: 3.5rem;
}

.stacked-cover {
	position: absolute;
	width: 2rem;
	height: 2.75rem;
	border-radius: 0.25rem;
	overflow: hidden;
	background: var(--color-muted);
	border: 2px solid var(--color-background);
	transition: transform 0.15s ease;
}

.stacked-cover:nth-child(1) {
	z-index: 2;
	left: 0;
	top: 0;
}

.stacked-cover:nth-child(2) {
	z-index: 1;
	left: 0.75rem;
	top: 0.5rem;
}

.preview-item:hover .stacked-cover:nth-child(2) {
	transform: translateX(2px);
}

.preview-info {
	flex: 1;
	min-width: 0;
}

.preview-title {
	display: block;
	font-size: var(--font-size-md);
	font-weight: 500;
	color: var(--color-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	margin-bottom: 0.25rem;
}

.preview-meta {
	font-size: var(--font-size-sm);
	color: var(--color-text-muted);
}

.confidence {
	color: var(--purple);
	font-weight: 500;
}

/* Issue badges */
.issue-badges {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
}

.issue-badge {
	padding: 0.1875rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 0.25rem;
}

.issue-badge.color-orange { color: var(--orange); background: var(--orange-soft); }
.issue-badge.color-yellow { color: var(--yellow); background: var(--yellow-soft); }
.issue-badge.color-red { color: var(--red); background: var(--red-soft); }
.issue-badge.color-purple { color: var(--purple); background: var(--purple-soft); }
.issue-badge.color-gray { color: var(--color-text-muted); background: var(--color-muted); }

/* Empty preview */
.empty-preview {
	padding: 2rem 1rem;
	text-align: center;
}

.empty-preview p {
	font-size: var(--font-size-md);
	color: var(--color-text-muted);
}
</style>
