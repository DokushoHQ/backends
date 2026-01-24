<script setup lang="ts">
const { formatRelativeTime } = useFormatters()

defineProps<{
	type: string
	status: string[]
	authors: Array<{ name: string }> | null
	artists: Array<{ name: string }> | null
	genres: Array<{ id: string, title: string }> | null
	updatedAt: string | Date
	createdAt: string | Date
}>()
</script>

<template>
	<div class="details-card">
		<div class="card-header">
			<h3 class="card-title">
				<UIcon
					name="i-lucide-book-open"
					class="title-icon"
				/>
				Details
			</h3>
		</div>

		<div class="info-grid">
			<div class="info-item">
				<span class="info-label">Type</span>
				<NuxtLink
					:to="`/series?type=${encodeURIComponent(type)}`"
					class="info-value type-value clickable-value"
				>
					{{ type }}
				</NuxtLink>
			</div>
			<div class="info-item">
				<span class="info-label">Status</span>
				<div class="info-badges">
					<NuxtLink
						v-for="s in status"
						:key="s"
						:to="`/series?status=${encodeURIComponent(s)}`"
						class="badge-status clickable-badge"
					>
						{{ s }}
					</NuxtLink>
				</div>
			</div>
			<div
				v-if="authors?.length"
				class="info-item full-width"
			>
				<span class="info-label">Author</span>
				<span class="info-value">
					<template
						v-for="(author, index) in authors"
						:key="author.name"
					>
						<NuxtLink
							:to="`/series?author=${encodeURIComponent(author.name)}`"
							class="clickable-name"
						>{{ author.name }}</NuxtLink><span v-if="index < authors.length - 1">, </span>
					</template>
				</span>
			</div>
			<div
				v-if="artists?.length"
				class="info-item full-width"
			>
				<span class="info-label">Artist</span>
				<span class="info-value">
					<template
						v-for="(artist, index) in artists"
						:key="artist.name"
					>
						<NuxtLink
							:to="`/series?artist=${encodeURIComponent(artist.name)}`"
							class="clickable-name"
						>{{ artist.name }}</NuxtLink><span v-if="index < artists.length - 1">, </span>
					</template>
				</span>
			</div>
			<div class="info-item">
				<span class="info-label">Updated</span>
				<span class="info-value">{{ formatRelativeTime(updatedAt) }}</span>
			</div>
			<div class="info-item">
				<span class="info-label">Added</span>
				<span class="info-value">{{ formatRelativeTime(createdAt) }}</span>
			</div>
		</div>

		<!-- Genres -->
		<div
			v-if="genres?.length"
			class="genres-section"
		>
			<span class="genres-label">Genres</span>
			<div class="genres-list">
				<NuxtLink
					v-for="g in genres"
					:key="g.id"
					:to="`/series?genre=${encodeURIComponent(g.title)}`"
					class="genre-tag"
				>
					{{ g.title }}
				</NuxtLink>
			</div>
		</div>
	</div>
</template>

<style scoped>
.details-card {
	display: flex;
	flex-direction: column;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.75rem;
	overflow: hidden;
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1rem;
	border-bottom: 1px solid var(--ui-border-muted);
}

.card-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: var(--font-size-base);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
}

.title-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
}

/* Info Grid */
.info-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 1rem;
	padding: 1rem;
}

.info-item {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.info-item.full-width {
	grid-column: span 2;
}

.info-label {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

.info-value {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.type-value {
	text-transform: capitalize;
}

.info-badges {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
}

.badge-status {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	padding: 0.1875rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 2rem;
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
}

/* Genres Section */
.genres-section {
	padding: 1rem;
	border-top: 1px solid var(--ui-border-muted);
}

.genres-label {
	display: block;
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin-bottom: 0.625rem;
}

.genres-list {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
}

/* Clickable elements */
.clickable-value {
	text-decoration: none;
	transition: color 0.15s ease;
}

.clickable-value:hover {
	color: var(--ui-primary);
}

.clickable-name {
	text-decoration: none;
	color: inherit;
	transition: color 0.15s ease;
}

.clickable-name:hover {
	color: var(--ui-primary);
}

.clickable-badge {
	text-decoration: none;
	transition: all 0.15s ease;
}

.clickable-badge:hover {
	background: var(--ui-primary-soft);
	color: var(--ui-primary);
}

.genre-tag {
	display: inline-flex;
	padding: 0.25rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: transparent;
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	text-decoration: none;
	transition: all 0.15s ease;
}

.genre-tag:hover {
	border-color: var(--ui-primary);
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
}
</style>
