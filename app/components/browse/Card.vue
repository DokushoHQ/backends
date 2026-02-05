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
		<div class="browse-card__cover">
			<NuxtImg
				v-if="serie.cover"
				:src="serie.cover"
				:alt="serie.title"
				class="browse-card__image"
				loading="lazy"
				width="240"
				height="340"
			/>
			<div
				v-else
				class="browse-card__placeholder"
			>
				<UIcon
					name="i-lucide-book-open"
					class="browse-card__placeholder-icon"
				/>
			</div>

			<div class="browse-card__overlay">
				<div class="browse-card__badges">
					<span class="browse-card__type">{{ serie.type }}</span>
				</div>
				<span class="browse-card__chapters">
					{{ serie._count.chapters }} ch.
				</span>
			</div>
		</div>

		<div class="browse-card__info">
			<h3 class="browse-card__title">
				{{ serie.title }}
			</h3>
			<p
				v-if="serie.status.length > 0"
				class="browse-card__status"
			>
				{{ serie.status[0] }}
			</p>
		</div>
	</NuxtLink>
</template>

<style scoped>
.browse-card {
	display: flex;
	flex-direction: column;
	text-decoration: none;
	color: inherit;
	border-radius: var(--radius-card);
	overflow: hidden;
	transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.browse-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 8px 24px color-mix(in oklch, var(--ui-text) 8%, transparent);
}

.browse-card__cover {
	position: relative;
	aspect-ratio: 5 / 7;
	overflow: hidden;
	border-radius: var(--radius-card);
	background: var(--ui-bg-muted);
}

.browse-card__image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.3s ease;
}

.browse-card:hover .browse-card__image {
	transform: scale(1.03);
}

.browse-card__placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--ui-bg-muted);
}

.browse-card__placeholder-icon {
	width: 2.5rem;
	height: 2.5rem;
	color: var(--ui-text-dimmed);
}

.browse-card__overlay {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 0.5rem;
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	background: linear-gradient(to top, oklch(0 0 0 / 0.7), transparent);
	pointer-events: none;
}

.browse-card__badges {
	display: flex;
	gap: 0.25rem;
}

.browse-card__type {
	padding: 0.125rem 0.375rem;
	border-radius: 0.25rem;
	font-size: 0.6875rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	background: color-mix(in oklch, var(--ui-primary) 85%, transparent);
	color: oklch(0.98 0 0);
}

.browse-card__chapters {
	font-size: 0.6875rem;
	font-weight: 500;
	color: oklch(0.9 0 0);
}

.browse-card__info {
	padding: 0.5rem 0.125rem;
}

.browse-card__title {
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text);
	line-height: 1.3;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.browse-card__status {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin-top: 0.125rem;
}
</style>
