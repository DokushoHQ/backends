<script setup lang="ts">
interface Props {
	source: {
		id: string
		external_id: string
		name: string
		icon: string | null
		enabled: boolean
	}
	health: {
		totalSeries: number
		failingCount: number
		lastChecked: string | Date | null
	}
	queueStats: {
		waiting: number
		active: number
	}
	isAdmin: boolean
	isRefreshing: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
	refresh: [sourceId: string]
}>()

const { formatRelativeTime } = useFormatters()

const healthySeries = computed(() => props.health.totalSeries - props.health.failingCount)

const healthPercentage = computed(() => {
	if (props.health.totalSeries === 0) return 0
	return (healthySeries.value / props.health.totalSeries) * 100
})

const statusType = computed(() => {
	if (!props.source.enabled) return "disabled"
	if (props.health.failingCount === 0) return "healthy"
	return "failing"
})

const hasQueueActivity = computed(() =>
	props.queueStats.waiting > 0 || props.queueStats.active > 0,
)
</script>

<template>
	<div
		class="source-card"
		:class="[`status-${statusType}`]"
	>
		<!-- Header -->
		<div class="card-header">
			<div class="source-info">
				<div class="source-icon">
					<UIcon
						name="i-lucide-database"
						class="icon"
					/>
				</div>
				<div class="source-details">
					<h3 class="source-name">
						{{ source.name }}
					</h3>
					<span class="source-id">{{ source.external_id }}</span>
				</div>
			</div>

			<!-- Status Badge -->
			<div class="status-badge">
				<template v-if="!source.enabled">
					<UIcon
						name="i-lucide-power-off"
						class="badge-icon"
					/>
					<span>Disabled</span>
				</template>
				<template v-else-if="health.failingCount === 0">
					<UIcon
						name="i-lucide-check-circle"
						class="badge-icon"
					/>
					<span>Healthy</span>
				</template>
				<template v-else>
					<UIcon
						name="i-lucide-alert-triangle"
						class="badge-icon"
					/>
					<span>{{ health.failingCount }} failing</span>
				</template>
			</div>
		</div>

		<!-- Health Progress -->
		<div class="health-section">
			<div class="health-header">
				<span class="health-label">
					<UIcon
						name="i-lucide-library"
						class="label-icon"
					/>
					Series Health
				</span>
				<span class="health-count">
					{{ healthySeries }}<span class="count-separator">/</span>{{ health.totalSeries }}
				</span>
			</div>
			<div class="progress-track">
				<div
					class="progress-fill"
					:style="{ width: `${healthPercentage}%` }"
				/>
			</div>
		</div>

		<!-- Meta Info -->
		<div class="meta-section">
			<div class="meta-row">
				<span class="meta-label">
					<UIcon
						name="i-lucide-clock"
						class="label-icon"
					/>
					Last update
				</span>
				<span class="meta-value">{{ formatRelativeTime(health.lastChecked) }}</span>
			</div>

			<div
				v-if="hasQueueActivity"
				class="meta-row"
			>
				<span class="meta-label">
					<UIcon
						name="i-lucide-list-todo"
						class="label-icon"
					/>
					Queue
				</span>
				<span class="meta-value queue-stats">
					<span
						v-if="queueStats.active > 0"
						class="queue-active"
					>{{ queueStats.active }} active</span>
					<span
						v-if="queueStats.waiting > 0"
						class="queue-waiting"
					>{{ queueStats.waiting }} waiting</span>
				</span>
			</div>
		</div>

		<!-- Actions -->
		<div
			v-if="health.failingCount > 0 || (isAdmin && source.enabled)"
			class="actions-section"
		>
			<NuxtLink
				v-if="health.failingCount > 0"
				:to="`/dashboard/series?filter=failing&source=${source.id}`"
				class="action-button secondary"
			>
				<UIcon
					name="i-lucide-eye"
					class="action-icon"
				/>
				View Failing
			</NuxtLink>
			<button
				v-if="isAdmin && source.enabled"
				class="action-button primary"
				:disabled="isRefreshing"
				@click="emit('refresh', source.id)"
			>
				<UIcon
					:name="isRefreshing ? 'i-lucide-loader-2' : 'i-lucide-refresh-cw'"
					:class="['action-icon', { spinning: isRefreshing }]"
				/>
				{{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
			</button>
		</div>
	</div>
</template>

<style scoped>
.source-card {
	display: flex;
	flex-direction: column;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
	overflow: hidden;
	transition: all 0.2s ease;
}

.source-card:hover {
	border-color: var(--ui-border-muted);
	box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08);
}

/* Status variants */
.source-card.status-healthy {
	border-left: 3px solid var(--ui-success);
}

.source-card.status-failing {
	border-left: 3px solid var(--ui-error);
}

.source-card.status-disabled {
	border-left: 3px solid var(--ui-text-muted);
	opacity: 0.7;
}

/* Header */
.card-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 0.75rem;
	padding: 1rem;
	border-bottom: 1px solid var(--ui-border-muted);
}

