<script setup lang="ts">
definePageMeta({
	title: "Overview",
	layout: "default",
})

const { isAdmin } = await useAuth()
const { formatRelativeTime } = useFormatters()

// Activity range selector
const activityRange = ref("today")
const activityRangeOptions = [
	{ label: "Today", value: "today" },
	{ label: "Yesterday", value: "yesterday" },
	{ label: "Week", value: "week" },
	{ label: "Month", value: "month" },
]

const { data, error } = await useFetch("/api/dashboard/stats")

// Lazy fetch recent activity separately
const { data: activityData, status: activityStatus } = await useLazyFetch("/api/dashboard/activity", {
	query: { activityRange },
	watch: [activityRange],
})

// Lazy fetch admin sections
const { data: attentionData, status: attentionStatus } = await useLazyFetch("/api/dashboard/attention", {
	immediate: isAdmin.value,
})

const { data: jobsData, status: jobsStatus } = await useLazyFetch("/api/jobs", {
	immediate: isAdmin.value,
})

const { data: metricsData } = await useLazyFetch("/api/queue-metrics-daily", {
	query: { days: 7 },
	immediate: isAdmin.value,
})

if (error.value) {
	console.error("Dashboard stats error:", error.value)
}

// Issue type to CSS class mapping
function getIssueType(issue: string): string {
	switch (issue) {
		case "pending_deletion":
			return "type-deletion"
		case "missing_cover":
			return "type-cover"
		case "scrape_failures":
			return "type-scrape"
		case "chapter_data_missing":
			return "type-chapter"
		default:
			return "type-default"
	}
}

function getIssueLabel(issue: string): string {
	switch (issue) {
		case "pending_deletion":
			return "Pending Deletion"
		case "missing_cover":
			return "Missing Cover"
		case "scrape_failures":
			return "Scrape Failed"
		case "chapter_data_missing":
			return "Chapter Data Missing"
		default:
			return issue
	}
}
</script>

