<script setup lang="ts">
interface Job {
	id: string
	name: string
	data: unknown
	opts: unknown
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
}

interface QueueStats {
	name: string
	displayName: string
	waiting: number
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

const statusTabs = [
	{ key: "latest", label: "Latest" },
	{ key: "active", label: "Active" },
	{ key: "waiting", label: "Waiting" },
	{ key: "completed", label: "Completed" },
	{ key: "failed", label: "Failed" },
	{ key: "delayed", label: "Delayed" },
]

function getTabCount(key: string): number | null | undefined {
	if (!data.value?.stats || key === "latest") return null
	return data.value.stats[key as keyof QueueStats] as number | undefined
}

function setStatus(status: string) {
	router.push({ query: { ...route.query, status, page: undefined } })
}

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

// Utility functions
function getJobStatus(job: Job): { status: string, color: string } {
	if (job.failedReason) return { status: "failed", color: "text-red-600 border-red-600/50" }
	if (job.finishedOn) return { status: "completed", color: "text-green-600 border-green-600/50" }
	if (job.processedOn) return { status: "active", color: "text-blue-600 border-blue-600/50" }
	if (job.scheduledAt && !job.processedOn) return { status: "delayed", color: "text-cyan-600 border-cyan-600/50" }
	return { status: "waiting", color: "text-yellow-600 border-yellow-600/50" }
}

function formatTimestamp(ts: number | undefined): string {
	if (!ts) return "-"
	return new Date(ts).toLocaleString()
}

function formatDelay(ms: number): string {
	if (ms < 1000) return `${ms}ms`
	if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`
	if (ms < 3600000) return `${(ms / 60000).toFixed(0)}m`
	if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`
	return `${(ms / 86400000).toFixed(1)}d`
}

function formatDuration(start?: number, end?: number): string {
	if (!start || !end) return ""
	const ms = end - start
	if (ms < 1000) return `${ms}ms`
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
	return `${(ms / 60000).toFixed(1)}m`
}

function getProgressValue(progress: number | string | object): number {
	if (typeof progress === "number") return progress
	if (typeof progress === "string") return Number.parseInt(progress, 10) || 0
	return 0
}

// Get tab items for a job
function getJobTabItems(job: Job) {
	const items = [
		{ label: "Data", slot: "data" },
		{ label: "Options", slot: "options" },
		{ label: job.logs?.length ? `Logs (${job.logs.length})` : "Logs", slot: "logs" },
	]

	if (job.failedReason || (job.stacktrace && job.stacktrace.length > 0)) {
		const errorLabel = job.failedReason ? "Error" : "Errors"
		const stackLength = job.stacktrace?.length ?? 0
		const count = stackLength > 1 ? ` (${stackLength})` : ""
		items.push({ label: `${errorLabel}${count}`, slot: "error" })
	}

	if (job.returnvalue !== undefined && job.returnvalue !== null) {
		items.push({ label: "Result", slot: "result" })
	}

	return items
}

// Get default tab index for a job
function getJobDefaultTabIndex(job: Job): number {
	if (job.failedReason || (job.stacktrace && job.stacktrace.length > 0)) {
		// Find the error tab index
		const items = getJobTabItems(job)
		return items.findIndex(item => item.slot === "error")
	}
	return 0 // Default to Data tab
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar>
				<template #title>
					<UBreadcrumb
						:items="[
							{ label: 'Jobs', to: '/jobs' },
							{ label: data?.queue.displayName ?? queueName },
						]"
					/>
				</template>
				<template #right>
					<div class="flex items-center gap-1.5 sm:gap-2">
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
							<span class="hidden sm:inline">{{ data?.stats?.paused ? 'Resume Queue' : 'Pause Queue' }}</span>
						</UButton>
						<UButton
							variant="outline"
							size="sm"
							to="/jobs"
							class="shrink-0"
						>
							<UIcon
								name="i-lucide-arrow-left"
								class="h-4 w-4 sm:mr-2"
							/>
							<span class="hidden sm:inline">Back to Jobs</span>
						</UButton>
					</div>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<!-- Loading state -->
			<div
				v-if="status === 'pending'"
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
				class="py-12 text-center"
			>
				<div class="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
					<UIcon
						name="i-lucide-alert-circle"
						class="size-8 text-destructive"
					/>
				</div>
				<h3 class="text-lg font-semibold">
					Failed to load queue
				</h3>
				<p class="text-sm text-muted-foreground">
					{{ error.message }}
				</p>
			</div>

