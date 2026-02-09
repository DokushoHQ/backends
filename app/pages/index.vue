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

const page = ref(Math.max(1, Number(route.query.page) || 1))

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
	page.value = Math.max(1, Number(query.page) || 1)
	nextTick(() => {
		syncingFromRoute.value = false
	})
})

const { data, isLoading } = useQuery(computed(() =>
	orpc.serie.list.queryOptions({
		input: { page: page.value, ...filters.value },
	}),
))

// Push state → URL when refs change
watch([filters, page], () => {
	if (syncingFromRoute.value) return
	const query: Record<string, string> = {}
	if (filters.value.q) query.q = filters.value.q
	if (filters.value.type) query.type = filters.value.type
	if (filters.value.status) query.status = filters.value.status
	if (filters.value.genre) query.genre = filters.value.genre
	if (filters.value.language) query.language = filters.value.language
	if (page.value > 1) query.page = String(page.value)
	navigateTo({ query }, { replace: true })
}, { deep: true })

function setPage(p: number) {
	page.value = p
	if (import.meta.client) {
		window.scrollTo({ top: 0, behavior: "instant" })
	}
}

// Reset page when filters change from user interaction
watch(filters, () => {
	if (!syncingFromRoute.value) page.value = 1
}, { deep: true })
</script>

<template>
	<div class="browse-page">
		<div class="browse-page__container">
			<BrowseFilters v-model="filters" />

			<p
				v-if="data && !isLoading"
				class="browse-page__count"
			>
				{{ data.pagination.total }} series
			</p>

			<BrowseGrid
				:series="data?.data ?? []"
				:loading="isLoading"
			/>

			<UiPagination
				v-if="data"
				:page="page"
				:total-pages="data.pagination.totalPages"
				@update:page="setPage"
			/>
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
</style>
