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

// Fetch serie info for toolbar
const serieQuery = useQuery(computed(() =>
	orpc.serie.get.queryOptions({ input: { id: serieId.value } }),
))

const serieType = computed(() => serieQuery.data.value?.type)

const {
	imagePages,
	loading,
	error,
	prevChapter,
	nextChapter,
	mode,
	isVertical,
	isMobile,
	direction,
	currentPage,
	totalPages,
	currentSpreadPages,
	currentSpreadPageRange,
	nextPage,
	prevPage,
	preloadImages,
	toggleFullscreen,
} = useReader(serieId, chapterId, serieType)

// Find current chapter from chapters list
const chaptersQuery = useQuery(computed(() =>
	orpc.serie.chapters.queryOptions({ input: { serieId: serieId.value } }),
))

const serieInfo = computed(() =>
	serieQuery.data.value ? { title: serieQuery.data.value.title } : null,
)

const chapterInfo = computed(() => {
	const ch = chaptersQuery.data.value?.chapters?.find(c => c.id === chapterId.value)
	return ch ? { chapter_number: ch.chapter_number, title: ch.title } : null
})

// Page counter for toolbar
const pageCounter = computed(() => {
	if (imagePages.value.length === 0) return null
	if (mode.value === "vertical" || mode.value === "paged") {
		return `${currentPage.value + 1} / ${imagePages.value.length}`
	}
	if (mode.value === "double") {
		const { start, end } = currentSpreadPageRange.value
		if (!start) return null
		if (start === end) return `${start} / ${imagePages.value.length}`
		return `${start}-${end} / ${imagePages.value.length}`
	}
	return null
})

// Preload on vertical scroll visibility
function handlePageVisible(pageIndex: number) {
	const pos = imagePages.value.findIndex(p => p.index === pageIndex)
	if (pos !== -1) {
		preloadImages(pos + 1)
	}
}

// Vertical mode: track current page via scroll position
function updateVerticalCurrentPage() {
	if (mode.value !== "vertical") return
	const pages = document.querySelectorAll(".reader-page")
	if (pages.length === 0) return

	const toolbarBottom = 48
	let current = 0
	for (let i = 0; i < pages.length; i++) {
		if ((pages[i] as HTMLElement).getBoundingClientRect().top <= toolbarBottom) {
			current = i
		}
		else {
			break
		}
	}
	currentPage.value = current
}

if (import.meta.client) {
	watch(mode, (m, oldM) => {
		if (m === "vertical") {
			window.addEventListener("scroll", updateVerticalCurrentPage, { passive: true })
			nextTick(updateVerticalCurrentPage)
		}
		else if (oldM === "vertical") {
			window.removeEventListener("scroll", updateVerticalCurrentPage)
		}
	})

	onMounted(() => {
		if (mode.value === "vertical") {
			window.addEventListener("scroll", updateVerticalCurrentPage, { passive: true })
			nextTick(updateVerticalCurrentPage)
		}
	})

	onUnmounted(() => {
		window.removeEventListener("scroll", updateVerticalCurrentPage)
	})
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
			:direction="direction"
			:is-vertical="isVertical"
			:is-mobile="isMobile"
			:page-counter="pageCounter"
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
				v-else-if="mode === 'paged'"
				:pages="imagePages"
				:current-page="currentPage"
				:direction="direction"
				@next="nextPage"
				@prev="prevPage"
			/>

			<!-- Double page mode -->
			<ReaderDouble
				v-else-if="mode === 'double'"
				:spread-pages="currentSpreadPages"
				:current-spread-index="currentPage"
				:total-spreads="totalPages"
				:total-individual-pages="imagePages.length"
				:page-range="currentSpreadPageRange"
				:direction="direction"
				@next="nextPage"
				@prev="prevPage"
			/>
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
</style>