			<div
				v-else-if="data"
				class="space-y-6"
			>
				<!-- Status tabs -->
				<div class="border-b">
					<nav class="flex gap-1 -mb-px overflow-x-auto">
						<button
							v-for="tab in statusTabs"
							:key="tab.key"
							class="px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2"
							:class="currentStatus === tab.key
								? 'border-primary text-primary'
								: 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'"
							@click="setStatus(tab.key)"
						>
							{{ tab.label }}
							<UBadge
								v-if="getTabCount(tab.key) !== null && getTabCount(tab.key)! > 0"
								:variant="currentStatus === tab.key ? 'solid' : 'subtle'"
								size="xs"
							>
								{{ getTabCount(tab.key) }}
							</UBadge>
						</button>
					</nav>
				</div>

				<!-- Empty state -->
				<div
					v-if="data.jobs.length === 0"
					class="py-12 text-center"
				>
					<div class="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
						<UIcon
							name="i-lucide-briefcase"
							class="size-8 text-muted-foreground"
						/>
					</div>
					<h3 class="text-lg font-semibold">
						No {{ currentStatus }} jobs
					</h3>
					<p class="text-sm text-muted-foreground">
						There are no {{ currentStatus }} jobs in this queue.
					</p>
				</div>

				<!-- Jobs list -->
				<div
					v-else
					class="space-y-4"
				>
					<UCard
						v-for="job in data.jobs"
						:key="job.id"
					>
						<div class="flex">
							<!-- Timeline sidebar (hidden on mobile) -->
							<div class="w-44 border-r py-4 px-2 space-y-4 text-right text-xs shrink-0 hidden sm:block">
								<div>
									<p class="text-muted-foreground">
										Added at
									</p>
									<p class="font-medium">
										{{ formatTimestamp(job.timestamp) }}
									</p>
								</div>
								<div v-if="job.scheduledAt && !job.processedOn">
									<p class="text-muted-foreground">
										Scheduled for
									</p>
									<p class="font-medium text-cyan-600">
										{{ formatTimestamp(job.scheduledAt) }}
									</p>
									<p
										v-if="job.delay"
										class="text-muted-foreground mt-1"
									>
										Delay: {{ formatDelay(job.delay) }}
									</p>
								</div>
								<div v-if="job.processedOn">
									<p class="text-muted-foreground">
										Started at
									</p>
									<p class="font-medium">
										{{ formatTimestamp(job.processedOn) }}
									</p>
								</div>
								<div v-if="job.finishedOn">
									<p class="text-muted-foreground">
										Finished at
									</p>
									<p class="font-medium">
										{{ formatTimestamp(job.finishedOn) }}
									</p>
									<p
										v-if="job.processedOn"
										class="text-muted-foreground mt-1"
									>
										Duration: {{ formatDuration(job.processedOn, job.finishedOn) }}
									</p>
								</div>
								<div v-if="job.attemptsMade > 0">
									<p class="text-muted-foreground">
										Attempts
									</p>
									<p :class="['font-medium', job.failedReason ? 'text-red-600' : '']">
										{{ job.attemptsMade }}
									</p>
								</div>
							</div>

							<!-- Main content -->
							<div class="flex-1 py-4 px-3 min-w-0 overflow-hidden">
								<div class="flex items-start justify-between gap-2 sm:gap-4">
									<div class="flex-1 min-w-0">
										<div class="flex items-center justify-between gap-2 mb-2">
											<div class="flex items-center gap-2 min-w-0">
												<span class="text-muted-foreground text-sm shrink-0">#{{ job.id }}</span>
												<UBadge
													variant="outline"
													:class="getJobStatus(job).color"
													class="shrink-0"
												>
													{{ getJobStatus(job).status }}
												</UBadge>
											</div>

											<!-- Actions -->
											<div class="flex items-center gap-0.5 sm:gap-1 shrink-0">
												<UButton
													v-if="getJobStatus(job).status === 'failed'"
													variant="ghost"
													size="xs"
													:loading="actionPending"
													@click="retryJob(job.id)"
												>
													<UIcon
														name="i-lucide-rotate-ccw"
														class="size-3.5 sm:mr-1"
													/>
													<span class="hidden sm:inline">Retry</span>
												</UButton>
												<UButton
													v-if="getJobStatus(job).status === 'delayed'"
													variant="ghost"
													size="xs"
													:loading="actionPending"
													@click="promoteJob(job.id)"
												>
													<UIcon
														name="i-lucide-fast-forward"
														class="size-3.5 sm:mr-1"
													/>
													<span class="hidden sm:inline">Run Now</span>
												</UButton>
												<UButton
													variant="ghost"
													size="xs"
													:loading="actionPending"
													@click="openDuplicateDialog(job)"
												>
													<UIcon
														name="i-lucide-copy"
														class="size-3.5 sm:mr-1"
													/>
													<span class="hidden sm:inline">Duplicate</span>
												</UButton>
												<UButton
													variant="ghost"
													size="xs"
													class="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
													:loading="actionPending"
													@click="deleteJob(job.id)"
												>
													<UIcon
														name="i-lucide-trash-2"
														class="size-3.5 sm:mr-1"
													/>
													<span class="hidden sm:inline">Delete</span>
												</UButton>
											</div>
										</div>

