<script setup lang="ts">
/**
 * Base card component for series display.
 * Provides the common structure and styling - use slots for page-specific badges.
 */
interface Props {
	title: string
	cover: string | null
	disabled?: boolean
	accentColor?: "primary" | "error"
	showAccent?: boolean
}

withDefaults(defineProps<Props>(), {
	disabled: false,
	accentColor: "primary",
	showAccent: false,
})
</script>

<template>
	<div
		class="series-card-base"
		:class="{
			'is-disabled': disabled,
			'show-accent': showAccent,
			'accent-error': accentColor === 'error',
		}"
	>
		<!-- Cover Section -->
		<div class="card-cover">
			<NuxtImg
				v-if="cover"
				:src="cover"
				:alt="title"
				class="cover-image"
				loading="lazy"
			/>
			<div
				v-else
				class="cover-placeholder"
			>
				<UIcon
					name="i-lucide-book-open"
					class="placeholder-icon"
				/>
			</div>

			<!-- Ink wash overlay -->
			<div class="cover-overlay" />

			<!-- Slot for badges (top-right area) -->
			<slot name="badge" />

			<!-- Slot for bottom-left badge (chapter count, etc) -->
			<slot name="badge-bottom" />
		</div>

		<!-- Title spine -->
		<div class="card-spine">
			<h3 class="series-title">
				{{ title }}
			</h3>
			<div class="spine-accent" />
		</div>
	</div>
</template>

<style scoped>
.series-card-base {
	--card-radius: 0.5rem;
	--card-cut: 0.75rem;

	position: relative;
	display: flex;
	flex-direction: column;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--card-radius);
	overflow: hidden;

	/* Angled corner cut - manga panel style */
	clip-path: polygon(
		0 0,
		calc(100% - var(--card-cut)) 0,
		100% var(--card-cut),
		100% 100%,
		0 100%
	);

	transition:
		transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
		box-shadow 0.25s ease,
		border-color 0.15s ease,
		opacity 0.15s ease;
}

.series-card-base.is-disabled {
	opacity: 0.5;
}

/* Cover Section */
.card-cover {
	position: relative;
	aspect-ratio: 2/3;
	flex-shrink: 0;
	overflow: hidden;
	background: var(--ui-bg-muted);
}

.cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.cover-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	background: linear-gradient(
		145deg,
		var(--ui-bg-muted) 0%,
		color-mix(in oklch, var(--ui-bg-muted) 80%, var(--ui-border)) 100%
	);
}

.placeholder-icon {
	width: 2.5rem;
	height: 2.5rem;
	color: var(--ui-text-dimmed);
}

/* Subtle bottom fade for spine transition */
.cover-overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(
		to bottom,
		transparent 0%,
		transparent 70%,
		color-mix(in oklch, var(--ui-bg-elevated) 40%, transparent) 85%,
		color-mix(in oklch, var(--ui-bg-elevated) 70%, transparent) 100%
	);
	pointer-events: none;
}

/* Title spine - book spine aesthetic */
.card-spine {
	position: relative;
	padding: 0.625rem 0.75rem;
	height: 3.5rem;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.series-title {
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text);
	line-height: 1.3;
	margin: 0;

	/* Two-line clamp */
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

/* Accent line - like a bookmark ribbon */
.spine-accent {
	position: absolute;
	left: 0;
	bottom: 0;
	width: 3px;
	height: 0;
	background: var(--ui-primary);
	border-radius: 0 2px 2px 0;
	transition: height 0.2s ease;
}

.series-card-base.accent-error .spine-accent {
	background: var(--ui-error);
}

.series-card-base.show-accent .spine-accent {
	height: 100%;
}
</style>
