<script setup lang="ts">
type Serie = {
	id: string
	title: string
	cover: string | null
	type: string
	status: string[]
	_count: { chapters: number }
}

defineProps<{
	series: Serie[]
	loading?: boolean
}>()
</script>

<template>
	<SeriesGridSkeleton
		v-if="loading"
		:count="24"
	/>

	<SeriesGrid v-else>
		<BrowseCard
			v-for="serie in series"
			:key="serie.id"
			:serie="serie"
		/>
	</SeriesGrid>
</template>
