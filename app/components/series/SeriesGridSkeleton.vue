<script setup lang="ts">
withDefaults(defineProps<{
	count?: number
}>(), {
	count: 12,
})
</script>

<template>
	<div class="series-grid">
		<div
			v-for="i in count"
			:key="i"
			class="skeleton-card"
			:style="{ '--delay': `${i * 50}ms` }"
		>
			<div class="skeleton-cover">
				<div class="skeleton-shimmer" />
				<!-- Halftone dots pattern - manga printing aesthetic -->
				<div class="halftone-pattern" />
			</div>
			<div class="skeleton-spine">
				<div class="skeleton-title" />
				<div class="skeleton-subtitle" />
			</div>
		</div>
	</div>
</template>

<style scoped>
/* Series grid */
.series-grid {
	display: grid;
	gap: 1rem;
	grid-template-columns: repeat(2, 1fr);
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

.skeleton-card {
	--card-radius: 0.5rem;
	--card-cut: 0.5rem;

	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--card-radius);
	overflow: hidden;

	/* Match the angled corner cut of real cards */
	clip-path: polygon(
		0 0,
		calc(100% - var(--card-cut)) 0,
		100% var(--card-cut),
		100% 100%,
		0 100%
	);

	animation: skeleton-fade 1.5s ease-in-out infinite;
	animation-delay: var(--delay);
}

@media (min-width: 640px) {
	.skeleton-card {
		--card-cut: 0.75rem;
	}
}

@keyframes skeleton-fade {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.6;
	}
}

.skeleton-cover {
	position: relative;
	aspect-ratio: 2/3;
	background: var(--ui-bg-muted);
	overflow: hidden;
}

/* Halftone dot pattern - manga printing aesthetic */
.halftone-pattern {
	position: absolute;
	inset: 0;
	opacity: 0.08;
	background-image: radial-gradient(
		circle,
		var(--ui-text) 1px,
		transparent 1px
	);
	background-size: 6px 6px;
}

.skeleton-shimmer {
	position: absolute;
	inset: 0;
	background: linear-gradient(
		90deg,
		transparent 0%,
		color-mix(in oklch, var(--ui-text) 5%, transparent) 50%,
		transparent 100%
	);
	animation: shimmer 2s ease-in-out infinite;
	animation-delay: var(--delay);
}

@keyframes shimmer {
	0% {
		transform: translateX(-100%);
	}
	100% {
		transform: translateX(100%);
	}
}

.skeleton-spine {
	padding: 0.375rem 0.5rem;
	min-height: 2.75rem;
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	justify-content: center;
}

@media (min-width: 640px) {
	.skeleton-spine {
		padding: 0.625rem 0.75rem;
		min-height: 3.25rem;
		gap: 0.375rem;
	}
}

.skeleton-title {
	height: 0.875rem;
	width: 85%;
	background: var(--ui-bg-muted);
	border-radius: 0.25rem;
}

.skeleton-subtitle {
	height: 0.75rem;
	width: 50%;
	background: var(--ui-bg-muted);
	border-radius: 0.25rem;
}
</style>
