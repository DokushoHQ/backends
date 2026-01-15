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
	{ label: "Last Week", value: "week" },
	{ label: "Last Month", value: "month" },
]

const { data, error, refresh } = await useFetch("/api/dashboard/stats", {
	query: { activityRange },
})

watch(activityRange, () => refresh())

if (error.value) {
	console.error("Dashboard stats error:", error.value)
}

// Issue badge info
function getIssueBadge(issue: string) {
	switch (issue) {
		case "pending_deletion":
			return { label: "Pending Deletion", color: "text-orange-600 bg-orange-100" }
		case "missing_cover":
			return { label: "Missing Cover", color: "text-yellow-600 bg-yellow-100" }
		case "scrape_failures":
			return { label: "Scrape Failed", color: "text-red-600 bg-red-100" }
		case "chapter_data_missing":
			return { label: "Chapter Data Missing", color: "text-purple-600 bg-purple-100" }
		default:
			return { label: issue, color: "text-gray-600 bg-gray-100" }
	}
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar
				title="Overview"
				description="Monitor your manga library at a glance"
			/>
		</template>

		<template #body>
			<div class="space-y-8">
				<!-- Stats Cards -->
				<div
					class="grid gap-4 md:grid-cols-2"
					:class="isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'"
				>
					<UCard>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<p class="text-sm font-medium text-muted-foreground">
									Total Series
								</p>
								<p class="text-2xl font-bold">
									{{ data?.stats.seriesCount?.toLocaleString() ?? 0 }}
								</p>
								<p class="text-xs text-muted-foreground">
									In your library
								</p>
							</div>
							<div class="size-11 rounded-full bg-primary/10 flex items-center justify-center">
								<UIcon
									name="i-lucide-book-open"
									class="size-5 text-primary"
								/>
							</div>
						</div>
					</UCard>

					<UCard>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<p class="text-sm font-medium text-muted-foreground">
									Total Chapters
								</p>
								<p class="text-2xl font-bold">
									{{ data?.stats.chaptersCount?.toLocaleString() ?? 0 }}
								</p>
								<p class="text-xs text-muted-foreground">
									Across all series
								</p>
							</div>
							<div class="size-11 rounded-full bg-primary/10 flex items-center justify-center">
								<UIcon
									name="i-lucide-file-text"
									class="size-5 text-primary"
								/>
							</div>
						</div>
					</UCard>

					<UCard>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<p class="text-sm font-medium text-muted-foreground">
									Sources
								</p>
								<p class="text-2xl font-bold">
									{{ data?.stats.sourcesCount?.toLocaleString() ?? 0 }}
								</p>
								<p class="text-xs text-muted-foreground">
									Active scrapers
								</p>
							</div>
							<div class="size-11 rounded-full bg-primary/10 flex items-center justify-center">
								<UIcon
									name="i-lucide-server"
									class="size-5 text-primary"
								/>
							</div>
						</div>
					</UCard>

					<UCard v-if="isAdmin">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<p class="text-sm font-medium text-muted-foreground">
									Users
								</p>
								<p class="text-2xl font-bold">
									{{ data?.stats.usersCount?.toLocaleString() ?? 0 }}
								</p>
								<p class="text-xs text-muted-foreground">
									Registered accounts
								</p>
							</div>
							<div class="size-11 rounded-full bg-primary/10 flex items-center justify-center">
								<UIcon
									name="i-lucide-users"
									class="size-5 text-primary"
								/>
							</div>
						</div>
					</UCard>
				</div>

				<!-- Jobs Summary (Admin only) -->
				<UCard v-if="isAdmin">
					<template #header>
						<div class="flex items-center justify-between">
							<div>
								<h3 class="text-lg font-semibold">
									Job Queues
								</h3>
								<p class="text-sm text-muted-foreground">
									{{ data?.jobSummary?.total.toLocaleString() ?? 0 }} total jobs
									<span
										v-if="data?.jobSummary?.failed"
										class="text-red-500"
									>
										({{ data.jobSummary.failed }} failed)
									</span>
								</p>
							</div>
							<NuxtLink
								to="/jobs"
								class="text-sm text-primary hover:underline"
							>
								View all
							</NuxtLink>
						</div>
					</template>

					<div class="space-y-4">
						<!-- Mini Line Chart -->
						<JobsActivityChart :height="120" />

						<!-- Per-queue breakdown -->
						<div class="flex flex-wrap gap-2">
							<NuxtLink
								v-for="queue in data?.jobSummary?.queues"
								:key="queue.name"
								:to="`/jobs/${queue.name}`"
								class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm"
							>
								<span class="font-medium">{{ queue.displayName }}</span>
								<span class="text-muted-foreground">{{ queue.total ?? 0 }}</span>
								<span
									v-if="(queue.failed ?? 0) > 0"
									class="text-red-500 text-xs"
								>{{ queue.failed }} failed</span>
							</NuxtLink>
						</div>
					</div>
				</UCard>

				<!-- Series Needing Attention (Admin only) -->
				<UCard v-if="isAdmin">
					<template #header>
						<div class="flex items-center justify-between">
							<div>
								<h3 class="text-lg font-semibold flex items-center gap-2">
									<UIcon
										:name="data?.seriesNeedingAttention?.length ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle'"
										class="size-5"
										:class="data?.seriesNeedingAttention?.length ? 'text-orange-500' : 'text-green-500'"
									/>
									Series Needing Attention
								</h3>
								<p class="text-sm text-muted-foreground">
									{{ data?.seriesNeedingAttention?.length || 0 }} series with issues
								</p>
							</div>
						</div>
					</template>

					<!-- Empty state -->
					<div
						v-if="!data?.seriesNeedingAttention?.length"
						class="flex items-center justify-center py-8 text-center"
					>
						<div>
							<div class="size-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
								<UIcon
									name="i-lucide-check"
									class="size-6 text-green-600"
								/>
							</div>
							<p class="font-medium text-green-600">
								All good!
							</p>
							<p class="text-sm text-muted-foreground">
								No series need attention right now
							</p>
						</div>
					</div>

					<!-- Series list -->
					<div
						v-else
						class="-mx-4 divide-y"
					>
						<NuxtLink
							v-for="serie in data.seriesNeedingAttention"
							:key="serie.id"
							:to="`/series/${serie.id}`"
							class="flex items-center gap-4 py-3 px-4 hover:bg-muted/50 transition-colors"
						>
							<div class="relative h-14 w-10 shrink-0 rounded overflow-hidden bg-muted">
								<div class="absolute inset-0 flex items-center justify-center">
									<UIcon
										name="i-lucide-book-open"
										class="size-5 text-muted-foreground"
									/>
								</div>
								<img
									v-if="serie.cover"
									:src="serie.cover"
									:alt="serie.title"
									class="absolute inset-0 h-full w-full object-cover"
									referrerpolicy="no-referrer"
								>
							</div>
							<div class="flex-1 min-w-0">
								<p class="truncate font-medium">{{ serie.title }}</p>
								<div class="flex items-center gap-2 mt-1 flex-wrap">
									<span
										v-for="issue in serie.issues"
										:key="issue"
										class="text-xs px-2 py-0.5 rounded-full"
										:class="getIssueBadge(issue).color"
									>
										{{ getIssueBadge(issue).label }}
										<template v-if="issue === 'chapter_data_missing' && serie.chaptersNeedingData">
											({{ serie.chaptersNeedingData }})
										</template>
									</span>
									<span
										v-for="source in serie.failedSources"
										:key="source.name"
										class="text-xs text-muted-foreground"
									>
										{{ source.name }}: {{ source.failures }} failures
									</span>
								</div>
							</div>
						</NuxtLink>
					</div>
				</UCard>

				<!-- Two Column Grid -->
				<div class="grid gap-6 lg:grid-cols-2">
					<!-- Recently Added Series -->
					<UCard>
						<template #header>
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-lg font-semibold">
										Recently Added
									</h3>
									<p class="text-sm text-muted-foreground">
										New series in your library
									</p>
								</div>
								<NuxtLink
									to="/series"
									class="text-sm text-primary hover:underline"
								>
									View all
								</NuxtLink>
							</div>
						</template>

						<div class="space-y-4">
							<NuxtLink
								v-for="serie in data?.recentlyAddedSeries"
								:key="serie.id"
								:to="`/series/${serie.id}`"
								class="flex items-center gap-4 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors"
							>
								<div class="relative h-14 w-10 shrink-0 rounded overflow-hidden bg-muted">
									<div class="absolute inset-0 flex items-center justify-center">
										<UIcon
											name="i-lucide-book-open"
											class="size-5 text-muted-foreground"
										/>
									</div>
									<img
										v-if="serie.cover"
										:src="serie.cover"
										:alt="serie.title"
										class="absolute inset-0 h-full w-full object-cover"
										referrerpolicy="no-referrer"
									>
								</div>
								<div class="flex-1 min-w-0">
									<p class="truncate font-medium">{{ serie.title }}</p>
									<div class="flex items-center gap-2 mt-1">
										<UBadge variant="subtle">
											{{ serie._count.chapters }} ch
										</UBadge>
										<span class="text-xs text-muted-foreground">
											{{ formatRelativeTime(serie.created_at) }}
										</span>
									</div>
								</div>
							</NuxtLink>
							<p
								v-if="!data?.recentlyAddedSeries?.length"
								class="text-sm text-muted-foreground text-center py-4"
							>
								No series added yet
							</p>
						</div>
					</UCard>

					<!-- Recent Activity -->
					<UCard>
						<template #header>
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-lg font-semibold">
										Recent Activity
									</h3>
									<p class="text-sm text-muted-foreground">
										Series with new chapters
									</p>
								</div>
								<USelect
									v-model="activityRange"
									:items="activityRangeOptions"
									size="sm"
									class="w-32"
								/>
							</div>
						</template>

						<div class="space-y-4">
							<NuxtLink
								v-for="activity in data?.recentActivity"
								:key="activity.serie.id"
								:to="`/series/${activity.serie.id}`"
								class="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors"
							>
								<div class="relative h-12 w-9 shrink-0 rounded overflow-hidden bg-muted">
									<div class="absolute inset-0 flex items-center justify-center">
										<UIcon
											name="i-lucide-book-open"
											class="size-4 text-muted-foreground"
										/>
									</div>
									<img
										v-if="activity.serie.cover"
										:src="activity.serie.cover"
										:alt="activity.serie.title"
										class="absolute inset-0 h-full w-full object-cover"
										referrerpolicy="no-referrer"
									>
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium truncate">{{ activity.serie.title }}</p>
									<p class="text-xs text-muted-foreground flex items-center gap-2">
										<span class="flex items-center gap-1">
											<UIcon
												name="i-lucide-plus"
												class="size-3"
											/>
											{{ activity.chapterCount }} {{ activity.chapterCount === 1 ? 'chapter' : 'chapters' }}
										</span>
										<span class="flex items-center gap-1">
											<UIcon
												name="i-lucide-clock"
												class="size-3"
											/>
											{{ formatRelativeTime(activity.latestUpdate) }}
										</span>
									</p>
								</div>
							</NuxtLink>
							<div
								v-if="!data?.recentActivity?.length"
								class="flex items-center justify-center py-8 text-center"
							>
								<div>
									<div class="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
										<UIcon
											name="i-lucide-calendar-off"
											class="size-6 text-muted-foreground"
										/>
									</div>
									<p class="font-medium">
										No activity
									</p>
									<p class="text-sm text-muted-foreground">
										No chapters added in this period
									</p>
								</div>
							</div>
						</div>
					</UCard>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
