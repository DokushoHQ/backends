<script setup lang="ts">
interface QueueStats {
	name: string
	displayName?: string
	active?: number
	waiting?: number
	prioritized?: number
	waitingChildren?: number
	completed?: number
	failed?: number
	delayed?: number
	total?: number
	paused?: boolean
}

interface DailyData {
	date: string
	completed: number
	failed: number
}

const props = defineProps<{
	queue: QueueStats
	daily?: DailyData[] // Daily metrics for trend calculation
}>()

// Use displayName if available, otherwise format the name
const displayName = computed(() => {
	if (props.queue.displayName) return props.queue.displayName
	return props.queue.name.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim()
})

// Calculate trends from daily data (today vs yesterday)
const trends = computed(() => {
	if (!props.daily || props.daily.length < 2) {
		return { completed: null, failed: null }
	}

	const today = props.daily[props.daily.length - 1]!
	const yesterday = props.daily[props.daily.length - 2]!

	const calcTrend = (current: number, previous: number) => {
		const diff = current - previous
		const percentChange = previous > 0
			? Math.round((diff / previous) * 100)
			: current > 0 ? 100 : 0

		return {
			current,
			previous,
			diff,
			percentChange,
			direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
		}
	}

	return {
		completed: calcTrend(today.completed, yesterday.completed),
		failed: calcTrend(today.failed, yesterday.failed),
	}
})

// Format large numbers compactly
function formatCount(n: number): string {
	if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
	return n.toLocaleString()
}

interface Segment {
	key: string
	count: number
	percentage: number
}

const segments = computed<Segment[]>(() => {
	const total = props.queue.total ?? 0
	if (total === 0) return []

	return [
		{ key: "active", count: props.queue.active ?? 0 },
		{ key: "waiting", count: props.queue.waiting ?? 0 },
		{ key: "prioritized", count: props.queue.prioritized ?? 0 },
		{ key: "waitingChildren", count: props.queue.waitingChildren ?? 0 },
		{ key: "completed", count: props.queue.completed ?? 0 },
		{ key: "failed", count: props.queue.failed ?? 0 },
		{ key: "delayed", count: props.queue.delayed ?? 0 },
	]
		.filter(s => s.count > 0)
		.map(s => ({
			...s,
			percentage: Math.round((s.count / total) * 10000) / 100,
		}))
})
</script>

<template>
	<NuxtLink
		:to="`/jobs/${queue.name}`"
		class="queue-card"
	>
		<div class="queue-header">
			<h3 class="queue-name">
				{{ displayName }}
			</h3>
			<span
				v-if="queue.paused"
				class="paused-badge"
			>
				<UIcon
					name="i-lucide-pause"
					class="paused-icon"
				/>
				Paused
			</span>
		</div>

		<!-- Trend indicators -->
		<div
			v-if="trends.completed || trends.failed"
			class="trends-row"
		>
			<!-- Completed trend -->
			<div
				v-if="trends.completed"
				class="trend-item trend-completed"
			>
				<div class="trend-main">
					<UIcon
						:name="trends.completed.direction === 'up' ? 'i-lucide-trending-up' : trends.completed.direction === 'down' ? 'i-lucide-trending-down' : 'i-lucide-minus'"
						class="trend-icon"
					/>
					<span class="trend-count">{{ formatCount(trends.completed.current) }}</span>
				</div>
				<div class="trend-meta">
					<span
						v-if="trends.completed.direction !== 'flat'"
						class="trend-change"
						:class="`trend-${trends.completed.direction}`"
					>
						{{ trends.completed.direction === 'up' ? '+' : '' }}{{ trends.completed.percentChange }}%
					</span>
					<span class="trend-label">today</span>
				</div>
			</div>

			<!-- Failed trend -->
			<div
				v-if="trends.failed"
				class="trend-item trend-failed"
				:class="{ 'has-failures': trends.failed.current > 0 }"
			>
				<div class="trend-main">
					<UIcon
						v-if="trends.failed.current === 0"
						name="i-lucide-check"
						class="trend-icon trend-icon-success"
					/>
					<UIcon
						v-else
						:name="trends.failed.direction === 'up' ? 'i-lucide-trending-up' : trends.failed.direction === 'down' ? 'i-lucide-trending-down' : 'i-lucide-minus'"
						class="trend-icon"
					/>
					<span class="trend-count">{{ trends.failed.current === 0 ? '0' : formatCount(trends.failed.current) }}</span>
				</div>
				<div class="trend-meta">
					<span
						v-if="trends.failed.current > 0 && trends.failed.direction !== 'flat'"
						class="trend-change"
						:class="trends.failed.direction === 'up' ? 'trend-bad' : 'trend-good'"
					>
						{{ trends.failed.direction === 'up' ? '+' : '' }}{{ trends.failed.percentChange }}%
					</span>
					<span class="trend-label">{{ trends.failed.current === 0 ? 'no failures' : 'failed' }}</span>
				</div>
			</div>
		</div>

		<!-- No data state -->
		<div
			v-else
			class="no-trends"
		>
			<span>No activity data</span>
		</div>

		<div class="queue-bar-row">
			<div class="segment-bar">
				<div
					v-for="segment in segments"
					:key="segment.key"
					class="segment"
					:class="`segment-${segment.key}`"
					:style="{ width: `${segment.percentage}%` }"
				>
					<span
						v-if="segment.percentage > 8"
						class="segment-count"
					>
						{{ segment.count }}
					</span>
				</div>
			</div>
			<span class="total-jobs">
				{{ (queue.total ?? 0).toLocaleString() }} Jobs
			</span>
		</div>
	</NuxtLink>
