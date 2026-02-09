<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"
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

const page = ref(Number(route.query.page) || 1)

// Sync refs back when route.query changes (browser back/forward)
let syncingFromRoute = false
watch(() => route.query, (query) => {
	syncingFromRoute = true
	filters.value = {
		q: (query.q as string) || undefined,
		type: (query.type as string) || undefined,
		status: (query.status as string) || undefined,
		genre: (query.genre as string) || undefined,
		language: (query.language as Language | undefined) || undefined,
	}
	page.value = Number(query.page) || 1
	nextTick(() => {
		syncingFromRoute = false
	})
})

const { data, isLoading } = useQuery(computed(() =>
	orpc.serie.list.queryOptions({
		input: { page: page.value, ...filters.value },
	}),
))

// Push state → URL when refs change
watch([filters, page], () => {
	const query: Record<string, string> = {}
	if (filters.value.q) query.q = filters.value.q
	if (filters.value.type) query.type = filters.value.type
	if (filters.value.status) query.status = filters.value.status
	if (filters.value.genre) query.genre = filters.value.genre
	if (filters.value.language) query.language = filters.value.language
	if (page.value > 1) query.page = String(page.value)
	navigateTo({ query }, { replace: true })
}, { deep: true })

// Reset page when filters change from user interaction
watch(filters, () => {
	if (!syncingFromRoute) page.value = 1
}, { deep: true })
</script>

<template>
	<div class="browse-page">
		<div class="browse-page__container">
			<div class="browse-page__header">
				<h1 class="browse-page__title">
					Library
				</h1>
				<p class="browse-page__subtitle">
					{{ data?.pagination.total ?? 0 }} series
				</p>
			</div>

			<BrowseFilters v-model="filters" />

			<BrowseGrid
				:series="(data?.data ?? []).filter(Boolean) as any"
				:loading="isLoading"
			/>

			<!-- Pagination -->
			<div
				v-if="data && data.pagination.totalPages > 1"
				class="browse-page__pagination"
			>
				<button
					class="browse-page__page-btn"
					aria-label="Previous page"
					:disabled="page <= 1"
					@click="page--"
				>
					<UIcon
						name="i-lucide-chevron-left"
						class="size-4"
					/>
				</button>

				<span class="browse-page__page-info">
					Page {{ page }} of {{ data.pagination.totalPages }}
				</span>

				<button
					class="browse-page__page-btn"
					aria-label="Next page"
					:disabled="page >= data.pagination.totalPages"
					@click="page++"
				>
					<UIcon
						name="i-lucide-chevron-right"
						class="size-4"
					/>
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
		padding: 2rem;
	}
}

.browse-page__container {
	max-width: 80rem;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.browse-page__header {
	display: flex;
	align-items: baseline;
	gap: 0.75rem;
}

.browse-page__title {
	font-size: var(--font-size-2xl);
	font-weight: 700;
	color: var(--ui-text);
	letter-spacing: -0.02em;
}

.browse-page__subtitle {
	font-size: var(--font-size-sm);
	color: var(--ui-text-dimmed);
}

.browse-page__pagination {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 1rem;
	padding: 1rem 0;
}

.browse-page__page-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.25rem;
	height: 2.25rem;
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	background: var(--ui-bg-elevated);
	color: var(--ui-text);
	cursor: pointer;
	transition: border-color 0.15s ease, background-color 0.15s ease;
}

.browse-page__page-btn:hover:not(:disabled) {
	border-color: var(--ui-primary);
	background: color-mix(in oklch, var(--ui-primary) 8%, transparent);
}

.browse-page__page-btn:disabled {
	opacity: 0.3;
	cursor: default;
}

.browse-page__page-info {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	font-variant-numeric: tabular-nums;
}
</style>
