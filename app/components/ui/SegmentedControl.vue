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
	gap: 0.375rem;
	padding: 0.25rem;
	background: var(--color-muted);
	border-radius: 0.5rem;
	overflow-x: auto;
	-webkit-overflow-scrolling: touch;
	scrollbar-width: none;
	-ms-overflow-style: none;
}

.segmented-control::-webkit-scrollbar {
	display: none;
}

.segment {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	padding: 0.5rem 0.625rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--color-text-muted);
	border-radius: 0.375rem;
	transition: all 0.15s ease;
	cursor: pointer;
	white-space: nowrap;
	flex: 1 0 auto;
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
	font-size: calc(var(--font-size-xs) - 0.125rem);
	font-weight: 600;
	background: var(--color-border);
	border-radius: 0.25rem;
	font-variant-numeric: tabular-nums;
}

.segment.active .count {
	background: var(--color-muted);
}

@media (min-width: 640px) {
	.segment {
		flex: 0 0 auto;
		padding: 0.375rem 0.75rem;
	}

	.segment .count {
		font-size: 0.6875rem;
	}
}
</style>
