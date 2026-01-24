<script setup lang="ts">
type JobStatus = "active" | "waiting" | "prioritized" | "waiting-children" | "completed" | "failed" | "delayed"

defineProps<{
	status: JobStatus
}>()

const statusLabels: Record<JobStatus, string> = {
	"active": "active",
	"waiting": "waiting",
	"prioritized": "prioritized",
	"waiting-children": "waiting-children",
	"completed": "completed",
	"failed": "failed",
	"delayed": "delayed",
}
</script>

<template>
	<span
		class="status-badge"
		:class="`status-${status}`"
	>
		{{ statusLabels[status] ?? status }}
	</span>
</template>

<style scoped>
.status-badge {
	display: inline-flex;
	align-items: center;
	padding: 0.125rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 0.25rem;
	border: 1px solid;
	white-space: nowrap;
}

.status-active {
	color: var(--ui-primary);
	border-color: color-mix(in oklch, var(--ui-primary) 50%, transparent);
	background: var(--ui-primary-soft);
}

.status-waiting {
	color: var(--ui-warning);
	border-color: color-mix(in oklch, var(--ui-warning) 50%, transparent);
	background: var(--ui-warning-soft);
}

.status-prioritized {
	color: var(--color-orange);
	border-color: color-mix(in oklch, var(--color-orange) 50%, transparent);
	background: var(--color-orange-soft);
}

.status-waiting-children {
	color: var(--color-purple);
	border-color: color-mix(in oklch, var(--color-purple) 50%, transparent);
	background: var(--color-purple-soft);
}

.status-completed {
	color: var(--ui-success);
	border-color: color-mix(in oklch, var(--ui-success) 50%, transparent);
	background: var(--ui-success-soft);
}

.status-failed {
	color: var(--ui-error);
	border-color: color-mix(in oklch, var(--ui-error) 50%, transparent);
	background: var(--ui-error-soft);
}

.status-delayed {
	color: var(--color-cyan);
	border-color: color-mix(in oklch, var(--color-cyan) 50%, transparent);
	background: var(--color-cyan-soft);
}
</style>
