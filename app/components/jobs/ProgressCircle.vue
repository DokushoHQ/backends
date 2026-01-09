<script setup lang="ts">
interface Props {
	progress: number
}

const props = defineProps<Props>()

const circumference = 2 * Math.PI * 20
const offset = computed(() => circumference - (props.progress / 100) * circumference)

const color = computed(() => {
	if (props.progress === 100) return "text-green-500"
	if (props.progress > 0) return "text-blue-500"
	return "text-muted-foreground"
})
</script>

<template>
	<div class="relative h-14 w-14 shrink-0">
		<svg
			class="h-14 w-14 -rotate-90"
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
				class="text-muted"
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
				:class="color"
			/>
		</svg>
		<span :class="['absolute inset-0 flex items-center justify-center text-xs font-medium', color]">
			{{ progress }}%
		</span>
	</div>
</template>
