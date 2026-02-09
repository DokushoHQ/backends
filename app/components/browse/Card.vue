<script setup lang="ts">
defineProps<{
	serie: {
		id: string
		title: string
		cover: string | null
		type: string
		status: string[]
		_count: { chapters: number }
	}
}>()
</script>

<template>
	<NuxtLink
		:to="`/series/${serie.id}`"
		class="browse-card"
	>
		<SeriesCardBase
			:title="serie.title"
			:cover="serie.cover"
		>
			<template #badge>
				<div
					v-if="serie.type"
					class="type-badge"
				>
					{{ serie.type }}
				</div>
			</template>

			<template #badge-bottom>
				<div class="chapter-badge">
					<span class="chapter-number">{{ serie._count.chapters }}</span>
					<span class="chapter-label">Ch</span>
				</div>
				<div
					v-if="serie.status.length > 0"
					class="status-badge"
				>
					{{ serie.status[0] }}
				</div>
			</template>
		</SeriesCardBase>
	</NuxtLink>
</template>

<style scoped>
.browse-card {
	display: block;
	text-decoration: none;
	cursor: pointer;
	border-radius: var(--radius-card);
	transition: box-shadow 0.25s ease;
	-webkit-tap-highlight-color: transparent;
}

@media (hover: hover) {
	.browse-card:hover :deep(.series-card-base) {
		border-color: var(--ui-primary);
	}

	.browse-card:hover :deep(.spine-accent) {
		height: 100%;
	}
}

.browse-card:focus-visible {
	outline: 2px solid var(--ui-primary);
	outline-offset: 2px;
}

/* Type badge - top right */
.type-badge {
	position: absolute;
	top: 0.375rem;
	right: 0.375rem;
	padding: 0.0625rem 0.25rem;
	font-size: 0.5625rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	background: color-mix(in oklch, var(--ui-primary) 85%, transparent);
	color: oklch(0.98 0 0);
	border-radius: 0.1875rem;
}

@media (min-width: 640px) {
	.type-badge {
		top: 0.5rem;
		right: 0.5rem;
		padding: 0.125rem 0.375rem;
		font-size: 0.6875rem;
		border-radius: 0.25rem;
	}
}

/* Chapter badge - bottom left */
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
	border: 1px solid var(--ui-border);
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

/* Status badge - hidden on mobile to prevent crowding */
.status-badge {
	display: none;
}

@media (min-width: 640px) {
	.status-badge {
		display: block;
		position: absolute;
		bottom: 0.625rem;
		right: 0.625rem;
		padding: 0.25rem 0.5rem;
		font-size: var(--font-size-xs);
		font-weight: 500;
		color: var(--ui-text-muted);
		background: color-mix(in oklch, var(--ui-bg-elevated) 95%, transparent);
		backdrop-filter: blur(8px);
		border-radius: 0.25rem;
		border: 1px solid var(--ui-border);
	}
}
</style>
