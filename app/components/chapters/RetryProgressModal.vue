<script setup lang="ts">
interface Props {
	scope: "global" | "serie"
	serieId?: string
}

const props = defineProps<Props>()

const open = defineModel<boolean>("open", { default: false })

const emit = defineEmits<{
	completed: []
}>()

const toast = useToast()

// States
const phase = ref<"idle" | "running" | "complete">("idle")
const queuedCount = ref(0)
const pollInterval = ref<ReturnType<typeof setInterval> | null>(null)

// Queue stats
const queueStats = ref({
	waiting: 0,
	active: 0,
	completed: 0,
	failed: 0,
})

// Fetch initial stats
const queryParams = computed(() => props.serieId ? { serie_id: props.serieId } : {})

const { data: failedStats, refresh: refreshStats } = await useLazyFetch("/api/v1/chapters/failed-stats", {
	query: queryParams,
})

const hasFailures = computed(() =>
	failedStats.value && (failedStats.value.partialChapters > 0 || failedStats.value.failedChapters > 0),
)

// Progress calculations
const totalJobs = computed(() => queuedCount.value || queueStats.value.waiting + queueStats.value.active + queueStats.value.completed + queueStats.value.failed)
const completedJobs = computed(() => queueStats.value.completed + queueStats.value.failed)
const progressPercent = computed(() => {
	if (totalJobs.value === 0) return 0
	return Math.round((completedJobs.value / totalJobs.value) * 100)
})

// Start retry
async function startRetry() {
	phase.value = "running"

	try {
		const result = await $fetch("/api/v1/chapters/retry-failed", {
			method: "POST",
			body: {
				scope: props.scope,
				serie_id: props.serieId,
			},
		})

		queuedCount.value = result.queued

		if (result.queued === 0) {
			phase.value = "complete"
			return
		}

		// Start polling for progress
		startPolling()
	}
	catch {
		toast.add({
			title: "Retry Failed",
			description: "Failed to queue page retry jobs",
			color: "error",
		})
		phase.value = "idle"
	}
}

// Poll queue stats
async function pollQueueStats() {
	try {
		const data = await $fetch("/api/jobs/page-retry")
		queueStats.value = {
			waiting: (data.stats?.waiting ?? 0) + (data.stats?.delayed ?? 0),
			active: data.stats?.active ?? 0,
			completed: data.stats?.completed ?? 0,
			failed: data.stats?.failed ?? 0,
		}

		// Check if complete
		if (queueStats.value.waiting === 0 && queueStats.value.active === 0 && completedJobs.value > 0) {
			stopPolling()
			phase.value = "complete"
		}
	}
	catch {
		// Ignore polling errors
	}
}

function startPolling() {
	pollInterval.value = setInterval(pollQueueStats, 2000)
	pollQueueStats() // Initial poll
}

function stopPolling() {
	if (pollInterval.value) {
		clearInterval(pollInterval.value)
		pollInterval.value = null
	}
}

// Handle close
function handleClose() {
	stopPolling()
	if (phase.value === "complete") {
		emit("completed")
	}
	phase.value = "idle"
	queuedCount.value = 0
	queueStats.value = { waiting: 0, active: 0, completed: 0, failed: 0 }
	open.value = false
}

// Refresh stats when opening
watch(open, (isOpen) => {
	if (isOpen) {
		refreshStats()
	}
	else {
		stopPolling()
	}
})

// Cleanup on unmount
onUnmounted(() => {
	stopPolling()
})
</script>

