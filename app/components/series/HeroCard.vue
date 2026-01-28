<script setup lang="ts">
const props = defineProps<{
	title: string
	synopsis: string | null
	cover: string | null
	type: string
	status: string[]
	authors: Array<{ name: string }> | null
	artists: Array<{ name: string }> | null
}>()

const showArtists = computed(() => {
	if (!props.artists?.length) return false
	return JSON.stringify(props.artists) !== JSON.stringify(props.authors)
})
</script>

<template>
	<section class="hero-section">
		<div class="hero-cover">
			<NuxtImg
				v-if="cover"
				:src="cover"
				:alt="title"
				class="cover-image"
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
		</div>

		<div class="hero-content">
			<div class="hero-header">
				<h1 class="serie-title">
					{{ title }}
				</h1>
				<div
					v-if="$slots.actions"
					class="actions-pill"
				>
					<slot name="actions" />
				</div>
			</div>

			<div class="serie-badges">
				<NuxtLink
					:to="`/series?type=${encodeURIComponent(type)}`"
					class="type-badge"
				>
					{{ type }}
				</NuxtLink>
				<NuxtLink
					v-for="s in status"
					:key="s"
					:to="`/series?status=${encodeURIComponent(s)}`"
					class="status-badge"
				>
					{{ s }}
				</NuxtLink>
			</div>

			<UiMarkdown
				:content="synopsis"
				class="synopsis"
			/>

			<div class="quick-info">
				<span
					v-if="authors?.length"
					class="info-pill"
				>
					<UIcon
						name="i-lucide-user"
						class="pill-icon"
					/>
					<template
						v-for="(author, index) in authors"
						:key="author.name"
					>
						<NuxtLink
							:to="`/series?author=${encodeURIComponent(author.name)}`"
							class="pill-link"
						>{{ author.name }}</NuxtLink><span v-if="index < authors.length - 1">, </span>
					</template>
				</span>
				<span
					v-if="showArtists && artists"
					class="info-pill"
				>
					<UIcon
						name="i-lucide-pen"
						class="pill-icon"
					/>
					<template
						v-for="(artist, index) in artists"
						:key="artist.name"
					>
						<NuxtLink
							:to="`/series?artist=${encodeURIComponent(artist.name)}`"
							class="pill-link"
						>{{ artist.name }}</NuxtLink><span v-if="index < artists.length - 1">, </span>
					</template>
				</span>
			</div>
		</div>
	</section>
</template>

<style scoped>
.hero-section {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	padding: 1.5rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
}

@media (min-width: 768px) {
	.hero-section {
		flex-direction: row;
		gap: 2rem;
	}
}

/* Cover */
.hero-cover {
	flex-shrink: 0;
	align-self: flex-start;
	width: 100%;
	max-width: 200px;
	margin: 0 auto;
	border-radius: 0.5rem;
	overflow: hidden;
	background: var(--ui-bg-muted);
	box-shadow:
		0 4px 6px -1px color-mix(in oklch, var(--ui-text) 5%, transparent),
		0 2px 4px -2px color-mix(in oklch, var(--ui-text) 5%, transparent);
}

@media (min-width: 768px) {
	.hero-cover {
		width: 180px;
		margin: 0;
	}
}

@media (min-width: 1024px) {
	.hero-cover {
		width: 220px;
	}
}

.cover-image {
	display: block;
	width: 100%;
	height: auto;
}

.cover-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.placeholder-icon {
	width: 3rem;
	height: 3rem;
	color: var(--ui-text-muted);
	opacity: 0.5;
}

/* Hero content */
.hero-content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

/* Hero header with title and actions */
.hero-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1rem;
}

/* Actions pill toolbar */
.actions-pill {
	display: flex;
	align-items: center;
	gap: 0.125rem;
	padding: 0.25rem;
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 2rem;
	flex-shrink: 0;
}

/* Style buttons and links inside the pill as icon-only circles */
.actions-pill :deep(button),
.actions-pill :deep(a) {
	width: 1.75rem !important;
	height: 1.75rem !important;
	min-width: 1.75rem !important;
	padding: 0 !important;
	border-radius: 50% !important;
	border: none !important;
	background: transparent !important;
	box-shadow: none !important;
	display: flex !important;
	align-items: center !important;
	justify-content: center !important;
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.actions-pill :deep(button:hover),
.actions-pill :deep(a:hover) {
	background: var(--ui-bg) !important;
}

/* Hide text labels inside buttons/links, but keep icons visible */
.actions-pill :deep(button > span:not([class*="i-"])),
.actions-pill :deep(a > span:not([class*="i-"])) {
	display: none !important;
}

/* Ensure icons are visible with proper styling */
.actions-pill :deep(button [class*="i-"]),
.actions-pill :deep(a [class*="i-"]) {
	display: block !important;
	width: 1rem !important;
	height: 1rem !important;
	flex-shrink: 0;
}

/* Default icon color - muted for most actions */
.actions-pill :deep([class*="i-"]) {
	color: var(--ui-text-muted);
}

/* Primary color for primary variant buttons */
.actions-pill :deep(button[data-variant="soft"][data-color="primary"] [class*="i-"]) {
	color: var(--ui-primary);
}

/* Error/delete button icon stays red */
.actions-pill :deep(button[data-color="error"] [class*="i-"]),
.actions-pill :deep(button[class*="error"] [class*="i-"]) {
	color: var(--ui-error);
}

/* Wrapper divs inside pill should not add extra space */
.actions-pill :deep(> div) {
	display: contents;
}

.serie-title {
	font-size: var(--font-size-2xl);
	font-weight: 700;
	color: var(--ui-text);
	line-height: 1.2;
	letter-spacing: -0.02em;
	margin: 0;
}

@media (min-width: 768px) {
	.serie-title {
		font-size: 1.75rem;
	}
}

@media (min-width: 1024px) {
	.serie-title {
		font-size: 2rem;
	}
}

.serie-badges {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.type-badge,
.status-badge {
	display: inline-flex;
	align-items: center;
	padding: 0.25rem 0.625rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 2rem;
	text-decoration: none;
	transition: all 0.15s ease;
}

.type-badge {
	font-weight: 600;
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
	text-transform: uppercase;
	letter-spacing: 0.03em;
}

.type-badge:hover {
	background: color-mix(in oklch, var(--ui-primary) 25%, transparent);
}

.status-badge {
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
}

.status-badge:hover {
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
}

.synopsis {
	max-width: 65ch;
}

.quick-info {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem;
	margin-top: auto;
	padding-top: 0.5rem;
}

.info-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

.pill-icon {
	width: 0.875rem;
	height: 0.875rem;
	opacity: 0.7;
}

.pill-link {
	color: inherit;
	text-decoration: none;
	transition: color 0.15s ease;
}

.pill-link:hover {
	color: var(--ui-primary);
}
</style>
