<script setup lang="ts">
interface QueueStats {
	name: string
	displayName: string
	waiting: number
	prioritized: number
	waitingChildren: number
	active: number
	completed: number
	failed: number
	delayed: number
	paused: boolean
	total: number
}

interface JobsResponse {
	stats: QueueStats[]
	totalJobs: number
	totalActive: number
	totalWaiting: number
	totalCompleted: number
	totalFailed: number
	totalDelayed: number
}

definePageMeta({
	title: "Jobs",
	layout: "default",
})

const { data, error, status, refresh } = await useLazyFetch<JobsResponse>("/api/jobs")
const { data: redisInfo } = await useFetch("/api/redis-info")
const { data: metricsData } = await useFetch("/api/queue-metrics-daily", { query: { days: 14 } })

// Helper to get daily data for a queue
function getQueueDaily(queueName: string) {
	if (!metricsData.value?.perQueue[queueName]) return undefined
	return metricsData.value.perQueue[queueName].daily
}

// Chart queue selector
const selectedChartQueue = ref<string | undefined>(undefined)

const chartQueueLabel = computed(() => {
	if (!selectedChartQueue.value) return "All Queues"
	return metricsData.value?.perQueue[selectedChartQueue.value]?.displayName ?? "Select Queue"
})

const chartQueueMenuItems = computed(() => {
	const queueChildren = metricsData.value?.perQueue
		? Object.entries(metricsData.value.perQueue).map(([key, value]) => ({
				label: value.displayName,
				onSelect: () => {
					selectedChartQueue.value = key
				},
			}))
		: []

	return [
		{
			label: "All Queues",
			icon: "i-lucide-layers",
			onSelect: () => {
				selectedChartQueue.value = undefined
			},
		},
		{
			label: "Per Queue",
			icon: "i-lucide-list",
			children: queueChildren,
		},
	]
})

// Chart data based on selected queue
const chartData = computed(() => {
	if (!metricsData.value) return []

	if (selectedChartQueue.value) {
		const queueData = metricsData.value.perQueue[selectedChartQueue.value]
		if (queueData) return queueData.daily
	}

	return metricsData.value.aggregated.daily
})

if (error.value) {
	console.error("Jobs fetch error:", error.value)
}

// Queue pause/resume
const anyQueuePaused = computed(() =>
	data.value?.stats?.some(q => q.paused) ?? false,
)

const pauseAllPending = ref(false)

async function togglePauseAllQueues() {
	pauseAllPending.value = true
	try {
		const endpoint = anyQueuePaused.value ? "/api/jobs/resume-all" : "/api/jobs/pause-all"
		await $fetch(endpoint, { method: "POST" })
		refresh()
	}
	catch (err) {
		console.error("Failed to toggle queue pause state:", err)
	}
	finally {
		pauseAllPending.value = false
	}
}

// Auto-refresh every 5 seconds
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
	refreshInterval = setInterval(() => {
		refresh()
	}, 5000)
})

onUnmounted(() => {
	if (refreshInterval) {
		clearInterval(refreshInterval)
	}
})
</script>

