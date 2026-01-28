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

type JobStatus = "active" | "waiting" | "prioritized" | "waiting-children" | "completed" | "failed" | "delayed"

const props = defineProps<{
	job: Job
	actionPending?: boolean
}>()

const emit = defineEmits<{
	retry: [jobId: string]
	delete: [jobId: string]
	promote: [jobId: string]
	duplicate: [job: Job]
}>()

// Compute job status
const status = computed<JobStatus>(() => {
	if (props.job.state) {
		const stateMap: Record<string, JobStatus> = {
			"failed": "failed",
			"completed": "completed",
			"active": "active",
			"delayed": "delayed",
			"waiting-children": "waiting-children",
			"prioritized": "prioritized",
			"waiting": "waiting",
			"wait": "waiting",
		}
		const mapped = stateMap[props.job.state]
		if (mapped) return mapped
	}
	if (props.job.failedReason) return "failed"
	if (props.job.finishedOn) return "completed"
	if (props.job.processedOn) return "active"
	if (props.job.scheduledAt && !props.job.processedOn) return "delayed"
	return "waiting"
})

// Tab management
const selectedTab = ref<string>(
	props.job.failedReason || (props.job.stacktrace?.length ?? 0) > 0 ? "error" : "data",
)

const tabOptions = computed(() => {
	const opts = [
		{ label: "Data", value: "data" },
		{ label: "Options", value: "options" },
		{ label: props.job.logs?.length ? `Logs (${props.job.logs.length})` : "Logs", value: "logs" },
	]

	if (props.job.failedReason || (props.job.stacktrace?.length ?? 0) > 0) {
		const errorLabel = props.job.failedReason ? "Error" : "Errors"
		const count = (props.job.stacktrace?.length ?? 0) > 1 ? ` (${props.job.stacktrace!.length})` : ""
		opts.push({ label: `${errorLabel}${count}`, value: "error" })
	}

	if (props.job.returnvalue !== undefined && props.job.returnvalue !== null) {
		opts.push({ label: "Result", value: "result" })
	}

	return opts
})

// Formatters
function formatTimestamp(ts?: number): string {
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

function getProgressValue(): number {
	const p = props.job.progress
	if (typeof p === "number") return p
	if (typeof p === "string") return Number.parseInt(p, 10) || 0
	return 0
}
</script>

<template>
	<div class="job-card">
		<!-- Timeline sidebar (desktop) -->
		<aside class="timeline-sidebar">
			<div class="timeline-item">
				<span class="timeline-label">Added at</span>
				<span class="timeline-value">{{ formatTimestamp(job.timestamp) }}</span>
			</div>
			<div
				v-if="job.scheduledAt && !job.processedOn"
				class="timeline-item"
			>
				<span class="timeline-label">Scheduled for</span>
				<span class="timeline-value accent-delayed">{{ formatTimestamp(job.scheduledAt) }}</span>
				<span
					v-if="job.delay"
					class="timeline-meta"
				>Delay: {{ formatDelay(job.delay) }}</span>
			</div>
			<div
				v-if="job.processedOn"
				class="timeline-item"
			>
				<span class="timeline-label">Started at</span>
				<span class="timeline-value">{{ formatTimestamp(job.processedOn) }}</span>
			</div>
			<div
				v-if="job.finishedOn"
				class="timeline-item"
			>
				<span class="timeline-label">Finished at</span>
				<span class="timeline-value">{{ formatTimestamp(job.finishedOn) }}</span>
				<span
					v-if="job.processedOn"
					class="timeline-meta"
				>
					Duration: {{ formatDuration(job.processedOn, job.finishedOn) }}
				</span>
			</div>
			<div
				v-if="job.attemptsMade > 0"
				class="timeline-item"
			>
				<span class="timeline-label">Attempts</span>
				<span
					class="timeline-value"
					:class="{ 'accent-error': job.failedReason }"
				>
					{{ job.attemptsMade }}
				</span>
			</div>
			<div
				v-if="job.opts?.priority !== undefined"
				class="timeline-item"
			>
				<span class="timeline-label">Priority</span>
				<span
					class="timeline-value"
					:class="{
						'accent-success': job.opts.priority === 1,
						'accent-orange': (job.opts.priority ?? 0) >= 10,
					}"
				>
					{{ job.opts.priority }}
				</span>
			</div>
		</aside>

		<!-- Main content -->
		<div class="job-content">
			<header class="job-header">
				<div class="job-id-row">
					<span class="job-id">#{{ job.id }}</span>
					<JobsStatusBadge :status="status" />
				</div>

				<div class="job-actions">
					<UButton
						v-if="status === 'failed'"
						variant="ghost"
						size="xs"
						:loading="actionPending"
						@click="emit('retry', job.id)"
					>
						<UIcon
							name="i-lucide-rotate-ccw"
							class="size-3.5 sm:mr-1"
						/>
						<span class="hidden sm:inline">Retry</span>
					</UButton>
					<UButton
						v-if="status === 'delayed'"
						variant="ghost"
						size="xs"
						:loading="actionPending"
						@click="emit('promote', job.id)"
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
						@click="emit('duplicate', job)"
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
						class="delete-button"
						:loading="actionPending"
						@click="emit('delete', job.id)"
					>
						<UIcon
							name="i-lucide-trash-2"
							class="size-3.5 sm:mr-1"
						/>
						<span class="hidden sm:inline">Delete</span>
					</UButton>
				</div>
			</header>

			<!-- Tabs -->
			<UiSegmentedControl
				v-model="selectedTab"
				:options="tabOptions"
				class="w-full mt-3"
			/>

			<!-- Tab content -->
			<div class="tab-content">
				<UiJsonHighlight
					v-if="selectedTab === 'data'"
					:value="job.data"
					max-height="10rem"
				/>

				<UiJsonHighlight
					v-else-if="selectedTab === 'options'"
					:value="job.opts"
					max-height="10rem"
				/>

				<template v-else-if="selectedTab === 'logs'">
					<div
						v-if="job.logs?.length"
						class="logs-block"
					>
						<div
							v-for="(log, i) in job.logs"
							:key="i"
							class="log-line"
						>
							{{ log }}
						</div>
					</div>
					<p
						v-else
						class="empty-message"
					>
						No logs available for this job.
					</p>
				</template>

				<div
					v-else-if="selectedTab === 'error'"
					class="error-block"
					:class="{ 'warning-variant': !job.failedReason }"
				>
					<p
						v-if="job.failedReason"
						class="error-message"
					>
						<span class="error-label">Error: </span>
						<span class="error-text">{{ job.failedReason }}</span>
					</p>
					<p
						v-else
						class="warning-message"
					>
						Job succeeded after {{ job.attemptsMade }} attempts. Previous errors:
					</p>
					<div
						v-if="job.stacktrace?.length"
						class="stacktrace-list"
					>
						<div
							v-for="(trace, i) in job.stacktrace"
							:key="i"
							class="stacktrace-item"
						>
							<p class="attempt-label">
								Attempt {{ i + 1 }}
							</p>
							<pre class="stacktrace-text">{{ trace }}</pre>
						</div>
					</div>
				</div>

				<UiJsonHighlight
					v-else-if="selectedTab === 'result'"
					:value="job.returnvalue"
					max-height="10rem"
				/>
			</div>

			<!-- Mobile timeline -->
			<div class="mobile-timeline">
				Added: {{ formatTimestamp(job.timestamp) }}
				<span v-if="job.scheduledAt && !job.processedOn">
					&bull; Scheduled: <span class="accent-delayed">{{ formatTimestamp(job.scheduledAt) }}</span>
				</span>
				<span v-if="job.finishedOn">&bull; Finished: {{ formatTimestamp(job.finishedOn) }}</span>
				<span v-if="job.attemptsMade > 0">&bull; {{ job.attemptsMade }} attempt{{ job.attemptsMade > 1 ? "s" : "" }}</span>
			</div>
		</div>

		<!-- Progress circle (desktop) -->
		<JobsProgressCircle
			:progress="getProgressValue()"
			class="progress-circle"
		/>
	</div>
