<script setup lang="ts">
const route = useRoute()
const { isAdmin } = await useAuth()
const { formatRelativeTime } = useFormatters()

const serieId = computed(() => route.params.id as string)

// Fetch serie detail
const { data: serie, pending, error, refresh } = await useFetch(`/api/v1/serie/${serieId.value}`)

// Fetch chapters separately (lazy to avoid blocking navigation)
const { data: chaptersData, status: chaptersStatus, refresh: refreshChapters } = await useLazyFetch(
	`/api/v1/serie/${serieId.value}/chapters`,
	{ query: { includeDisabled: "true" } },
)

// Fetch deletion status
const { data: deletionStatus, refresh: refreshDeletionStatus } = await useFetch(
	`/api/v1/serie/${serieId.value}/deletion-status`,
)

// Computed values
const title = computed(() => serie.value?.title ?? "")
const synopsis = computed(() => serie.value?.synopsis ?? "")
const chapters = computed(() => chaptersData.value?.chapters ?? [])
const enabledChapters = computed(() => chapters.value.filter(c => c.enabled))
const disabledCount = computed(() => chapters.value.length - enabledChapters.value.length)

// Transform chapters for health panel (extract only needed fields)
interface ChapterHealthItem {
	id: string
	chapter_number: number | null
	volume_number: number | null
	title: string | null
	page_fetch_status: string
	source: { name: string }
}

const chaptersForHealth = computed<ChapterHealthItem[]>(() =>
	chapters.value.map((c) => {
		const chapter = c as unknown as {
			id: string
			chapter_number: number | null
			volume_number: number | null
			title: string | null
			page_fetch_status: string
			source: { name: string }
		}
		return {
			id: chapter.id,
			chapter_number: chapter.chapter_number,
			volume_number: chapter.volume_number,
			title: chapter.title,
			page_fetch_status: chapter.page_fetch_status,
			source: { name: chapter.source.name },
		}
	}),
)

// Count chapters that were removed from source but not yet acknowledged
const unacknowledgedRemovedCount = computed(() =>
	chapters.value.filter(c => c.source_removed_at !== null && c.source_removal_acknowledged_at === null).length,
)

// Calculate missing chapters
const missingChapters = computed(() => {
	const chapterNumbers: number[] = []
	for (const c of enabledChapters.value) {
		if (typeof c.chapter_number === "number") {
			chapterNumbers.push(c.chapter_number)
		}
	}
	return calculateMissingChapters(chapterNumbers)
})

// Create combined list with chapters and missing markers
type ChapterData = typeof chapters.value[number]
type ChapterItem
	= | { type: "chapter", data: ChapterData }
		| { type: "missing", chapterNumber: number }

const allItems = computed(() => {
	const items: ChapterItem[] = [
		...chapters.value.map(c => ({ type: "chapter" as const, data: c })),
		...missingChapters.value.map((n: number) => ({ type: "missing" as const, chapterNumber: n })),
	]

	items.sort((a, b) => {
		const aNum = a.type === "chapter" ? (a.data.chapter_number ?? 0) : a.chapterNumber
		const bNum = b.type === "chapter" ? (b.data.chapter_number ?? 0) : b.chapterNumber
		return bNum - aNum
	})

	return items
})

// Health percentage for stat card
const healthPercent = computed(() => {
	if (!serie.value?.chapterHealthCounts) return 100
	const counts = serie.value.chapterHealthCounts
	const total = counts.pending + counts.inProgress + counts.success + counts.partial
		+ counts.failed + counts.permanentlyFailed + counts.incomplete
	if (total === 0) return 100
	return Math.round((counts.success / total) * 100)
})

const healthColor = computed(() => {
	if (healthPercent.value >= 90) return "green"
	if (healthPercent.value >= 50) return "amber"
	return "red"
})

// Dialog states
const metadataEditorOpen = ref(false)
const deleteDialogOpen = ref(false)

// Handle successful actions
async function handleRefresh() {
	await Promise.all([refresh(), refreshChapters(), refreshDeletionStatus()])
}

// Page meta
definePageMeta({
	title: "Series Detail",
})

useHead({
	title: computed(() => title.value ? `${title.value} - Dokusho` : "Series - Dokusho"),
})
</script>

