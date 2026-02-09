<script setup lang="ts">
withDefaults(defineProps<{
	count?: number
	compact?: boolean
}>(), {
	count: 12,
	compact: false,
})
</script>

<template>
	<SeriesGrid :compact="compact">
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
	</SeriesGrid>
</template>

<style scoped>
.skeleton-card {
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	overflow: hidden;

	animation: skeleton-fade 1.5s ease-in-out infinite;
	animation-delay: var(--delay);
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
