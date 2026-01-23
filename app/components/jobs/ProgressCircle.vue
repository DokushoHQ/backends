<script setup lang="ts">
interface Props {
	progress: number
}

const props = defineProps<Props>()

const circumference = 2 * Math.PI * 20
const offset = computed(() => circumference - (props.progress / 100) * circumference)

const colorClass = computed(() => {
	if (props.progress === 100) return "color-completed"
	if (props.progress > 0) return "color-active"
	return "color-neutral"
})
</script>

<template>
	<div class="progress-circle">
		<svg
			class="progress-svg"
			viewBox="0 0 48 48"
			role="img"
			:aria-label="`Progress: ${progress}%`"
		>
			<title>Progress: {{ progress }}%</title>
			<circle
				cx="24"
				cy="24"
				r="20"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				class="track-ring"
			/>
			<circle
				cx="24"
				cy="24"
				r="20"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				:stroke-dasharray="circumference"
				:stroke-dashoffset="offset"
				stroke-linecap="round"
				:class="colorClass"
			/>
		</svg>
		<span
			class="progress-value"
			:class="colorClass"
		>
			{{ progress }}%
		</span>
	</div>
</template>

<style scoped>
.progress-circle {
	position: relative;
	width: 3.5rem;
	height: 3.5rem;
	flex-shrink: 0;
}

.progress-svg {
	width: 3.5rem;
	height: 3.5rem;
	transform: rotate(-90deg);
}

.track-ring {
	color: var(--ui-bg-muted);
}

.progress-value {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: var(--font-size-xs);
	font-weight: 500;
}

.color-completed { color: var(--ui-success); }
.color-active { color: var(--ui-primary); }
.color-neutral { color: var(--ui-text-muted); }
</style>
