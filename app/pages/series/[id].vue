<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"

definePageMeta({
	layout: "reader",
})

const route = useRoute()
const orpc = useOrpc()

const serieId = computed(() => route.params.id as string)

const serieQuery = useQuery(computed(() =>
	orpc.serie.get.queryOptions({ input: { id: serieId.value } }),
))

const chaptersQuery = useQuery(computed(() =>
	orpc.serie.chapters.queryOptions({ input: { serieId: serieId.value } }),
))

const serie = computed(() => serieQuery.data.value)
const chapters = computed(() => chaptersQuery.data.value?.chapters ?? [])
const chapterCount = computed(() => serie.value?._count?.chapters ?? chapters.value.length)

// Group chapters by language
const chaptersByLanguage = computed(() => {
	const groups = new Map<string, typeof chapters.value>()
	for (const ch of chapters.value) {
		const lang = ch.language
		if (!groups.has(lang)) groups.set(lang, [])
		groups.get(lang)!.push(ch)
	}
	return groups
})

const availableLanguages = computed(() => [...chaptersByLanguage.value.keys()])
const selectedLanguage = ref<string | null>(null)

watch(availableLanguages, (langs) => {
	if (!langs.length) {
		selectedLanguage.value = null
		return
	}
	if (!selectedLanguage.value || !langs.includes(selectedLanguage.value)) {
		selectedLanguage.value = langs.includes("En") ? "En" : langs[0]!
	}
})

const filteredChapters = computed(() => {
	if (!selectedLanguage.value) return chapters.value
	return chaptersByLanguage.value.get(selectedLanguage.value) ?? []
})

const synopsisExpanded = ref(false)
</script>

<template>
	<div class="serie-page">
		<!-- Loading -->
		<div
			v-if="serieQuery.isLoading.value"
			class="serie-page__loading"
		>
			<UIcon
				name="i-lucide-loader-2"
				class="serie-page__spinner"
			/>
		</div>

		<!-- Error -->
		<div
			v-else-if="serieQuery.error.value"
			class="serie-page__error"
		>
			<UIcon
				name="i-lucide-alert-circle"
				class="serie-page__error-icon"
			/>
			<p>{{ serieQuery.error.value instanceof Error ? serieQuery.error.value.message : 'Failed to load series' }}</p>
			<NuxtLink
				to="/"
				class="serie-page__error-link"
			>
				Back to library
			</NuxtLink>
		</div>

		<!-- Content -->
		<template v-else-if="serie">
			<!-- Hero section -->
			<div class="serie-hero">
				<div
					v-if="serie.cover"
					class="serie-hero__backdrop"
					:style="{ backgroundImage: `url(${serie.cover})` }"
				/>
				<div class="serie-hero__content">
					<div class="serie-hero__cover">
						<NuxtImg
							v-if="serie.cover"
							:src="serie.cover"
							:alt="serie.title"
							class="serie-hero__cover-img"
							width="220"
							height="310"
						/>
						<div
							v-else
							class="serie-hero__cover-placeholder"
						>
							<UIcon
								name="i-lucide-book-open"
								class="size-10"
							/>
						</div>
					</div>
					<div class="serie-hero__info">
						<h1 class="serie-hero__title">
							{{ serie.title }}
						</h1>

						<div class="serie-hero__meta">
							<span
								v-if="serie.type"
								class="serie-hero__tag serie-hero__tag--type"
							>
								{{ serie.type }}
							</span>
							<span
								v-for="s in serie.status"
								:key="s"
								class="serie-hero__tag"
							>
								{{ s }}
							</span>
							<span class="serie-hero__stat">
								{{ chapterCount }} chapters
							</span>
						</div>

						<div
							v-if="serie.authors?.length || serie.artists?.length"
							class="serie-hero__credits"
						>
							<span v-if="serie.authors?.length">
								by {{ serie.authors.map((a: any) => a.name).join(', ') }}
							</span>
							<span v-if="serie.artists?.length && serie.artists.map((a: any) => a.name).join(',') !== (serie.authors?.map((a: any) => a.name).join(',') ?? '')">
								art by {{ serie.artists.map((a: any) => a.name).join(', ') }}
							</span>
						</div>

						<div
							v-if="serie.synopsis"
							class="serie-hero__synopsis-wrap"
						>
							<p
								class="serie-hero__synopsis"
								:class="{ 'serie-hero__synopsis--expanded': synopsisExpanded }"
							>
								{{ serie.synopsis }}
							</p>
							<button
								class="serie-hero__synopsis-toggle"
								@click="synopsisExpanded = !synopsisExpanded"
							>
								{{ synopsisExpanded ? 'Show less' : 'Show more' }}
							</button>
						</div>

						<div
							v-if="serie.genres?.length"
							class="serie-hero__genres"
						>
							<span
								v-for="genre in serie.genres"
								:key="genre.id"
								class="serie-hero__genre"
							>
								{{ genre.title }}
							</span>
						</div>

						<!-- External links -->
						<div
							v-if="serie.sources?.length"
							class="serie-hero__sources"
						>
							<a
								v-for="source in serie.sources.filter((s: any) => typeof s.external_url === 'string' && (s.external_url.startsWith('https://') || s.external_url.startsWith('http://')))"
								:key="source.id"
								:href="source.external_url!"
								target="_blank"
								rel="noopener"
								class="serie-hero__source-link"
							>
								<UIcon
									name="i-lucide-external-link"
									class="size-3.5"
								/>
								{{ source.source.name }}
							</a>
						</div>
					</div>
				</div>
			</div>

			<!-- Chapters section -->
			<div class="serie-chapters">
				<div class="serie-chapters__header">
					<h2 class="serie-chapters__title">
						Chapters
					</h2>

					<div
						v-if="availableLanguages.length > 1"
						class="serie-chapters__langs"
					>
						<button
							v-for="lang in availableLanguages"
							:key="lang"
							class="serie-chapters__lang-btn"
							:class="{ 'serie-chapters__lang-btn--active': selectedLanguage === lang }"
							@click="selectedLanguage = lang"
						>
							{{ lang }}
						</button>
					</div>
				</div>

				<div
					v-if="chaptersQuery.isLoading.value"
					class="serie-chapters__loading"
				>
					<UIcon
						name="i-lucide-loader-2"
						class="serie-page__spinner"
					/>
				</div>

				<div
					v-else-if="chaptersQuery.error.value"
					class="serie-chapters__error"
				>
					<UIcon
						name="i-lucide-alert-circle"
						class="size-8"
					/>
					<p>{{ chaptersQuery.error.value instanceof Error ? chaptersQuery.error.value.message : 'Failed to load chapters' }}</p>
				</div>

				<div
					v-else-if="filteredChapters.length === 0"
					class="serie-chapters__empty"
				>
					<UIcon
						name="i-lucide-book-x"
						class="size-8"
					/>
					<p>No chapters available</p>
				</div>

				<div
					v-else
					class="serie-chapters__list"
				>
					<NuxtLink
						v-for="chapter in filteredChapters"
						:key="chapter.id"
						:to="`/read/${serieId}/${chapter.id}`"
						class="serie-chapter-row"
					>
						<div class="serie-chapter-row__main">
							<span class="serie-chapter-row__number">
								Ch. {{ chapter.chapter_number }}
							</span>
							<span
								v-if="chapter.title"
								class="serie-chapter-row__title"
							>
								{{ chapter.title }}
							</span>
						</div>
						<div class="serie-chapter-row__meta">
							<span
								v-if="chapter.groups?.length"
								class="serie-chapter-row__group"
							>
								{{ chapter.groups![0]!.name }}
							</span>
							<span class="serie-chapter-row__date">
								{{ new Date(chapter.date_upload).toLocaleDateString() }}
							</span>
						</div>
					</NuxtLink>
				</div>
			</div>
		</template>
	</div>
