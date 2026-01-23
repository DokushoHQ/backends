<script setup lang="ts">
const props = defineProps<{
	// Match ChapterTable's prop type exactly
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	items: Array<{ type: "chapter", data: any } | { type: "missing", chapterNumber: number }>
	isAdmin: boolean
	serieId: string
	enabledCount: number
	disabledCount: number
	missingCount: number
	loading: boolean
}>()

defineEmits<{
	chaptersDeleted: []
	chaptersAcknowledged: []
}>()

const description = computed(() => {
	if (props.loading) return "Loading chapters..."

	let desc = `${props.enabledCount} available`
	if (props.disabledCount > 0) desc += `, ${props.disabledCount} disabled`
	if (props.missingCount > 0) desc += `, ${props.missingCount} missing`
	return desc
})
</script>

<template>
	<UiContentCard
		title="Chapters"
		:description="description"
		icon="i-lucide-layers"
		color="purple"
	>
		<div
			v-if="loading"
			class="loading-state"
		>
			<UIcon
				name="i-lucide-loader-2"
				class="loading-spinner"
			/>
		</div>
		<SeriesChapterTable
			v-else
			:items="items"
			:is-admin="isAdmin"
			:serie-id="serieId"
			@chapters-deleted="$emit('chaptersDeleted')"
			@chapters-acknowledged="$emit('chaptersAcknowledged')"
		/>
	</UiContentCard>
</template>

<style scoped>
.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rem;
}

.loading-spinner {
	width: 2rem;
	height: 2rem;
	color: var(--ui-text-muted);
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