</template>

<style scoped>
.queue-card {
	display: block;
	padding: 1rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.75rem;
	text-decoration: none;
	transition: all 0.15s ease;
}

.queue-card:hover {
	border-color: var(--ui-text-muted);
	box-shadow: 0 4px 12px color-mix(in oklch, var(--ui-text) 5%, transparent);
}

.queue-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	margin-bottom: 0.75rem;
}

.queue-name {
	font-size: var(--font-size-base);
	font-weight: 600;
	color: var(--ui-text);
	letter-spacing: -0.01em;
}

.paused-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-warning);
	background: var(--ui-warning-soft);
	padding: 0.125rem 0.5rem;
	border-radius: 1rem;
}

.paused-icon {
	width: 0.75rem;
	height: 0.75rem;
}

/* Trends */
.trends-row {
	display: flex;
	gap: 1rem;
	margin-bottom: 0.75rem;
}

.trend-item {
	flex: 1;
	display: flex;
	align-items: baseline;
	gap: 0.5rem;
}

.trend-main {
	display: flex;
	align-items: center;
	gap: 0.375rem;
}

.trend-icon {
	width: 1rem;
	height: 1rem;
	flex-shrink: 0;
}

.trend-completed .trend-icon {
	color: var(--ui-success);
}

.trend-failed .trend-icon {
	color: var(--ui-text-muted);
}

.trend-failed.has-failures .trend-icon {
	color: var(--ui-error);
}

.trend-icon-success {
	color: var(--ui-success) !important;
}

.trend-count {
	font-size: var(--font-size-lg);
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	letter-spacing: -0.02em;
}

.trend-completed .trend-count {
	color: var(--ui-success);
}

.trend-failed .trend-count {
	color: var(--ui-text-muted);
}

.trend-failed.has-failures .trend-count {
	color: var(--ui-error);
}

.trend-meta {
	display: flex;
	align-items: baseline;
	gap: 0.375rem;
	font-size: var(--font-size-xs);
}

.trend-change {
	font-weight: 600;
	font-variant-numeric: tabular-nums;
}

.trend-up {
	color: var(--ui-success);
}

.trend-down {
	color: var(--ui-text-muted);
}

.trend-good {
	color: var(--ui-success);
}

.trend-bad {
	color: var(--ui-error);
}

.trend-label {
	color: var(--ui-text-muted);
}

.no-trends {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin-bottom: 0.75rem;
}

/* Segment bar */
.queue-bar-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.segment-bar {
	flex: 1;
	height: 1.5rem;
	background: var(--ui-bg-muted);
	border-radius: 0.375rem;
	overflow: hidden;
	display: flex;
}

.segment {
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.segment-count {
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: white;
}

.segment-active { background: var(--ui-primary); }
.segment-waiting { background: var(--ui-warning); }
.segment-prioritized { background: var(--color-orange); }
.segment-waitingChildren { background: var(--color-purple); }
.segment-completed { background: var(--ui-success); }
.segment-failed { background: var(--ui-error); }
.segment-delayed { background: var(--color-cyan); }

.total-jobs {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	white-space: nowrap;
}
</style>
