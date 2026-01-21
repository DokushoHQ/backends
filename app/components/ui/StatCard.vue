<script setup lang="ts">
defineProps<{
	value: number | string
	label: string
	icon: string
	color?: "purple" | "amber" | "orange" | "yellow" | "red" | "green" | "blue" | "gray"
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
	--purple: oklch(0.7 0.15 280);
	--purple-soft: oklch(0.7 0.15 280 / 0.12);
	--amber: oklch(0.75 0.15 70);
	--amber-soft: oklch(0.75 0.15 70 / 0.12);
	--orange: oklch(0.72 0.16 45);
	--orange-soft: oklch(0.72 0.16 45 / 0.12);
	--yellow: oklch(0.8 0.14 85);
	--yellow-soft: oklch(0.8 0.14 85 / 0.12);
	--red: oklch(0.65 0.2 25);
	--red-soft: oklch(0.65 0.2 25 / 0.12);
	--green: oklch(0.72 0.15 160);
	--green-soft: oklch(0.72 0.15 160 / 0.12);
	--blue: oklch(0.65 0.15 250);
	--blue-soft: oklch(0.65 0.15 250 / 0.12);

	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.875rem;
	background: var(--color-background);
	border: 1px solid var(--color-border);
	border-radius: 0.625rem;
	transition: all 0.15s ease;
}

.stat-card:hover {
	border-color: var(--color-text-muted);
}

.stat-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.25rem;
	height: 2.25rem;
	border-radius: 0.5rem;
	flex-shrink: 0;
	background: var(--color-muted);
	color: var(--color-text-muted);
}

.stat-card.accent-purple .stat-icon { background: var(--purple-soft); color: var(--purple); }
.stat-card.accent-amber .stat-icon { background: var(--amber-soft); color: var(--amber); }
.stat-card.accent-orange .stat-icon { background: var(--orange-soft); color: var(--orange); }
.stat-card.accent-yellow .stat-icon { background: var(--yellow-soft); color: var(--yellow); }
.stat-card.accent-red .stat-icon { background: var(--red-soft); color: var(--red); }
.stat-card.accent-green .stat-icon { background: var(--green-soft); color: var(--green); }
.stat-card.accent-blue .stat-icon { background: var(--blue-soft); color: var(--blue); }
.stat-card.accent-gray .stat-icon { background: var(--color-muted); color: var(--color-text-muted); }

.stat-content {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.stat-value {
	font-size: var(--font-size-2xl);
	font-weight: 700;
	color: var(--color-text);
	line-height: 1.1;
	font-variant-numeric: tabular-nums;
}

.stat-label {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--color-text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	margin-top: 0.125rem;
}

/* Dark mode */
:root.dark .stat-card {
	background: oklch(0.2 0.01 250);
}
</style>