</template>

<style scoped>
.serie-page {
	flex: 1;
}

.serie-page__loading,
.serie-page__error {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	gap: 1rem;
}

.serie-page__spinner {
	width: 2rem;
	height: 2rem;
	color: var(--ui-text-dimmed);
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.serie-page__error-icon {
	width: 3rem;
	height: 3rem;
	color: var(--ui-error);
}

.serie-page__error p {
	color: var(--ui-text-muted);
}

.serie-page__error-link {
	color: var(--ui-primary);
	text-decoration: none;
	font-size: var(--font-size-sm);
}

/* Hero */
.serie-hero {
	position: relative;
	overflow: hidden;
}

.serie-hero__backdrop {
	position: absolute;
	inset: 0;
	background-size: cover;
	background-position: center;
	filter: blur(40px) brightness(0.3);
	opacity: 0.5;
	transform: scale(1.2);
}

.serie-hero__content {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1.25rem;
	padding: 2rem 1rem;
}

@media (min-width: 640px) {
	.serie-hero__content {
		flex-direction: row;
		align-items: flex-start;
		padding: 2.5rem 1.5rem;
		gap: 2rem;
	}
}

@media (min-width: 1280px) {
	.serie-hero__content {
		padding: 3rem 2.5rem;
		gap: 2.5rem;
	}
}

.serie-hero__cover {
	flex-shrink: 0;
	width: 160px;
}

@media (min-width: 640px) {
	.serie-hero__cover {
		width: 200px;
	}
}

@media (min-width: 1280px) {
	.serie-hero__cover {
		width: 220px;
	}
}

.serie-hero__cover-img {
	width: 100%;
	height: auto;
	border-radius: var(--radius-card);
	box-shadow: 0 8px 32px oklch(0 0 0 / 0.3);
}

.serie-hero__cover-placeholder {
	aspect-ratio: 5 / 7;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--ui-bg-muted);
	border-radius: var(--radius-card);
	color: var(--ui-text-dimmed);
}

