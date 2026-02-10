<script setup lang="ts">
interface Job {
	id: string
	name: string
	data: unknown
	opts: {
		priority?: number
		[key: string]: unknown
	}
	progress: number | string | object
	timestamp?: number
	processedOn?: number
	finishedOn?: number
	scheduledAt?: number
	delay?: number
	attemptsMade: number
	failedReason?: string
	stacktrace?: string[]
	logs?: string[]
	returnvalue?: unknown
	state?: string
}

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

interface QueueApiResponse {
	queue: {
		name: string
		displayName: string
	}
	stats: QueueStats
	jobs: Job[]
	pagination: {
		page: number
		pageSize: number
		totalCount: number
		totalPages: number
	}
}

const route = useRoute()
const router = useRouter()
const queueName = route.params.queue as string

definePageMeta({
	title: "Queue Details",
	layout: "default",
})

const currentStatus = computed(() => (route.query.status as string) || "latest")
const currentPage = computed(() => Math.max(1, Number.parseInt(String(route.query.page || "1"), 10)))

const { data, error, status, refresh } = await useLazyFetch<QueueApiResponse>(`/api/jobs/${queueName}`, {
	query: {
		status: currentStatus,
		page: currentPage,
	},
	watch: [currentStatus, currentPage],
})

if (error.value) {
	console.error("Queue fetch error:", error.value)
}

// Two-way binding for segmented control
const selectedStatus = computed({
	get: () => currentStatus.value,
	set: (value: string) => router.push({ query: { ...route.query, status: value, page: undefined } }),
})

function getTabCount(key: string): number | undefined {
	if (!data.value?.stats || key === "latest") return undefined
	if (key === "waiting") {
		const stats = data.value.stats
		return stats.waiting + stats.prioritized + stats.waitingChildren
	}
	return data.value.stats[key as keyof QueueStats] as number | undefined
}

const statusOptions = computed(() => [
	{ label: "Latest", value: "latest" },
	{ label: "Active", value: "active", count: getTabCount("active") },
	{ label: "Waiting", value: "waiting", count: getTabCount("waiting") },
	{ label: "Completed", value: "completed", count: getTabCount("completed") },
	{ label: "Failed", value: "failed", count: getTabCount("failed") },
	{ label: "Delayed", value: "delayed", count: getTabCount("delayed") },
])

function setPage(page: number) {
	router.push({ query: { ...route.query, page: page > 1 ? page : undefined } })
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

// Job actions
const actionPending = ref(false)

async function retryJob(jobId: string) {
	actionPending.value = true
	try {
		await $fetch(`/api/jobs/${queueName}/${jobId}/retry`, { method: "POST" })
		refresh()
	}
	catch (err) {
		console.error("Failed to retry job:", err)
	}
	finally {
		actionPending.value = false
	}
}

async function deleteJob(jobId: string) {
	actionPending.value = true
	try {
		await $fetch(`/api/jobs/${queueName}/${jobId}`, { method: "DELETE" })
		refresh()
	}
	catch (err) {
		console.error("Failed to delete job:", err)
	}
	finally {
		actionPending.value = false
	}
}

async function promoteJob(jobId: string) {
	actionPending.value = true
	try {
		await $fetch(`/api/jobs/${queueName}/${jobId}/promote`, { method: "POST" })
		refresh()
	}
	catch (err) {
		console.error("Failed to promote job:", err)
	}
	finally {
		actionPending.value = false
	}
}

// Queue pause/resume
const queuePausePending = ref(false)

async function toggleQueuePause() {
	queuePausePending.value = true
	try {
		const endpoint = data.value?.stats?.paused
			? `/api/jobs/${queueName}/resume`
			: `/api/jobs/${queueName}/pause`
		await $fetch(endpoint, { method: "POST" })
		refresh()
	}
	catch (err) {
		console.error("Failed to toggle queue pause state:", err)
	}
	finally {
		queuePausePending.value = false
	}
}

// Duplicate dialog
const duplicateDialogOpen = ref(false)
const duplicateJob = ref<Job | null>(null)

function openDuplicateDialog(job: Job) {
	duplicateJob.value = job
	duplicateDialogOpen.value = true
}

async function handleDuplicate(input: { name: string, data: unknown, opts?: unknown }) {
	try {
		await $fetch(`/api/jobs/${queueName}/duplicate`, {
			method: "POST",
			body: input,
		})
		duplicateDialogOpen.value = false
		refresh()
	}
	catch (err) {
		console.error("Failed to duplicate job:", err)
	}
}
</script>

<template>
	<UDashboardPanel class="queue-page">
		<template #header>
			<UiPageHeader
				:items="[
					{ label: 'Jobs', to: '/dashboard/jobs' },
					{ label: data?.queue.displayName ?? queueName },
				]"
				back-to="/dashboard/jobs"
			>
				<template #right>
					<UButton
						:variant="data?.stats?.paused ? 'solid' : 'outline'"
						:color="data?.stats?.paused ? 'primary' : 'neutral'"
						size="sm"
						:loading="queuePausePending"
						class="shrink-0"
						@click="toggleQueuePause"
					>
						<UIcon
							:name="data?.stats?.paused ? 'i-lucide-play' : 'i-lucide-pause'"
							class="h-4 w-4 sm:mr-2"
						/>
						<span class="hidden sm:inline">{{ data?.stats?.paused ? "Resume Queue" : "Pause Queue" }}</span>
					</UButton>
				</template>
			</UiPageHeader>
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
					Failed to load queue
				</h3>
				<p class="error-message">
					{{ error.message }}
				</p>
			</div>

			<div
				v-else-if="data"
				class="page-content"
			>
				<!-- Status tabs -->
				<UiSegmentedControl
					v-model="selectedStatus"
					:options="statusOptions"
					class="w-full"
				/>

				<!-- Empty state -->
				<div
					v-if="data.jobs.length === 0"
					class="empty-state"
				>
					<div class="empty-icon-wrapper">
						<UIcon
							name="i-lucide-briefcase"
							class="empty-icon"
						/>
					</div>
					<h3 class="empty-title">
						No {{ currentStatus }} jobs
					</h3>
					<p class="empty-message">
						There are no {{ currentStatus }} jobs in this queue.
					</p>
				</div>

				<!-- Jobs list -->
				<div
					v-else
					class="jobs-list"
				>
					<JobsJobCard
						v-for="job in data.jobs"
						:key="job.id"
						:job="job"
						:action-pending="actionPending"
						@retry="retryJob"
						@delete="deleteJob"
						@promote="promoteJob"
						@duplicate="openDuplicateDialog"
					/>
				</div>

				<!-- Pagination -->
				<UiPagination
					:page="currentPage"
					:total-pages="data.pagination.totalPages"
					@update:page="setPage"
				/>
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

			<!-- Duplicate Dialog -->
			<JobsDuplicateDialog
				v-model:open="duplicateDialogOpen"
				:job="duplicateJob"
				@submit="handleDuplicate"
			/>
		</template>
	</UDashboardPanel>
</template>

<style scoped>
.queue-page {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
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

/* Jobs list */
.jobs-list {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
</style>
