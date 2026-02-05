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
	<div class="browse-grid">
		<template v-if="loading">
			<div
				v-for="i in 12"
				:key="i"
				class="browse-grid__skeleton"
			>
				<div class="browse-grid__skeleton-cover" />
				<div class="browse-grid__skeleton-text" />
				<div class="browse-grid__skeleton-text browse-grid__skeleton-text--short" />
			</div>
		</template>

		<template v-else>
			<BrowseCard
				v-for="serie in series"
				:key="serie.id"
				:serie="serie"
			/>
		</template>
	</div>
</template>

<style scoped>
.browse-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	gap: 1rem;
}

@media (min-width: 640px) {
	.browse-grid {
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 1.25rem;
	}
}

@media (min-width: 1024px) {
	.browse-grid {
		grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
		gap: 1.5rem;
	}
}

.browse-grid__skeleton {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	animation: pulse 1.5s ease-in-out infinite;
}

.browse-grid__skeleton-cover {
	aspect-ratio: 5 / 7;
	border-radius: var(--radius-card);
	background: var(--ui-bg-muted);
}

.browse-grid__skeleton-text {
	height: 0.75rem;
	border-radius: 0.25rem;
	background: var(--ui-bg-muted);
}

.browse-grid__skeleton-text--short {
	width: 60%;
}

@keyframes pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.5; }
}
</style>
