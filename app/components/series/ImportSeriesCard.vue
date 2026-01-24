<script setup lang="ts">
interface Props {
	title: string
	cover: string | null
	selected?: boolean
	imported?: boolean
}

withDefaults(defineProps<Props>(), {
	selected: false,
	imported: false,
})

defineEmits<{
	click: []
}>()
</script>

<template>
	<div
		role="button"
		tabindex="0"
		class="import-series-card"
		:class="{ 'is-selected': selected, 'is-imported': imported }"
		@click="!imported && $emit('click')"
		@keydown.enter="!imported && $emit('click')"
		@keydown.space.prevent="!imported && $emit('click')"
	>
		<SeriesCardBase
			:title="title"
			:cover="cover"
			:disabled="imported"
			:show-accent="selected"
		>
			<template #badge>
				<!-- Selection badge -->
				<div
					v-if="selected"
					class="status-badge status-badge--selected"
				>
					<UIcon
						name="i-lucide-check"
						class="badge-icon"
					/>
				</div>
				<!-- Imported badge -->
				<div
					v-else-if="imported"
					class="status-badge status-badge--imported"
				>
					<UIcon
						name="i-lucide-lock"
						class="badge-icon"
					/>
				</div>
			</template>
		</SeriesCardBase>
	</div>
</template>

<style scoped>
.import-series-card {
	display: block;
	cursor: pointer;
}

.import-series-card.is-imported {
	cursor: not-allowed;
}

.import-series-card:not(.is-imported):hover :deep(.series-card-base) {
	transform: translateY(-6px) scale(1.02);
	box-shadow:
		0 12px 28px -8px color-mix(in oklch, var(--ui-text) 15%, transparent),
		0 4px 12px -4px color-mix(in oklch, var(--ui-text) 8%, transparent);
}

.import-series-card:not(.is-imported):active :deep(.series-card-base) {
	transform: translateY(-2px) scale(1.01);
	transition-duration: 0.1s;
}

.import-series-card:not(.is-imported):hover :deep(.cover-image) {
	transform: scale(1.08);
}

.import-series-card:not(.is-imported):hover :deep(.spine-accent) {
	height: 100%;
}

.import-series-card.is-selected :deep(.series-card-base) {
	border-color: var(--ui-primary);
}

/* Focus state for accessibility */
.import-series-card:focus-visible {
	outline: 2px solid var(--ui-primary);
	outline-offset: 2px;
}

/* Status badge */
.status-badge {
	position: absolute;
	top: 0.5rem;
	right: calc(0.75rem + 0.25rem);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.5rem;
	height: 1.5rem;
	border-radius: 50%;
	box-shadow: 0 2px 4px color-mix(in oklch, var(--ui-text) 20%, transparent);
}

.badge-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.status-badge--selected {
	background: var(--ui-primary);
	color: white;
}

.status-badge--imported {
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}
</style>