</template>

<style scoped>
.job-card {
	display: flex;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
	overflow: hidden;
}

.timeline-sidebar {
	display: none;
	width: 11rem;
	padding: 1rem 0.75rem;
	border-right: 1px solid var(--ui-border);
	text-align: right;
	flex-shrink: 0;
}

@media (min-width: 640px) {
	.timeline-sidebar {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
}

.timeline-item {
	display: flex;
	flex-direction: column;
}

.timeline-label {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

.timeline-value {
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text);
}

.timeline-meta {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin-top: 0.25rem;
}

/* Accent colors for timeline */
.accent-delayed { color: var(--color-cyan); }
.accent-error { color: var(--ui-error); }
.accent-success { color: var(--ui-success); }
.accent-orange { color: var(--color-orange); }

.job-content {
	flex: 1;
	padding: 1rem;
	min-width: 0;
}

.job-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
}

.job-id-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.job-id {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

.job-actions {
	display: flex;
	align-items: center;
	gap: 0.25rem;
}

.delete-button {
	color: var(--ui-error);
}

.delete-button:hover {
	background: var(--ui-error-soft);
}

.tab-content {
	margin-top: 0.5rem;
}

.logs-block {
	font-size: var(--font-size-xs);
	font-family: ui-monospace, monospace;
	padding: 0.75rem;
	background: var(--ui-bg-muted);
	border-radius: 0.375rem;
	overflow-x: auto;
	max-height: 15rem;
}

.log-line {
	color: var(--ui-text-muted);
}

.empty-message {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	padding: 0.75rem;
}

.error-block {
	padding: 0.75rem;
	border-radius: 0.375rem;
	background: var(--ui-error-soft);
	max-height: 20rem;
	overflow-x: auto;
}

.error-block.warning-variant {
	background: var(--color-orange-soft);
}

.error-message {
	margin-bottom: 0.5rem;
}

.error-label {
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-error);
}

.error-text {
	font-size: var(--font-size-xs);
	color: color-mix(in oklch, var(--ui-error) 80%, var(--ui-text));
}

.warning-message {
	font-size: var(--font-size-xs);
	color: var(--color-orange);
	margin-bottom: 0.5rem;
}

.stacktrace-list {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.stacktrace-item {
	padding-left: 0.75rem;
	border-left: 2px solid color-mix(in oklch, var(--ui-error) 40%, transparent);
}

.attempt-label {
	font-size: 0.625rem;
	color: color-mix(in oklch, var(--ui-error) 80%, transparent);
	margin-bottom: 0.25rem;
}

.stacktrace-text {
	font-size: 0.6875rem;
	font-family: ui-monospace, monospace;
	color: color-mix(in oklch, var(--ui-error) 70%, var(--ui-text));
	white-space: pre-wrap;
	line-height: 1.5;
}

.mobile-timeline {
	display: block;
	margin-top: 0.75rem;
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

@media (min-width: 640px) {
	.mobile-timeline {
		display: none;
	}
}

.progress-circle {
	display: none;
	flex-shrink: 0;
	margin: 1rem;
}

@media (min-width: 640px) {
	.progress-circle {
		display: block;
	}
}
</style>
