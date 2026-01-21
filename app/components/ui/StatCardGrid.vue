<script setup lang="ts">
defineProps<{
	cols?: 2 | 3 | 4 | 5
}>()
</script>

<template>
	<div
		class="stat-card-grid"
		:class="`cols-${cols || 5}`"
	>
		<slot />
	</div>
</template>

<style scoped>
.stat-card-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 0.75rem;
}

/* Last card spans remaining space on mobile (2 cols) */
.stat-card-grid :slotted(:last-child:nth-child(odd)) {
	grid-column: 1 / -1;
	justify-content: center;
}

/* 3 column layouts */
@media (min-width: 640px) {
	.stat-card-grid.cols-3,
	.stat-card-grid.cols-4,
	.stat-card-grid.cols-5 {
		grid-template-columns: repeat(3, 1fr);
	}

	.stat-card-grid :slotted(:last-child:nth-child(odd)) {
		grid-column: auto;
		justify-content: flex-start;
	}

	.stat-card-grid.cols-3 :slotted(:last-child:nth-child(3n + 1)),
	.stat-card-grid.cols-4 :slotted(:last-child:nth-child(3n + 1)),
	.stat-card-grid.cols-5 :slotted(:last-child:nth-child(3n + 1)) {
		grid-column: 1 / -1;
		justify-content: center;
	}

	.stat-card-grid.cols-3 :slotted(:last-child:nth-child(3n + 2)),
	.stat-card-grid.cols-4 :slotted(:last-child:nth-child(3n + 2)),
	.stat-card-grid.cols-5 :slotted(:last-child:nth-child(3n + 2)) {
		grid-column: span 2;
		justify-content: center;
	}
}

/* 4 column layouts */
@media (min-width: 768px) {
	.stat-card-grid.cols-4,
	.stat-card-grid.cols-5 {
		grid-template-columns: repeat(4, 1fr);
	}

	.stat-card-grid.cols-4 :slotted(:last-child:nth-child(3n + 1)),
	.stat-card-grid.cols-4 :slotted(:last-child:nth-child(3n + 2)),
	.stat-card-grid.cols-5 :slotted(:last-child:nth-child(3n + 1)),
	.stat-card-grid.cols-5 :slotted(:last-child:nth-child(3n + 2)) {
		grid-column: auto;
		justify-content: flex-start;
	}

	.stat-card-grid.cols-4 :slotted(:last-child:nth-child(4n + 1)),
	.stat-card-grid.cols-5 :slotted(:last-child:nth-child(4n + 1)) {
		grid-column: 1 / -1;
		justify-content: center;
	}

	.stat-card-grid.cols-4 :slotted(:last-child:nth-child(4n + 2)),
	.stat-card-grid.cols-5 :slotted(:last-child:nth-child(4n + 2)) {
		grid-column: span 3;
		justify-content: center;
	}

	.stat-card-grid.cols-4 :slotted(:last-child:nth-child(4n + 3)),
	.stat-card-grid.cols-5 :slotted(:last-child:nth-child(4n + 3)) {
		grid-column: span 2;
		justify-content: center;
	}
}

/* 5 column layouts */
@media (min-width: 1024px) {
	.stat-card-grid.cols-5 {
		grid-template-columns: repeat(5, 1fr);
	}

	.stat-card-grid.cols-5 :slotted(:last-child:nth-child(4n + 1)),
	.stat-card-grid.cols-5 :slotted(:last-child:nth-child(4n + 2)),
	.stat-card-grid.cols-5 :slotted(:last-child:nth-child(4n + 3)) {
		grid-column: auto;
		justify-content: flex-start;
	}
}
</style>