<template>
	<div class="serie-detail-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UDashboardNavbar>
					<template #title>
						<UBreadcrumb
							:items="[
								{ label: 'Series', to: '/series' },
								{ label: title.length > 30 ? `${title.slice(0, 30)}...` : title },
							]"
						/>
					</template>
					<template #right>
						<UiBackButton
							to="/series"
							label="Back to Series"
						/>
					</template>
				</UDashboardNavbar>
			</template>

			<template #body>
				<!-- Loading state -->
				<div
					v-if="pending"
					class="loading-state"
				>
					<UIcon
						name="i-lucide-loader-2"
						class="loading-spinner"
					/>
				</div>

				<!-- Error state -->
				<div
					v-else-if="error"
					class="error-state"
				>
					<div class="error-icon">
						<UIcon
							name="i-lucide-alert-circle"
							class="h-10 w-10"
						/>
					</div>
					<h2>Failed to load series</h2>
					<p>{{ error.message }}</p>
					<button
						class="retry-button"
						@click="refresh()"
					>
						<UIcon
							name="i-lucide-refresh-cw"
							class="h-4 w-4"
						/>
						Try again
					</button>
				</div>

				<!-- Main content -->
				<div
					v-else-if="serie"
					class="serie-content"
				>
					<!-- Deletion banner -->
					<SeriesDeletionBanner
						v-if="deletionStatus?.isDeleted"
						:serie-id="serieId"
						:deleted-at="deletionStatus.deletedAt"
						:scheduled-delete-at="deletionStatus.scheduledDeleteAt"
						:is-admin="isAdmin"
						@restored="handleRefresh"
					/>

					<!-- Hero Section -->
					<SeriesHeroCard
						:title="title"
						:synopsis="synopsis"
						:cover="serie.cover"
						:type="serie.type"
						:status="serie.status"
						:authors="serie.authors"
						:artists="serie.artists"
					>
						<template
							v-if="isAdmin && !deletionStatus?.isDeleted"
							#actions
						>
							<SeriesRefreshMetadataButton
								:serie-id="serieId"
								@refreshed="handleRefresh"
							/>
							<SeriesMetadataEditor
								v-model:open="metadataEditorOpen"
								:serie="serie"
								@updated="handleRefresh"
							/>
							<SeriesDeleteButton
								v-model:open="deleteDialogOpen"
								:serie-id="serieId"
								:serie-title="title"
								@deleted="handleRefresh"
							/>
							<ChaptersRetryFailedButton
								scope="serie"
								:serie-id="serieId"
								@retried="() => refreshChapters()"
							/>
						</template>
					</SeriesHeroCard>

					<!-- Health warnings banner (admin only) -->
					<SeriesHealthBanner
						v-if="isAdmin"
						:has-cover="!!serie.cover"
						:sources="serie.sources"
						:unacknowledged-removed-count="unacknowledgedRemovedCount"
						@refresh-cover="handleRefresh"
					/>

					<!-- Stat Cards -->
					<UiStatCardGrid :cols="isAdmin ? 4 : 3">
						<UiStatCard
							:value="enabledChapters.length.toLocaleString()"
							label="Chapters"
							icon="i-lucide-layers"
							color="blue"
						/>
						<UiStatCard
							:value="serie.sources?.length ?? 0"
							label="Sources"
							icon="i-lucide-server"
							color="green"
						/>
						<UiStatCard
							v-if="isAdmin"
							:value="`${healthPercent}%`"
							label="Data Health"
							icon="i-lucide-heart-pulse"
							:color="healthColor"
						/>
						<UiStatCard
							:value="formatRelativeTime(serie.updated_at)"
							label="Last Updated"
							icon="i-lucide-calendar"
							color="gray"
						/>
					</UiStatCardGrid>

					<!-- Chapter health panel (admin only) -->
					<SeriesChapterHealthPanel
						v-if="isAdmin && serie.chapterHealthCounts"
						:serie-id="serieId"
						:health-counts="serie.chapterHealthCounts"
						:chapters="chaptersForHealth"
						@retried="refreshChapters"
					/>

					<!-- Info Cards Grid -->
					<div class="cards-grid">
						<SeriesDetailsCard
							:type="serie.type"
							:status="serie.status"
							:authors="serie.authors"
							:artists="serie.artists"
							:genres="serie.genres"
							:updated-at="serie.updated_at"
							:created-at="serie.created_at"
						/>
						<SeriesSourcesCard :sources="serie.sources" />
					</div>

					<!-- Chapters Card -->
					<SeriesChaptersCard
						:items="allItems"
						:is-admin="isAdmin"
						:serie-id="serieId"
						:enabled-count="enabledChapters.length"
						:disabled-count="disabledCount"
						:missing-count="missingChapters.length"
						:loading="chaptersStatus === 'pending'"
						@chapters-deleted="refreshChapters"
						@chapters-acknowledged="refreshChapters"
					/>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
/* Main content layout */
.serie-content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

/* Cards Grid */
.cards-grid {
	display: grid;
	gap: 1rem;
	grid-template-columns: 1fr;
}

@media (min-width: 768px) {
	.cards-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}

/* Loading state */
.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
}

.loading-spinner {
	width: 2rem;
	height: 2rem;
	color: var(--ui-text-muted);
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Error state */
.error-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	text-align: center;
}

.error-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 4.5rem;
	height: 4.5rem;
	margin-bottom: 1.5rem;
	border-radius: 50%;
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

.error-state h2 {
	font-size: var(--font-size-xl);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0 0 0.5rem 0;
}

.error-state p {
	font-size: var(--font-size-base);
	color: var(--ui-text-muted);
	max-width: 24rem;
	margin: 0 0 1.5rem 0;
}

.retry-button {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.625rem 1rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.retry-button:hover {
	background: var(--ui-border);
}
</style>