<template>
	<div class="overview-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UiPageHeader
					title="Overview"
					description="Monitor your manga library at a glance"
				/>
			</template>

			<template #body>
				<div class="page-content">
					<!-- Stats Cards -->
					<UiStatCardGrid :cols="isAdmin ? 4 : 3">
						<UiStatCard
							:value="data?.stats.seriesCount?.toLocaleString() ?? 0"
							label="Total Series"
							icon="i-lucide-book-open"
							color="blue"
						/>
						<UiStatCard
							:value="data?.stats.chaptersCount?.toLocaleString() ?? 0"
							label="Total Chapters"
							icon="i-lucide-file-text"
							color="blue"
						/>
						<UiStatCard
							:value="data?.stats.sourcesCount?.toLocaleString() ?? 0"
							label="Active Sources"
							icon="i-lucide-server"
							color="green"
						/>
						<UiStatCard
							v-if="isAdmin"
							:value="data?.stats.usersCount?.toLocaleString() ?? 0"
							label="Registered Users"
							icon="i-lucide-users"
							color="purple"
						/>
					</UiStatCardGrid>

					<!-- Jobs Summary (Admin only) -->
					<UiContentCard
						v-if="isAdmin"
						title="Job Queues"
						:description="jobsStatus === 'pending' ? 'Loading...' : `${jobsData?.totalJobs?.toLocaleString() ?? 0} total jobs`"
						icon="i-lucide-briefcase"
						color="blue"
						link-to="/jobs"
					>
						<div class="jobs-content">
							<!-- Daily Summary Chart -->
							<div class="chart-section">
								<JobsDailySummaryChart :data="metricsData?.aggregated.daily ?? []" />
							</div>

							<!-- Loading state -->
							<div
								v-if="jobsStatus === 'pending'"
								class="loading-state"
							>
								<UIcon
									name="i-lucide-loader-2"
									class="loading-spinner"
								/>
							</div>

							<!-- Per-queue breakdown -->
							<div
								v-else
								class="queue-pills"
							>
								<NuxtLink
									v-for="queue in jobsData?.stats"
									:key="queue.name"
									:to="`/jobs/${queue.name}`"
									class="queue-pill"
								>
									<span class="queue-name">{{ queue.displayName }}</span>
									<span class="queue-count">{{ queue.total ?? 0 }}</span>
									<span
										v-if="(queue.failed ?? 0) > 0"
										class="queue-failed"
									>{{ queue.failed }} failed</span>
								</NuxtLink>
							</div>
						</div>
					</UiContentCard>

					<!-- Series Needing Attention (Admin only) -->
					<UiContentCard
						v-if="isAdmin"
						title="Series Needing Attention"
						:description="attentionStatus === 'pending' ? 'Loading...' : 'Series with issues'"
						:icon="attentionStatus !== 'pending' && attentionData?.length ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle'"
						:color="attentionStatus !== 'pending' && attentionData?.length ? 'orange' : 'green'"
						link-to="/attention"
					>
						<!-- Loading state -->
						<div
							v-if="attentionStatus === 'pending'"
							class="loading-state"
						>
							<UIcon
								name="i-lucide-loader-2"
								class="loading-spinner"
							/>
						</div>

						<!-- Empty state -->
						<div
							v-else-if="!attentionData?.length"
							class="empty-state success"
						>
							<div class="empty-icon success-icon">
								<UIcon
									name="i-lucide-check"
									class="h-6 w-6"
								/>
							</div>
							<span class="empty-title success-text">All good!</span>
							<span class="empty-description">No series need attention right now</span>
						</div>

						<!-- Series list -->
						<div
							v-else
							class="series-list"
						>
							<NuxtLink
								v-for="serie in attentionData"
								:key="serie.id"
								:to="`/series/${serie.id}`"
								class="series-row"
							>
								<div class="series-cover">
									<div class="cover-placeholder">
										<UIcon
											name="i-lucide-book-open"
											class="h-5 w-5"
										/>
									</div>
									<NuxtImg
										v-if="serie.cover"
										:src="serie.cover"
										:alt="serie.title"
										class="cover-image"
									/>
								</div>
								<div class="series-info">
									<span class="series-title">{{ serie.title }}</span>
									<div class="series-badges">
										<span
											v-for="issue in serie.issues"
											:key="issue"
											class="issue-badge"
											:class="getIssueType(issue)"
										>
											{{ getIssueLabel(issue) }}
											<template v-if="issue === 'chapter_data_missing' && serie.chaptersNeedingData">
												({{ serie.chaptersNeedingData }})
											</template>
										</span>
										<span
											v-for="source in serie.failedSources"
											:key="source.name"
											class="failure-info"
										>
											{{ source.name }}: {{ source.failures }} failures
										</span>
									</div>
								</div>
							</NuxtLink>
						</div>
					</UiContentCard>

					<!-- Two Column Grid -->
					<div class="two-column-grid">
						<!-- Recently Added Series -->
						<UiContentCard
							title="Recently Added"
							description="New series in your library"
							icon="i-lucide-plus-circle"
							color="green"
							link-to="/series"
						>
							<div
								v-if="data?.recentlyAddedSeries?.length"
								class="series-list compact"
							>
								<NuxtLink
									v-for="serie in data.recentlyAddedSeries"
									:key="serie.id"
									:to="`/series/${serie.id}`"
									class="series-row"
								>
									<div class="series-cover">
										<div class="cover-placeholder">
											<UIcon
												name="i-lucide-book-open"
												class="h-5 w-5"
											/>
										</div>
										<NuxtImg
											v-if="serie.cover"
											:src="serie.cover"
											:alt="serie.title"
											class="cover-image"
										/>
									</div>
									<div class="series-info">
										<span class="series-title">{{ serie.title }}</span>
										<div class="series-meta">
											<span class="chapter-count">{{ serie._count.chapters }} chapters</span>
											<span class="time-info">{{ formatRelativeTime(serie.created_at) }}</span>
										</div>
									</div>
								</NuxtLink>
							</div>
							<div
								v-else
								class="empty-state"
							>
								<span class="empty-description">No series added yet</span>
							</div>
						</UiContentCard>

						<!-- Recent Activity -->
						<UiContentCard
							title="Recent Activity"
							description="Series with new chapters"
							icon="i-lucide-activity"
							color="purple"
						>
							<template #header-actions>
								<UiSegmentedControl
									v-model="activityRange"
									:options="activityRangeOptions"
								/>
							</template>

							<!-- Loading state -->
							<div
								v-if="activityStatus === 'pending'"
								class="loading-state"
							>
								<UIcon
									name="i-lucide-loader-2"
									class="loading-spinner"
								/>
							</div>

							<!-- Activity list -->
							<template v-else>
								<div
									v-if="activityData?.length"
									class="series-list compact"
								>
									<NuxtLink
										v-for="activity in activityData"
										:key="activity.serie.id"
										:to="`/series/${activity.serie.id}`"
										class="series-row"
									>
										<div class="series-cover small">
											<div class="cover-placeholder">
												<UIcon
													name="i-lucide-book-open"
													class="h-4 w-4"
												/>
											</div>
											<NuxtImg
												v-if="activity.serie.cover"
												:src="activity.serie.cover"
												:alt="activity.serie.title"
												class="cover-image"
											/>
										</div>
										<div class="series-info">
											<span class="series-title">{{ activity.serie.title }}</span>
											<div class="series-meta">
												<span class="chapter-update">
													<UIcon
														name="i-lucide-plus"
														class="h-3 w-3"
													/>
													{{ activity.chapterCount }} {{ activity.chapterCount === 1 ? 'chapter' : 'chapters' }}
												</span>
												<span class="time-info">
													<UIcon
														name="i-lucide-clock"
														class="h-3 w-3"
													/>
													{{ formatRelativeTime(activity.latestUpdate) }}
												</span>
											</div>
										</div>
									</NuxtLink>
								</div>
								<div
									v-else
									class="empty-state"
								>
									<div class="empty-icon">
										<UIcon
											name="i-lucide-calendar-off"
											class="h-6 w-6"
										/>
									</div>
									<span class="empty-title">No activity</span>
									<span class="empty-description">No chapters added in this period</span>
								</div>
							</template>
						</UiContentCard>
					</div>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