.serie-hero__info {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 0.5rem;
	min-width: 0;
}

@media (min-width: 640px) {
	.serie-hero__info {
		align-items: flex-start;
		text-align: left;
	}
}

.serie-hero__title {
	font-size: var(--font-size-xl);
	font-weight: 700;
	color: var(--ui-text);
	line-height: 1.2;
	letter-spacing: -0.01em;
}

@media (min-width: 640px) {
	.serie-hero__title {
		font-size: var(--font-size-2xl);
	}
}

.serie-hero__meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.375rem;
}

.serie-hero__tag {
	padding: 0.125rem 0.5rem;
	border-radius: 0.25rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}

.serie-hero__tag--type {
	background: color-mix(in oklch, var(--ui-primary) 15%, transparent);
	color: var(--ui-primary);
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.serie-hero__stat {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
}

.serie-hero__credits {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.serie-hero__synopsis-wrap {
	margin-top: 0.25rem;
}

.serie-hero__synopsis {
	font-size: var(--font-size-base);
	color: var(--ui-text-muted);
	line-height: 1.6;
	display: -webkit-box;
	-webkit-line-clamp: 4;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.serie-hero__synopsis--expanded {
	display: block;
	-webkit-line-clamp: unset;
}

.serie-hero__synopsis-toggle {
	background: none;
	border: none;
	padding: 0;
	margin-top: 0.25rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-primary);
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;
}

@media (min-width: 640px) {
	.serie-hero__synopsis {
		-webkit-line-clamp: unset;
		display: block;
	}

	.serie-hero__synopsis-toggle {
		display: none;
	}
}

.serie-hero__synopsis-toggle:hover {
	text-decoration: underline;
}

.serie-hero__genres {
	display: flex;
	flex-wrap: wrap;
	gap: 0.25rem;
	margin-top: 0.25rem;
}

.serie-hero__genre {
	padding: 0.125rem 0.375rem;
	border-radius: 0.25rem;
	font-size: 0.6875rem;
	background: color-mix(in oklch, var(--ui-text) 8%, transparent);
	color: var(--ui-text-muted);
}

.serie-hero__sources {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin-top: 0.25rem;
}

.serie-hero__source-link {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	text-decoration: none;
	transition: color 0.15s ease;
}

.serie-hero__source-link:hover {
	color: var(--ui-primary);
}

/* Chapters */
.serie-chapters {
	padding: 1.5rem 1rem 3rem;
}

@media (min-width: 640px) {
	.serie-chapters {
		padding: 1.5rem 1.5rem 3rem;
	}
}

@media (min-width: 1280px) {
	.serie-chapters {
		padding: 2rem 2.5rem 3rem;
	}
}

.serie-chapters__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 1rem;
}

.serie-chapters__title {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
}

.serie-chapters__langs {
	display: flex;
	gap: 0.25rem;
}

.serie-chapters__lang-btn {
	padding: 0.25rem 0.5rem;
	border: 1px solid var(--ui-border);
	border-radius: 0.375rem;
	background: transparent;
	color: var(--ui-text-muted);
	font-size: var(--font-size-xs);
	font-weight: 500;
	cursor: pointer;
	transition: all 0.15s ease;
}

.serie-chapters__lang-btn:hover {
	border-color: var(--ui-primary);
}

.serie-chapters__lang-btn--active {
	background: var(--ui-primary);
	border-color: var(--ui-primary);
	color: oklch(0.98 0 0);
}

.serie-chapters__loading,
.serie-chapters__empty,
.serie-chapters__error {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.5rem;
	padding: 3rem 1rem;
	color: var(--ui-text-dimmed);
}

.serie-chapters__list {
	display: flex;
	flex-direction: column;
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
	overflow: hidden;
}

.serie-chapter-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0.875rem 1rem;
	gap: 1rem;
	text-decoration: none;
	color: inherit;
	border-bottom: 1px solid var(--ui-border);
	-webkit-tap-highlight-color: transparent;
	transition: background-color 0.15s ease;
}

@media (min-width: 640px) {
	.serie-chapter-row {
		padding: 0.75rem 1rem;
	}
}

.serie-chapter-row:last-child {
	border-bottom: none;
}

.serie-chapter-row:hover {
	background: var(--ui-bg-muted);
}

.serie-chapter-row:active {
	background: color-mix(in oklch, var(--ui-text) 6%, transparent);
}

.serie-chapter-row__main {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	min-width: 0;
}

.serie-chapter-row__number {
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text);
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
}

.serie-chapter-row__title {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.serie-chapter-row__meta {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	flex-shrink: 0;
}

.serie-chapter-row__group {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	max-width: 120px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	display: none;
}

@media (min-width: 640px) {
	.serie-chapter-row__group {
		display: inline;
	}
}

.serie-chapter-row__date {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
}
</style>
