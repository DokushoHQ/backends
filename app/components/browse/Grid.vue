<script setup lang="ts">
defineProps<{
	series: Array<{
		id: string
		title: string
		cover: string | null
		type: string
		status: string[]
		_count: { chapters: number }
	}>
	loading?: boolean
}>()
</script>

<template>
	<SeriesGridSkeleton
		v-if="loading"
		:count="24"
	/>

	<div
		v-else
		class="browse-grid"
	>
		<BrowseCard
			v-for="serie in series"
			:key="serie.id"
			:serie="serie"
		/>
	</div>
</template>

<style scoped>
.browse-grid {
	display: grid;
	gap: 1rem;
	grid-template-columns: repeat(2, 1fr);
	align-items: start;
}

@media (min-width: 640px) {
	.browse-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

@media (min-width: 768px) {
	.browse-grid {
		grid-template-columns: repeat(4, 1fr);
	}
}

@media (min-width: 1024px) {
	.browse-grid {
		grid-template-columns: repeat(5, 1fr);
	}
}

@media (min-width: 1280px) {
	.browse-grid {
		grid-template-columns: repeat(6, 1fr);
	}
}

@media (min-width: 1536px) {
	.browse-grid {
		grid-template-columns: repeat(8, 1fr);
	}
}
</style>