/* Page content wrapper */
.page-content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

/* Two column grid */
.two-column-grid {
	display: grid;
	gap: 1.5rem;
	grid-template-columns: 1fr;
}

@media (min-width: 1024px) {
	.two-column-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}

/* Jobs content */
.jobs-content {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 1rem;
}

.chart-section {
	/*padding-bottom: 1rem;*/
	border-bottom: 1px solid var(--ui-border-muted);
}

/* Queue pills */
.queue-pills {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.queue-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
	background: var(--ui-bg-muted);
	border-radius: 2rem;
	font-size: var(--font-size-sm);
	transition: all 0.15s ease;
	text-decoration: none;
}

.queue-pill:hover {
	background: var(--ui-border);
}

.queue-name {
	font-weight: 500;
	color: var(--ui-text);
}

.queue-count {
	color: var(--ui-text-muted);
	font-variant-numeric: tabular-nums;
}

.queue-failed {
	font-size: var(--font-size-xs);
	color: var(--ui-error);
}

/* Series list */
.series-list {
	display: flex;
	flex-direction: column;
}

.series-list.compact {
	padding: 0.5rem 1rem;
}

/* Series row */
.series-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	transition: background 0.15s ease;
	text-decoration: none;
	border-bottom: 1px solid var(--ui-border-muted);
}

.series-list.compact .series-row {
	padding: 0.5rem 0;
	border-bottom: none;
}

.series-row:last-child {
	border-bottom: none;
}

.series-row:hover {
	background: var(--ui-bg-muted);
}

/* Series cover */
.series-cover {
	position: relative;
	width: 2.5rem;
	height: 3.5rem;
	border-radius: 0.375rem;
	overflow: hidden;
	flex-shrink: 0;
	background: var(--ui-bg-muted);
}

.series-cover.small {
	width: 2.25rem;
	height: 3rem;
}

.cover-placeholder {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--ui-text-muted);
}

.cover-image {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

/* Series info */
.series-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.series-title {
	font-size: var(--font-size-base);
	font-weight: 500;
	color: var(--ui-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.series-badges {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.375rem;
}

.series-meta {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

.chapter-count {
	font-weight: 500;
	color: var(--ui-text);
	background: var(--ui-bg-muted);
	padding: 0.125rem 0.5rem;
	border-radius: 0.25rem;
}

.chapter-update,
.time-info {
	display: flex;
	align-items: center;
	gap: 0.25rem;
}

/* Issue badges */
.issue-badge {
	display: inline-flex;
	align-items: center;
	padding: 0.125rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 2rem;
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}

.issue-badge.type-deletion {
	background: var(--ui-warning-soft);
	color: var(--ui-warning);
}

.issue-badge.type-cover {
	background: var(--ui-warning-soft);
	color: var(--ui-warning);
}

.issue-badge.type-scrape {
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

.issue-badge.type-chapter {
	background: var(--color-purple-soft);
	color: var(--color-purple);
}

.failure-info {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

/* Loading state */
.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rem;
}

.loading-spinner {
	width: 1.5rem;
	height: 1.5rem;
	color: var(--ui-text-muted);
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Empty state */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 2rem 1rem;
	text-align: center;
}

.empty-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 3rem;
	height: 3rem;
	margin-bottom: 0.75rem;
	border-radius: 50%;
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}

.empty-icon.success-icon {
	background: var(--ui-success-soft);
	color: var(--ui-success);
}

.empty-title {
	font-size: var(--font-size-base);
	font-weight: 500;
	color: var(--ui-text);
}

.empty-title.success-text {
	color: var(--ui-success);
}

.empty-description {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}
</style>
