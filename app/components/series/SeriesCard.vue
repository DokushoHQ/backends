<script setup lang="ts">
const { formatRelativeTime } = useFormatters()

interface Props {
	serie: {
		id: string
		title: string
		cover: string | null
		_count?: { chapters: number }
		failureCount?: number
		last_chapter_at?: string | null
	}
}

defineProps<Props>()
</script>

<template>
	<NuxtLink
		:to="`/dashboard/series/${serie.id}`"
		class="series-card"
	>
		<SeriesCardBase
			:title="serie.title"
			:cover="serie.cover"
			:accent-color="(serie.failureCount ?? 0) > 0 ? 'error' : 'primary'"
		>
			<template #badge>
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
			</template>

			<template #badge-bottom>
				<!-- Chapter count - magazine style -->
				<div class="chapter-badge">
					<span class="chapter-number">{{ serie._count?.chapters ?? 0 }}</span>
					<span class="chapter-label">Ch</span>
				</div>
				<!-- Update time badge -->
				<div
					v-if="serie.last_chapter_at"
					class="update-badge"
				>
					<UIcon
						name="i-lucide-clock"
						class="update-icon"
					/>
					<span class="update-time">{{ formatRelativeTime(serie.last_chapter_at) }}</span>
				</div>
			</template>
		</SeriesCardBase>
	</NuxtLink>
</template>

<style scoped>
.series-card {
	display: block;
	text-decoration: none;
	cursor: pointer;
	border-radius: var(--radius-card);
	transition: box-shadow 0.25s ease;
}

@media (hover: hover) {
	.series-card:hover :deep(.series-card-base) {
		border-color: var(--ui-primary);
	}

	.series-card:hover :deep(.spine-accent) {
		height: 100%;
	}
}

/* Focus state for accessibility */
.series-card:focus-visible {
	outline: 2px solid var(--ui-primary);
	outline-offset: 2px;
}

/* Status stamp - ink seal style */
.status-stamp {
	position: absolute;
	top: 0.375rem;
	right: 0.375rem;
	display: flex;
	align-items: center;
	gap: 0.125rem;
	padding: 0.125rem 0.375rem;
	background: var(--ui-error);
	color: white;
	font-size: 0.5625rem;
	font-weight: 700;
	border-radius: 0.1875rem;
	box-shadow:
		0 2px 4px color-mix(in oklch, var(--ui-error) 40%, transparent),
		inset 0 1px 0 color-mix(in oklch, white 20%, transparent);
	transform: rotate(-2deg);
}

@media (min-width: 640px) {
	.status-stamp {
		top: 0.5rem;
		right: 0.5rem;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		font-size: var(--font-size-xs);
		border-radius: 0.25rem;
	}
}

.stamp-icon {
	width: 0.625rem;
	height: 0.625rem;
}

@media (min-width: 640px) {
	.stamp-icon {
		width: 0.75rem;
		height: 0.75rem;
	}
}

.stamp-count {
	font-variant-numeric: tabular-nums;
}

/* Chapter badge - magazine issue number style */
.chapter-badge {
	position: absolute;
	bottom: 0.375rem;
	left: 0.375rem;
	display: flex;
	align-items: baseline;
	gap: 0.0625rem;
	padding: 0.125rem 0.375rem;
	background: color-mix(in oklch, var(--ui-bg-elevated) 95%, transparent);
	backdrop-filter: blur(8px);
	border-radius: 0.1875rem;
	border: 1px solid var(--ui-border-muted);
}

@media (min-width: 640px) {
	.chapter-badge {
		bottom: 0.625rem;
		left: 0.625rem;
		gap: 0.125rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
	}
}

.chapter-label {
	font-size: 0.5rem;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--ui-text-muted);
}

@media (min-width: 640px) {
	.chapter-label {
		font-size: 0.625rem;
	}
}

.chapter-number {
	font-size: var(--font-size-xs);
	font-weight: 700;
	color: var(--ui-text);
	font-variant-numeric: tabular-nums;
}

@media (min-width: 640px) {
	.chapter-number {
		font-size: var(--font-size-sm);
	}
}

/* Update time badge - hidden on mobile to prevent crowding */
.update-badge {
	display: none;
}

@media (min-width: 640px) {
	.update-badge {
		display: flex;
		position: absolute;
		bottom: 0.625rem;
		right: 0.625rem;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: color-mix(in oklch, var(--ui-bg-elevated) 95%, transparent);
		backdrop-filter: blur(8px);
		border-radius: 0.25rem;
		border: 1px solid var(--ui-border-muted);
	}
}

.update-icon {
	width: 0.625rem;
	height: 0.625rem;
	color: var(--ui-text-muted);
}

.update-time {
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
}
</style>
