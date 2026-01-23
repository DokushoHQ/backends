<script setup lang="ts">
interface Props {
	serie: {
		id: string
		title: string
		cover: string | null
		_count?: { chapters: number }
		failureCount?: number
	}
}

defineProps<Props>()
</script>

<template>
	<NuxtLink
		:to="`/series/${serie.id}`"
		class="series-card"
		:class="{ 'has-issues': (serie.failureCount ?? 0) > 0 }"
	>
		<!-- Cover Section -->
		<div class="card-cover">
			<NuxtImg
				v-if="serie.cover"
				:src="serie.cover"
				:alt="serie.title"
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

			<!-- Issue/failure stamp -->
			<div
				v-if="(serie.failureCount ?? 0) > 0"
				class="status-stamp"
			>
				<UIcon
					name="i-lucide-alert-triangle"
					class="stamp-icon"
				/>
				<span class="stamp-count">{{ serie.failureCount }}</span>
			</div>

			<!-- Chapter count - magazine style -->
			<div class="chapter-badge">
				<span class="chapter-number">{{ serie._count?.chapters ?? 0 }}</span>
				<span class="chapter-label">Ch</span>
			</div>
		</div>

		<!-- Title spine -->
		<div class="card-spine">
			<h3 class="series-title">
				{{ serie.title }}
			</h3>
			<div class="spine-accent" />
		</div>
	</NuxtLink>
</template>

<style scoped>
.series-card {
	--card-radius: 0.5rem;
	--card-cut: 0.75rem;

	position: relative;
	display: flex;
	flex-direction: column;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--card-radius);
	overflow: hidden;
	text-decoration: none;

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
		box-shadow 0.25s ease;
}

.series-card:hover {
	transform: translateY(-6px) scale(1.02);
	box-shadow:
		0 12px 28px -8px color-mix(in oklch, var(--ui-text) 15%, transparent),
		0 4px 12px -4px color-mix(in oklch, var(--ui-text) 8%, transparent);
}

.series-card:active {
	transform: translateY(-2px) scale(1.01);
	transition-duration: 0.1s;
}

/* Cover Section */
.card-cover {
	position: relative;
	aspect-ratio: 2/3;
	overflow: hidden;
	background: var(--ui-bg-muted);
}

.cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.series-card:hover .cover-image {
	transform: scale(1.08);
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

/* Ink wash overlay - brushstroke-inspired gradient */
.cover-overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(
		175deg,
		transparent 0%,
		transparent 40%,
		color-mix(in oklch, var(--ui-bg-elevated) 20%, transparent) 60%,
		color-mix(in oklch, var(--ui-bg-elevated) 85%, transparent) 90%,
		var(--ui-bg-elevated) 100%
	);
	pointer-events: none;
}

/* Status stamp - ink seal style */
.status-stamp {
	position: absolute;
	top: 0.5rem;
	right: calc(var(--card-cut) + 0.25rem);
	display: flex;
	align-items: center;
	gap: 0.25rem;
	padding: 0.25rem 0.5rem;
	background: var(--ui-error);
	color: white;
	font-size: var(--font-size-xs);
	font-weight: 700;
	border-radius: 0.25rem;
	box-shadow:
		0 2px 4px color-mix(in oklch, var(--ui-error) 40%, transparent),
		inset 0 1px 0 color-mix(in oklch, white 20%, transparent);

	/* Slight rotation for hand-stamped feel */
	transform: rotate(-2deg);
}

.stamp-icon {
	width: 0.75rem;
	height: 0.75rem;
}

.stamp-count {
	font-variant-numeric: tabular-nums;
}

/* Chapter badge - magazine issue number style */
.chapter-badge {
	position: absolute;
	bottom: 0.625rem;
	left: 0.625rem;
	display: flex;
	align-items: baseline;
	gap: 0.125rem;
	padding: 0.25rem 0.5rem;
	background: color-mix(in oklch, var(--ui-bg-elevated) 95%, transparent);
	backdrop-filter: blur(8px);
	border-radius: 0.25rem;
	border: 1px solid var(--ui-border-muted);
}

.chapter-label {
	font-size: 0.625rem;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--ui-text-muted);
}

.chapter-number {
	font-size: var(--font-size-sm);
	font-weight: 700;
	color: var(--ui-text);
	font-variant-numeric: tabular-nums;
}

/* Title spine - book spine aesthetic */
.card-spine {
	position: relative;
	padding: 0.625rem 0.75rem;
	min-height: 3.25rem;
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

.series-card:hover .spine-accent {
	height: 100%;
}

.series-card.has-issues .spine-accent {
	background: var(--ui-error);
}

/* Focus state for accessibility */
.series-card:focus-visible {
	outline: 2px solid var(--ui-primary);
	outline-offset: 2px;
}
</style>
