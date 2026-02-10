<script setup lang="ts">
import { useInfiniteQuery } from "@tanstack/vue-query"
import type { Language } from "~~/prisma/generated/enums"

definePageMeta({
	layout: "reader",
})

const orpc = useOrpc()
const route = useRoute()

const filters = ref({
	q: (route.query.q as string) || undefined,
	type: (route.query.type as string) || undefined,
	status: (route.query.status as string) || undefined,
	genre: (route.query.genre as string) || undefined,
	language: (route.query.language as Language | undefined) || undefined,
})

// Sync refs back when route.query changes (browser back/forward)
const syncingFromRoute = ref(false)
watch(() => route.query, (query) => {
	syncingFromRoute.value = true
	filters.value = {
		q: (query.q as string) || undefined,
		type: (query.type as string) || undefined,
		status: (query.status as string) || undefined,
		genre: (query.genre as string) || undefined,
		language: (query.language as Language | undefined) || undefined,
	}
	nextTick(() => {
		syncingFromRoute.value = false
	})
})

const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(computed(() =>
	orpc.serie.list.infiniteOptions({
		input: (pageParam: number) => ({ page: pageParam, ...filters.value }),
		initialPageParam: 1,
		getNextPageParam: (lastPage: { pagination: { page: number, totalPages: number } }) =>
			lastPage.pagination.page < lastPage.pagination.totalPages
				? lastPage.pagination.page + 1
				: undefined,
	}),
))

const allSeries = computed(() => data.value?.pages.flatMap(p => p.data) ?? [])
const totalCount = computed(() => data.value?.pages[0]?.pagination.total ?? 0)

// Push state → URL when filters change
watch(filters, () => {
	if (syncingFromRoute.value) return
	const query: Record<string, string> = {}
	if (filters.value.q) query.q = filters.value.q
	if (filters.value.type) query.type = filters.value.type
	if (filters.value.status) query.status = filters.value.status
	if (filters.value.genre) query.genre = filters.value.genre
	if (filters.value.language) query.language = filters.value.language
	navigateTo({ query }, { replace: true })
}, { deep: true })

// Infinite scroll sentinel
const sentinelRef = ref<HTMLElement | null>(null)

onMounted(() => {
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries[0]?.isIntersecting && hasNextPage.value && !isFetchingNextPage.value && !isError.value) {
				fetchNextPage()
			}
		},
		{ rootMargin: "200px" },
	)

	watch(sentinelRef, (el, _, onCleanup) => {
		if (el) observer.observe(el)
		onCleanup(() => {
			if (el) observer.unobserve(el)
		})
	}, { immediate: true })

	onUnmounted(() => observer.disconnect())
})
</script>

<template>
	<div class="browse-page">
		<div class="browse-page__container">
			<BrowseFilters v-model="filters" />

			<p
				v-if="data && !isLoading"
				class="browse-page__count"
			>
				{{ totalCount }} series
			</p>

			<BrowseGrid
				:series="allSeries"
				:loading="isLoading"
			/>

			<!-- Sentinel for infinite scroll -->
			<div
				v-if="(hasNextPage || isFetchingNextPage) && !isError"
				ref="sentinelRef"
				class="scroll-sentinel"
			>
				<div
					v-if="isFetchingNextPage"
					class="loading-more"
				>
					<UIcon
						name="i-lucide-loader-2"
						class="loading-spinner"
					/>
				</div>
			</div>

			<!-- Error retry for failed page loads -->
			<div
				v-if="isError && allSeries.length > 0"
				class="next-page-error"
			>
				<span>Failed to load more series</span>
				<button
					class="retry-btn"
					@click="fetchNextPage()"
				>
					<UIcon
						name="i-lucide-refresh-cw"
						class="retry-icon"
					/>
					Retry
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.browse-page {
	flex: 1;
	padding: 1.5rem 1rem;
}

@media (min-width: 640px) {
	.browse-page {
		padding: 2rem 1.5rem;
	}
}

@media (min-width: 1280px) {
	.browse-page {
		padding: 2rem 2.5rem;
	}
}

.browse-page__container {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

.browse-page__count {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	margin: -0.5rem 0;
}

.scroll-sentinel {
	height: 1px;
}

.loading-more {
	display: flex;
	justify-content: center;
	padding: 2rem 0;
}

.loading-spinner {
	width: 1.5rem;
	height: 1.5rem;
	color: var(--ui-primary);
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.next-page-error {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.75rem;
	padding: 1rem;
	margin-top: 0.5rem;
	font-size: var(--font-size-sm);
	color: var(--ui-error);
	background: var(--ui-error-soft);
	border-radius: 0.5rem;
}

.retry-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem 0.75rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.375rem;
	cursor: pointer;
	transition: background 0.15s ease;
}

.retry-btn:hover {
	background: var(--ui-bg-muted);
}

.retry-icon {
	width: 0.875rem;
	height: 0.875rem;
}
</style>