<template>
	<UModal
		v-model:open="open"
		:ui="{ content: 'max-w-md' }"
	>
		<template #content>
			<div class="retry-modal">
				<div class="modal-header">
					<div class="header-icon">
						<UIcon
							name="i-lucide-refresh-cw"
							class="h-5 w-5"
							:class="{ 'animate-spin': phase === 'running' }"
						/>
					</div>
					<h2 class="modal-title">
						{{ phase === 'complete' ? 'Retry Complete' : 'Retry Failed Pages' }}
					</h2>
				</div>

				<!-- Idle state - show stats and start button -->
				<template v-if="phase === 'idle'">
					<div class="stats-grid">
						<div class="stat-item">
							<span class="stat-value">{{ failedStats?.failedChapters ?? 0 }}</span>
							<span class="stat-label">Failed Chapters</span>
						</div>
						<div class="stat-item">
							<span class="stat-value">{{ failedStats?.partialChapters ?? 0 }}</span>
							<span class="stat-label">Partial Chapters</span>
						</div>
						<div class="stat-item highlight">
							<span class="stat-value">{{ failedStats?.failedPages ?? 0 }}</span>
							<span class="stat-label">Pages to Retry</span>
						</div>
					</div>

					<p class="scope-info">
						<UIcon
							name="i-lucide-info"
							class="h-4 w-4"
						/>
						{{ scope === 'global' ? 'This will retry all failed pages across your library.' : 'This will retry failed pages for this series only.' }}
					</p>

					<div class="modal-actions">
						<UButton
							variant="outline"
							@click="handleClose"
						>
							Cancel
						</UButton>
						<UButton
							:disabled="!hasFailures"
							@click="startRetry"
						>
							<UIcon
								name="i-lucide-play"
								class="h-4 w-4"
							/>
							Start Retry
						</UButton>
					</div>
				</template>

				<!-- Running state - show progress -->
				<template v-else-if="phase === 'running'">
					<div class="progress-section">
						<div class="progress-bar-container">
							<div
								class="progress-bar"
								:style="{ width: `${progressPercent}%` }"
							/>
						</div>
						<div class="progress-text">
							<span>{{ completedJobs }} of {{ totalJobs }} jobs processed</span>
							<span class="progress-percent">{{ progressPercent }}%</span>
						</div>
					</div>

					<div class="queue-stats">
						<div class="queue-stat">
							<span class="queue-dot waiting" />
							<span>Waiting: {{ queueStats.waiting }}</span>
						</div>
						<div class="queue-stat">
							<span class="queue-dot active" />
							<span>Active: {{ queueStats.active }}</span>
						</div>
						<div class="queue-stat">
							<span class="queue-dot completed" />
							<span>Completed: {{ queueStats.completed }}</span>
						</div>
						<div
							v-if="queueStats.failed > 0"
							class="queue-stat"
						>
							<span class="queue-dot failed" />
							<span>Failed: {{ queueStats.failed }}</span>
						</div>
					</div>

					<p class="running-hint">
						Jobs are being processed. You can close this dialog - retries will continue in the background.
					</p>

					<div class="modal-actions">
						<UButton
							variant="outline"
							@click="handleClose"
						>
							Close
						</UButton>
					</div>
				</template>

				<!-- Complete state - show results -->
				<template v-else-if="phase === 'complete'">
					<div class="complete-section">
						<div class="complete-icon">
							<UIcon
								name="i-lucide-check-circle"
								class="h-10 w-10"
							/>
						</div>
						<p class="complete-text">
							Processed {{ completedJobs }} retry jobs.
							<template v-if="queueStats.failed > 0">
								<br>
								<span class="failed-text">{{ queueStats.failed }} jobs failed.</span>
							</template>
						</p>
					</div>

					<div class="modal-actions">
						<UButton @click="handleClose">
							Done
						</UButton>
					</div>
				</template>
			</div>
		</template>
	</UModal>
</template>

<style scoped>
.retry-modal {
	padding: 1.5rem;
}

.modal-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	margin-bottom: 1.5rem;
}

.header-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 0.625rem;
	background: oklch(0.65 0.2 250 / 0.12);
	color: oklch(0.65 0.2 250);
}

.modal-title {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--color-text);
}

/* Stats grid */
.stats-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 0.75rem;
	margin-bottom: 1rem;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 0.875rem;
	background: var(--color-muted);
	border-radius: 0.5rem;
}

.stat-item.highlight {
	background: oklch(0.65 0.2 250 / 0.08);
}

.stat-value {
	font-size: var(--font-size-xl);
	font-weight: 700;
	color: var(--color-text);
	font-variant-numeric: tabular-nums;
}

.stat-item.highlight .stat-value {
	color: oklch(0.65 0.2 250);
}

.stat-label {
	font-size: var(--font-size-xs);
	color: var(--color-text-muted);
	text-align: center;
}

.scope-info {
	display: flex;
	align-items: flex-start;
	gap: 0.5rem;
	padding: 0.75rem;
	font-size: var(--font-size-sm);
	color: var(--color-text-muted);
	background: var(--color-muted);
	border-radius: 0.5rem;
	margin-bottom: 1.5rem;
}

/* Progress section */
.progress-section {
	margin-bottom: 1rem;
}

.progress-bar-container {
	height: 0.5rem;
	background: var(--color-muted);
	border-radius: 0.25rem;
	overflow: hidden;
}

.progress-bar {
	height: 100%;
	background: oklch(0.65 0.2 250);
	border-radius: 0.25rem;
	transition: width 0.3s ease;
}

.progress-text {
	display: flex;
	justify-content: space-between;
	margin-top: 0.5rem;
	font-size: var(--font-size-sm);
	color: var(--color-text-muted);
}

.progress-percent {
	font-weight: 600;
	color: oklch(0.65 0.2 250);
}

/* Queue stats */
.queue-stats {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem 1.25rem;
	padding: 0.875rem;
	background: var(--color-muted);
	border-radius: 0.5rem;
	margin-bottom: 1rem;
}

.queue-stat {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	font-size: var(--font-size-sm);
	color: var(--color-text);
}

.queue-dot {
	width: 0.5rem;
	height: 0.5rem;
	border-radius: 50%;
}

.queue-dot.waiting {
	background: oklch(0.75 0.15 70);
}

.queue-dot.active {
	background: oklch(0.65 0.2 250);
	animation: pulse 1.5s ease-in-out infinite;
}

.queue-dot.completed {
	background: oklch(0.72 0.17 142);
}

.queue-dot.failed {
	background: oklch(0.65 0.25 25);
}

@keyframes pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.4; }
}

.running-hint {
	font-size: var(--font-size-sm);
	color: var(--color-text-muted);
	margin-bottom: 1.5rem;
}

/* Complete section */
.complete-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 1rem 0 1.5rem;
}

.complete-icon {
	color: oklch(0.72 0.17 142);
	margin-bottom: 0.75rem;
}

.complete-text {
	font-size: var(--font-size-md);
	color: var(--color-text);
	text-align: center;
}

.failed-text {
	color: oklch(0.65 0.25 25);
}

/* Actions */
.modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 0.75rem;
}
</style>
