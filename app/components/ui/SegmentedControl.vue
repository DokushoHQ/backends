<script setup lang="ts">
export interface SegmentOption {
	label: string
	value: string
	count?: number
}

defineProps<{
	options: SegmentOption[]
}>()

const modelValue = defineModel<string>({ required: true })
</script>

<template>
	<div class="segmented-control">
		<button
			v-for="opt in options"
			:key="opt.value"
			class="segment"
			:class="{ active: modelValue === opt.value }"
			@click="modelValue = opt.value"
		>
			{{ opt.label }}
			<span
				v-if="opt.count !== undefined && opt.count > 0"
				class="count"
			>{{ opt.count }}</span>
		</button>
	</div>
</template>

<style scoped>
.segmented-control {
	display: flex;
	align-items: center;
	gap: 0.125rem;
	padding: 0.25rem;
	background: var(--color-muted);
	border-radius: 0.5rem;
}

.segment {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem 0.75rem;
	font-size: 0.8125rem;
	font-weight: 500;
	color: var(--color-text-muted);
	border-radius: 0.375rem;
	transition: all 0.15s ease;
	cursor: pointer;
}

.segment:hover {
	color: var(--color-text);
	background: var(--color-background);
}

.segment.active {
	background: var(--color-background);
	color: var(--color-text);
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.segment .count {
	padding: 0.125rem 0.375rem;
	font-size: 0.6875rem;
	font-weight: 600;
	background: var(--color-border);
	border-radius: 0.25rem;
	font-variant-numeric: tabular-nums;
}

.segment.active .count {
	background: var(--color-muted);
}
</style>