.source-info {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	min-width: 0;
}

.source-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 0.5rem;
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
	flex-shrink: 0;
}

.status-healthy .source-icon {
	background: var(--ui-success-soft);
	color: var(--ui-success);
}

.status-failing .source-icon {
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

.source-icon .icon {
	width: 1.25rem;
	height: 1.25rem;
}

.source-details {
	min-width: 0;
}

.source-name {
	font-size: var(--font-size-base);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.source-id {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

/* Status badge */
.status-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.25rem 0.625rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 2rem;
	flex-shrink: 0;
}

.status-healthy .status-badge {
	background: var(--ui-success-soft);
	color: var(--ui-success);
}

.status-failing .status-badge {
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

.status-disabled .status-badge {
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}

.badge-icon {
	width: 0.875rem;
	height: 0.875rem;
}

/* Health section */
.health-section {
	padding: 1rem;
	border-bottom: 1px solid var(--ui-border-muted);
}

.health-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 0.5rem;
}

.health-label {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

.label-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.health-count {
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text);
	font-variant-numeric: tabular-nums;
}

.count-separator {
	color: var(--ui-text-muted);
	margin: 0 0.125rem;
}

/* Progress bar */
.progress-track {
	height: 0.375rem;
	background: var(--ui-bg-muted);
	border-radius: 1rem;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	border-radius: 1rem;
	transition: width 0.3s ease;
}

.status-healthy .progress-fill {
	background: var(--ui-success);
}

.status-failing .progress-fill {
	background: var(--ui-error);
}

.status-disabled .progress-fill {
	background: var(--ui-text-muted);
}

/* Meta section */
.meta-section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	padding: 0.875rem 1rem;
}

.meta-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: var(--font-size-sm);
}

.meta-label {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	color: var(--ui-text-muted);
}

.meta-value {
	font-weight: 500;
	color: var(--ui-text);
}

.queue-stats {
	display: flex;
	gap: 0.5rem;
}

.queue-active {
	color: var(--ui-primary);
}

.queue-waiting {
	color: var(--ui-text-muted);
}

/* Actions section */
.actions-section {
	display: flex;
	gap: 0.5rem;
	padding: 0.875rem 1rem;
	border-top: 1px solid var(--ui-border-muted);
	background: var(--ui-bg-muted);
}

.action-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	flex: 1;
	padding: 0.5rem 0.75rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	border-radius: 0.5rem;
	transition: all 0.15s ease;
	cursor: pointer;
	text-decoration: none;
}

.action-button.secondary {
	background: var(--ui-bg-elevated);
	color: var(--ui-text);
	border: 1px solid var(--ui-border);
}

.action-button.secondary:hover {
	border-color: var(--ui-text-muted);
}

.action-button.primary {
	background: var(--ui-primary);
	color: white;
	border: none;
}

.action-button.primary:hover:not(:disabled) {
	opacity: 0.9;
}

.action-button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.action-icon {
	width: 1rem;
	height: 1rem;
}

.action-icon.spinning {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Dark mode adjustments */
:root.dark .source-card:hover {
	box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.3);
}
</style>
