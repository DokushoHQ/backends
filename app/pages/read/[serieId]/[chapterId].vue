<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"

definePageMeta({
	layout: "blank",
})

const route = useRoute()
const orpc = useOrpc()

const serieId = ref(route.params.serieId as string)
const chapterId = ref(route.params.chapterId as string)

// Watch route changes for chapter navigation
watch(() => route.params, (params) => {
	serieId.value = params.serieId as string
	chapterId.value = params.chapterId as string
})

const {
	imagePages,
	loading,
	error,
	prevChapter,
	nextChapter,
	mode,
	currentPage,
	nextPage,
	prevPage,
	preloadImages,
	toggleFullscreen,
} = useReader(serieId, chapterId)

// Fetch serie info for toolbar
const serieQuery = useQuery(computed(() =>
	orpc.serie.get.queryOptions({ input: { id: serieId.value } }),
))

// Find current chapter from chapters list
const chaptersQuery = useQuery(computed(() =>
	orpc.serie.chapters.queryOptions({ input: { serieId: serieId.value } }),
))

const serieInfo = computed(() =>
	serieQuery.data.value ? { title: serieQuery.data.value.title } : null,
)

const chapterInfo = computed(() => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ch = chaptersQuery.data.value?.chapters.find((c: any) => c.id === chapterId.value)
	return ch ? { chapter_number: ch.chapter_number, title: ch.title } : null
})

// Preload on vertical scroll visibility
function handlePageVisible(index: number) {
	preloadImages(index + 1)
}
</script>

<template>
	<div class="reader-view">
		<!-- Toolbar -->
		<ReaderToolbar
			v-if="serieInfo && chapterInfo"
			:serie-id="serieId"
			:serie-title="serieInfo.title"
			:chapter-number="chapterInfo.chapter_number"
			:chapter-title="chapterInfo.title"
			:prev-chapter="prevChapter"
			:next-chapter="nextChapter"
			:mode="mode"
			@update:mode="mode = $event"
			@toggle-fullscreen="toggleFullscreen"
		/>

		<!-- Loading -->
		<div
			v-if="loading"
			class="reader-view__loading"
		>
			<UIcon
				name="i-lucide-loader-2"
				class="reader-view__spinner"
			/>
		</div>

		<!-- Error -->
		<div
			v-else-if="error"
			class="reader-view__error"
		>
			<UIcon
				name="i-lucide-alert-circle"
				class="reader-view__error-icon"
			/>
			<p class="reader-view__error-text">
				{{ error }}
			</p>
			<NuxtLink
				:to="`/series/${serieId}`"
				class="reader-view__error-link"
			>
				Back to series
			</NuxtLink>
		</div>

		<!-- Empty -->
		<div
			v-else-if="imagePages.length === 0"
			class="reader-view__empty"
		>
			<UIcon
				name="i-lucide-image-off"
				class="size-10"
			/>
			<p>No pages available for this chapter</p>
			<NuxtLink
				:to="`/series/${serieId}`"
				class="reader-view__error-link"
			>
				Back to series
			</NuxtLink>
		</div>

		<!-- Reader content -->
		<div
			v-else
			class="reader-view__content"
		>
			<!-- Vertical mode -->
			<ReaderVertical
				v-if="mode === 'vertical'"
				:pages="imagePages"
				@page-visible="handlePageVisible"
			/>

			<!-- Paged mode -->
			<ReaderPaged
				v-else
				:pages="imagePages"
				:current-page="currentPage"
				@next="nextPage"
				@prev="prevPage"
			/>
		</div>

		<!-- Chapter end navigation -->
		<div
			v-if="!loading && imagePages.length > 0"
			class="reader-view__end-nav"
		>
			<div class="reader-view__end-nav-inner">
				<NuxtLink
					v-if="prevChapter"
					:to="`/read/${serieId}/${prevChapter.id}`"
					class="reader-view__end-btn"
				>
					<UIcon
						name="i-lucide-chevron-left"
						class="size-4"
					/>
					Previous: Ch. {{ prevChapter.chapter_number }}
				</NuxtLink>
				<span v-else />

				<NuxtLink
					:to="`/series/${serieId}`"
					class="reader-view__end-btn reader-view__end-btn--back"
				>
					<UIcon
						name="i-lucide-list"
						class="size-4"
					/>
					Chapter list
				</NuxtLink>

				<NuxtLink
					v-if="nextChapter"
					:to="`/read/${serieId}/${nextChapter.id}`"
					class="reader-view__end-btn reader-view__end-btn--primary"
				>
					Next: Ch. {{ nextChapter.chapter_number }}
					<UIcon
						name="i-lucide-chevron-right"
						class="size-4"
					/>
				</NuxtLink>
				<span v-else />
			</div>
		</div>
	</div>
</template>

<style scoped>
.reader-view {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	background: var(--ui-bg);
}

.reader-view__loading,
.reader-view__error,
.reader-view__empty {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.75rem;
	padding: 4rem 2rem;
	color: var(--ui-text-dimmed);
}

.reader-view__spinner {
	width: 2rem;
	height: 2rem;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.reader-view__error-icon {
	width: 2.5rem;
	height: 2.5rem;
	color: var(--ui-error);
}

.reader-view__error-text {
	color: var(--ui-text-muted);
}

.reader-view__error-link {
	color: var(--ui-primary);
	text-decoration: none;
	font-size: var(--font-size-sm);
}

.reader-view__content {
	flex: 1;
	padding: 0.5rem 0;
}

.reader-view__end-nav {
	border-top: 1px solid var(--ui-border);
	padding: 1.5rem 1rem;
	background: var(--ui-bg-elevated);
}

.reader-view__end-nav-inner {
	max-width: 56rem;
	margin: 0 auto;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
}

.reader-view__end-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.5rem 0.875rem;
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	background: var(--ui-bg-elevated);
	color: var(--ui-text-muted);
	font-size: var(--font-size-sm);
	font-weight: 500;
	text-decoration: none;
	transition: all 0.15s ease;
}

.reader-view__end-btn:hover {
	border-color: var(--ui-primary);
	color: var(--ui-text);
}

.reader-view__end-btn--back {
	color: var(--ui-text-dimmed);
}

.reader-view__end-btn--primary {
	background: var(--ui-primary);
	border-color: var(--ui-primary);
	color: oklch(0.98 0 0);
}

.reader-view__end-btn--primary:hover {
	opacity: 0.9;
	color: oklch(0.98 0 0);
}
</style>