										<!-- Job data tabs -->
										<UTabs
											:items="getJobTabItems(job)"
											:default-index="getJobDefaultTabIndex(job)"
											class="w-full mt-3"
										>
											<template #data>
												<pre class="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto max-h-40 mt-2">{{ JSON.stringify(job.data, null, 2) }}</pre>
											</template>
											<template #options>
												<pre class="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto max-h-40 mt-2">{{ JSON.stringify(job.opts, null, 2) }}</pre>
											</template>
											<template #logs>
												<div
													v-if="job.logs && job.logs.length > 0"
													class="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto max-h-60 font-mono space-y-1 mt-2"
												>
													<div
														v-for="(log, index) in job.logs"
														:key="index"
														class="text-muted-foreground"
													>
														{{ log }}
													</div>
												</div>
												<p
													v-else
													class="text-xs text-muted-foreground p-3 mt-2"
												>
													No logs available for this job.
												</p>
											</template>
											<template #error>
												<div :class="['text-xs p-3 rounded-md overflow-x-auto max-h-80 mt-2', job.failedReason ? 'bg-red-50 dark:bg-red-950/30' : 'bg-orange-50 dark:bg-orange-950/30']">
													<p
														v-if="job.failedReason"
														class="mb-2"
													>
														<span class="text-red-600 font-semibold">Error: </span>
														<span class="text-red-500">{{ job.failedReason }}</span>
													</p>
													<p
														v-else
														class="mb-2 text-orange-600"
													>
														Job succeeded after {{ job.attemptsMade }} attempts. Previous errors:
													</p>
													<div
														v-if="job.stacktrace && job.stacktrace.length > 0"
														class="space-y-3"
													>
														<div
															v-for="(trace, index) in job.stacktrace"
															:key="index"
															class="border-l-2 border-red-300 dark:border-red-700 pl-3"
														>
															<p class="text-red-600/80 text-[10px] mb-1">
																Attempt {{ index + 1 }}
															</p>
															<pre class="text-red-600/70 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{{ trace }}</pre>
														</div>
													</div>
												</div>
											</template>
											<template #result>
												<pre class="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto max-h-40 mt-2">{{ JSON.stringify(job.returnvalue, null, 2) }}</pre>
											</template>
										</UTabs>

										<!-- Mobile timeline -->
										<div class="mt-3 text-xs text-muted-foreground sm:hidden">
											Added: {{ formatTimestamp(job.timestamp) }}
											<span v-if="job.scheduledAt && !job.processedOn">
												&bull; Scheduled: <span class="text-cyan-600">{{ formatTimestamp(job.scheduledAt) }}</span>
											</span>
											<span v-if="job.finishedOn">
												&bull; Finished: {{ formatTimestamp(job.finishedOn) }}
											</span>
											<span v-if="job.attemptsMade > 0">
												&bull; {{ job.attemptsMade }} attempt{{ job.attemptsMade > 1 ? "s" : "" }}
											</span>
										</div>
									</div>

									<!-- Progress circle (hidden on mobile) -->
									<JobsProgressCircle
										:progress="getProgressValue(job.progress)"
										class="hidden sm:block"
									/>
								</div>
							</div>
						</div>
					</UCard>
				</div>

				<!-- Pagination -->
				<div
					v-if="data.pagination.totalPages > 1"
					class="flex items-center justify-center gap-2"
				>
					<UButton
						variant="outline"
						size="sm"
						:disabled="currentPage <= 1"
						@click="setPage(currentPage - 1)"
					>
						<UIcon
							name="i-lucide-chevron-left"
							class="size-4 mr-1"
						/>
						Previous
					</UButton>

					<div class="flex items-center gap-1">
						<UButton
							v-for="pageNum in Math.min(5, data.pagination.totalPages)"
							:key="pageNum"
							:variant="pageNum === currentPage ? 'solid' : 'outline'"
							size="sm"
							class="w-9"
							@click="setPage(pageNum)"
						>
							{{ pageNum }}
						</UButton>
					</div>

					<UButton
						variant="outline"
						size="sm"
						:disabled="currentPage >= data.pagination.totalPages"
						@click="setPage(currentPage + 1)"
					>
						Next
						<UIcon
							name="i-lucide-chevron-right"
							class="size-4 ml-1"
						/>
					</UButton>
				</div>
			</div>

			<!-- Loading state -->
			<div
				v-else
				class="flex items-center justify-center py-8"
			>
				<UIcon
					name="i-lucide-loader-2"
					class="size-6 animate-spin text-muted-foreground"
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
