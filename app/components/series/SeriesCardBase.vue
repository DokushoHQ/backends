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

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	accentColor: "primary",
	showAccent: false,
})

const runtimeConfig = useRuntimeConfig()

// S3 images use default `ipx` provider for resizing; external images use `smart` (proxy + passthrough)
const imageProvider = computed(() => {
	const s3Base = runtimeConfig.public.s3PublicBaseUrl
	if (s3Base && props.cover?.startsWith(s3Base)) return undefined
	return "smart"
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
				:provider="imageProvider"
				class="cover-image"
				loading="lazy"
				decoding="async"
				sizes="140px sm:170px md:200px lg:180px xl:200px 2xl:220px"
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
	position: relative;
	display: flex;
	flex-direction: column;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
	overflow: hidden;

	transition:
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
	padding: 0.375rem 0.5rem;
	min-height: 2.75rem;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

@media (min-width: 640px) {
	.card-spine {
		padding: 0.625rem 0.75rem;
		min-height: 3.5rem;
	}
}

.series-title {
	font-size: var(--font-size-xs);
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

@media (min-width: 640px) {
	.series-title {
		font-size: var(--font-size-sm);
	}
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