<template>
	<UDashboardPanel class="jobs-page">
		<template #header>
			<UiPageHeader
				title="Job Queues"
				:description="`${data?.totalJobs.toLocaleString() ?? 0} total jobs`"
			>
				<template #right>
					<div class="flex items-center gap-2">
						<UButton
							variant="outline"
							size="sm"
							to="/jobs/settings"
							icon="i-lucide-settings"
							class="sm:hidden"
						/>
						<UButton
							variant="outline"
							size="sm"
							to="/jobs/settings"
							class="hidden sm:inline-flex"
						>
							<UIcon
								name="i-lucide-settings"
								class="size-4 mr-2"
							/>
							Settings
						</UButton>
						<UButton
							:variant="anyQueuePaused ? 'solid' : 'outline'"
							:color="anyQueuePaused ? 'primary' : 'neutral'"
							size="sm"
							:loading="pauseAllPending"
							:icon="anyQueuePaused ? 'i-lucide-play' : 'i-lucide-pause'"
							class="sm:hidden"
							@click="togglePauseAllQueues"
						/>
						<UButton
							:variant="anyQueuePaused ? 'solid' : 'outline'"
							:color="anyQueuePaused ? 'primary' : 'neutral'"
							size="sm"
							:loading="pauseAllPending"
							class="hidden sm:inline-flex"
							@click="togglePauseAllQueues"
						>
							<UIcon
								:name="anyQueuePaused ? 'i-lucide-play' : 'i-lucide-pause'"
								class="size-4 mr-2"
							/>
							{{ anyQueuePaused ? "Resume All" : "Pause All" }}
						</UButton>
					</div>
				</template>
			</UiPageHeader>
			<!-- Redis Info Bar -->
			<div
				v-if="redisInfo"
				class="redis-info-bar"
			>
				<div class="redis-stat">
					<span class="redis-value">{{ redisInfo.version }}</span>
					<span class="redis-label">Version</span>
				</div>
				<div class="redis-stat">
					<span class="redis-value">{{ redisInfo.uptimeDays }}</span>
					<span class="redis-label">Uptime (days)</span>
				</div>
				<div class="redis-stat">
					<span class="redis-value">{{ redisInfo.connectedClients }}</span>
					<span class="redis-label">Connections</span>
				</div>
				<div class="redis-stat">
					<span class="redis-value">{{ redisInfo.usedMemory }}</span>
					<span class="redis-label">Memory used</span>
				</div>
				<div
					v-if="redisInfo.maxMemory"
					class="redis-stat"
				>
					<span class="redis-value">{{ redisInfo.maxMemory }}</span>
					<span class="redis-label">Memory max</span>
				</div>
			</div>
		</template>

		<template #body>
			<!-- Loading state (only on initial load, not refreshes) -->
			<div
				v-if="status === 'pending' && !data"
				class="loading-state"
			>
				<UIcon
					name="i-lucide-loader-2"
					class="loading-icon"
				/>
			</div>

			<!-- Error state -->
			<div
				v-else-if="error"
				class="error-state"
			>
				<div class="error-icon-wrapper">
					<UIcon
						name="i-lucide-alert-circle"
						class="error-icon"
					/>
				</div>
				<h3 class="error-title">
					Failed to load jobs
				</h3>
				<p class="error-message">
					{{ error.statusCode === 403 ? "You don't have permission to view this page" : error.message }}
				</p>
			</div>

			<div
				v-else-if="data"
				class="page-content"
			>
				<!-- Global Stats -->
				<UiStatCardGrid :cols="5">
					<UiStatCard
						:value="data.totalActive.toLocaleString()"
						label="Active"
						icon="i-lucide-play"
						color="blue"
					/>
					<UiStatCard
						:value="data.totalWaiting.toLocaleString()"
						label="Waiting"
						icon="i-lucide-clock"
						color="amber"
					/>
					<UiStatCard
						:value="data.totalCompleted.toLocaleString()"
						label="Completed"
						icon="i-lucide-check-circle"
						color="green"
					/>
					<UiStatCard
						:value="data.totalFailed.toLocaleString()"
						label="Failed"
						icon="i-lucide-x-circle"
						:color="data.totalFailed > 0 ? 'red' : 'gray'"
					/>
					<UiStatCard
						:value="data.totalDelayed.toLocaleString()"
						label="Delayed"
						icon="i-lucide-timer"
						color="cyan"
					/>
				</UiStatCardGrid>

				<!-- Daily Activity Chart -->
				<UiContentCard
					title="Job Activity"
					description="Daily completed and failed jobs (last 14 days)"
					icon="i-lucide-activity"
					color="blue"
				>
					<template #header-actions>
						<UDropdownMenu :items="chartQueueMenuItems">
							<UButton
								:label="chartQueueLabel"
								color="neutral"
								variant="outline"
								size="xs"
								trailing-icon="i-lucide-chevron-down"
							/>
						</UDropdownMenu>
					</template>
					<JobsDailySummaryChart :data="chartData" />
				</UiContentCard>

				<!-- Empty state -->
				<div
					v-if="data.stats.length === 0"
					class="empty-state"
				>
					<div class="empty-icon-wrapper">
						<UIcon
							name="i-lucide-briefcase"
							class="empty-icon"
						/>
					</div>
					<h3 class="empty-title">
						No job queues
					</h3>
					<p class="empty-message">
						Job queues will appear here once workers are running.
					</p>
				</div>

				<!-- Queue cards -->
				<div
					v-else
					class="queue-grid"
				>
					<JobsQueueCard
						v-for="queue in data.stats"
						:key="queue.name"
						:queue="queue"
						:daily="getQueueDaily(queue.name)"
					/>
				</div>
			</div>

			<!-- Loading state -->
			<div
				v-else
				class="loading-state"
			>
				<UIcon
					name="i-lucide-loader-2"
					class="loading-icon"
				/>
			</div>
		</template>
	</UDashboardPanel>
</template>

<style scoped>
.jobs-page {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
}

/* Redis Info Bar */
.redis-info-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 2rem;
	padding: 0.5rem 1rem;
	background: var(--ui-bg-muted);
	border-top: 1px solid var(--ui-border);
}

.redis-stat {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.redis-value {
	font-size: var(--font-size-base);
	font-weight: 500;
	color: var(--ui-text);
}

.redis-label {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

/* Loading state */
.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 3rem;
}

.loading-icon {
	width: 2rem;
	height: 2rem;
	animation: spin 1s linear infinite;
	color: var(--ui-text-muted);
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Error state */
.error-state {
	padding: 3rem;
	text-align: center;
}

.error-icon-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 4rem;
	height: 4rem;
	margin: 0 auto 1rem;
	border-radius: 50%;
	background: var(--ui-error-soft);
}

.error-icon {
	width: 2rem;
	height: 2rem;
	color: var(--ui-error);
}

.error-title {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
}

.error-message {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin-top: 0.25rem;
}

/* Page content */
.page-content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

/* Empty state */
.empty-state {
	padding: 3rem;
	text-align: center;
}

.empty-icon-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 4rem;
	height: 4rem;
	margin: 0 auto 1rem;
	border-radius: 50%;
	background: var(--ui-bg-muted);
}

.empty-icon {
	width: 2rem;
	height: 2rem;
	color: var(--ui-text-muted);
}

.empty-title {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
}

.empty-message {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin-top: 0.25rem;
}

/* Queue grid */
.queue-grid {
	display: grid;
	gap: 1rem;
}

@media (min-width: 768px) {
	.queue-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
