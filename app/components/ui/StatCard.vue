<script setup lang="ts">
defineProps<{
	value: number | string
	label: string
	icon: string
	color?: "purple" | "amber" | "orange" | "yellow" | "red" | "green" | "blue" | "cyan" | "gray"
}>()
</script>

<template>
	<div
		class="stat-card"
		:class="`accent-${color || 'gray'}`"
	>
		<div class="stat-icon">
			<UIcon
				:name="icon"
				class="h-5 w-5"
			/>
		</div>
		<div class="stat-content">
			<span class="stat-value">{{ value }}</span>
			<span class="stat-label">{{ label }}</span>
		</div>
	</div>
</template>

<style scoped>
.stat-card {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.875rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.625rem;
	transition: all 0.15s ease;
}

.stat-card:hover {
	border-color: var(--ui-text-muted);
}

.stat-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.25rem;
	height: 2.25rem;
	border-radius: 0.5rem;
	flex-shrink: 0;
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}

.stat-card.accent-purple .stat-icon { background: var(--color-purple-soft); color: var(--color-purple); }
.stat-card.accent-amber .stat-icon { background: var(--ui-warning-soft); color: var(--ui-warning); }
.stat-card.accent-orange .stat-icon { background: var(--ui-warning-soft); color: var(--ui-warning); }
.stat-card.accent-yellow .stat-icon { background: var(--ui-info-soft); color: var(--ui-info); }
.stat-card.accent-red .stat-icon { background: var(--ui-error-soft); color: var(--ui-error); }
.stat-card.accent-green .stat-icon { background: var(--ui-success-soft); color: var(--ui-success); }
.stat-card.accent-blue .stat-icon { background: var(--ui-primary-soft); color: var(--ui-primary); }
.stat-card.accent-cyan .stat-icon { background: var(--color-cyan-soft); color: var(--color-cyan); }
.stat-card.accent-gray .stat-icon { background: var(--ui-bg-muted); color: var(--ui-text-muted); }

.stat-content {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.stat-value {
	font-size: var(--font-size-2xl);
	font-weight: 700;
	color: var(--ui-text);
	line-height: 1.1;
	font-variant-numeric: tabular-nums;
}

.stat-label {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	margin-top: 0.125rem;
}
</style>
