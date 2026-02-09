<script setup lang="ts">
withDefaults(defineProps<{
	compact?: boolean
}>(), {
	compact: false,
})
</script>

<template>
	<div
		class="series-grid"
		:class="{ 'series-grid--compact': compact }"
	>
		<slot />
	</div>
</template>

<style scoped>
.series-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 1rem;
	align-items: start;
}

@media (min-width: 640px) {
	.series-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

@media (min-width: 768px) {
	.series-grid {
		grid-template-columns: repeat(4, 1fr);
	}
}

@media (min-width: 1024px) {
	.series-grid {
		grid-template-columns: repeat(5, 1fr);
	}
}

@media (min-width: 1280px) {
	.series-grid {
		grid-template-columns: repeat(6, 1fr);
	}
}

@media (min-width: 1536px) {
	.series-grid {
		grid-template-columns: repeat(8, 1fr);
	}
}

/* Compact: fewer columns for constrained containers (e.g. with side panel) */
.series-grid--compact {
	gap: 0.75rem;
}

@media (min-width: 768px) {
	.series-grid--compact {
		grid-template-columns: repeat(3, 1fr);
	}
}

@media (min-width: 1024px) {
	.series-grid--compact {
		grid-template-columns: repeat(3, 1fr);
	}
}

@media (min-width: 1280px) {
	.series-grid--compact {
		grid-template-columns: repeat(4, 1fr);
	}
}

@media (min-width: 1536px) {
	.series-grid--compact {
		grid-template-columns: repeat(6, 1fr);
	}
}
</style>
