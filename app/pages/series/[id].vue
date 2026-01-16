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

	// Sort by chapter_number DESC
	items.sort((a, b) => {
		const aNum = a.type === "chapter" ? (a.data.chapter_number ?? 0) : a.chapterNumber
		const bNum = b.type === "chapter" ? (b.data.chapter_number ?? 0) : b.chapterNumber
		return bNum - aNum
	})

	return items
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
	<UDashboardPanel>
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
					<div class="flex items-center gap-1.5 sm:gap-2">
						<template v-if="isAdmin && !deletionStatus?.isDeleted">
							<SeriesRefreshMetadataButton
								:serie-id="serieId"
								@refreshed="handleRefresh"
							/>
							<SeriesMetadataEditor
								v-if="serie"
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
						<UButton
							variant="outline"
							size="sm"
							to="/series"
							class="shrink-0"
						>
							<UIcon
								name="i-lucide-arrow-left"
								class="h-4 w-4 sm:mr-2"
							/>
							<span class="hidden sm:inline">Back to Series</span>
						</UButton>
					</div>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<!-- Loading state -->
			<div
				v-if="pending"
				class="flex items-center justify-center py-12"
			>
				<UIcon
					name="i-lucide-loader-2"
					class="h-8 w-8 animate-spin text-muted-foreground"
				/>
			</div>

			<!-- Error state -->
			<div
				v-else-if="error"
				class="flex flex-col items-center justify-center py-12 text-center"
			>
				<UIcon
					name="i-lucide-alert-circle"
					class="h-12 w-12 text-destructive mb-4"
				/>
				<h3 class="text-lg font-semibold">
					Failed to load series
				</h3>
				<p class="text-muted-foreground mt-1">
					{{ error.message }}
				</p>
				<UButton
					variant="outline"
					class="mt-4"
					@click="refresh()"
				>
					Try again
				</UButton>
			</div>

			<!-- Main content -->
			<template v-else-if="serie">
				<!-- Deletion banner -->
				<SeriesDeletionBanner
					v-if="deletionStatus?.isDeleted"
					:serie-id="serieId"
					:deleted-at="deletionStatus.deletedAt"
					:scheduled-delete-at="deletionStatus.scheduledDeleteAt"
					:is-admin="isAdmin"
					class="mb-6"
					@restored="handleRefresh"
				/>

				<!-- Health warnings banner (admin only) -->
				<SeriesHealthBanner
					v-if="isAdmin"
					:has-cover="!!serie.cover"
					:sources="serie.sources"
					:unacknowledged-removed-count="unacknowledgedRemovedCount"
					class="mb-6"
					@refresh-cover="handleRefresh"
				/>

				<div class="grid gap-6 lg:grid-cols-[300px_1fr] items-start">
					<!-- Cover and metadata sidebar -->
					<div class="space-y-4">
						<UCard class="overflow-hidden p-0 gap-0 border-0">
							<NuxtImg
								v-if="serie.cover"
								:src="serie.cover"
								:alt="title"
								class="w-full aspect-2/3 object-cover"
							/>
							<div
								v-else
								class="w-full aspect-2/3 bg-muted flex items-center justify-center"
							>
								<UIcon
									name="i-lucide-book-open"
									class="h-16 w-16 text-muted-foreground/50"
								/>
							</div>
						</UCard>

						<UCard>
							<div class="space-y-4">
								<div class="flex flex-wrap gap-2">
									<UBadge>{{ serie.type }}</UBadge>
									<UBadge
										v-for="s in serie.status"
										:key="s"
										variant="subtle"
									>
										{{ s }}
									</UBadge>
								</div>

								<USeparator />

								<div class="space-y-3 text-sm">
									<!-- Sources -->
									<div
										v-if="serie.sources?.length > 0"
										class="flex items-start gap-2"
									>
										<UIcon
											name="i-lucide-external-link"
											class="h-4 w-4 mt-0.5 text-muted-foreground"
										/>
										<div class="flex-1">
											<p class="text-muted-foreground">
												{{ serie.sources.length === 1 ? "Source" : "Sources" }}
											</p>
											<div class="space-y-1">
												<a
													v-for="s in serie.sources"
													:key="s.id"
													:href="s.external_url ?? '#'"
													target="_blank"
													rel="noopener noreferrer"
													class="font-medium hover:underline inline-flex items-center gap-1 mr-2"
												>
													{{ s.source.name }}
													<UBadge
														v-if="s.is_primary"
														variant="subtle"
														size="xs"
														class="px-1 py-0 h-4"
													>
														Primary
													</UBadge>
													<UIcon
														name="i-lucide-square-arrow-out-up-right"
														class="h-3 w-3"
													/>
												</a>
											</div>
										</div>
									</div>

									<!-- Authors -->
									<div
										v-if="serie.authors?.length > 0"
										class="flex items-start gap-2"
									>
										<UIcon
											name="i-lucide-user"
											class="h-4 w-4 mt-0.5 text-muted-foreground"
										/>
										<div>
											<p class="text-muted-foreground">
												Author
											</p>
											<p class="font-medium">
												{{ serie.authors.map((a: { name: string }) => a.name).join(", ") }}
											</p>
										</div>
									</div>

									<!-- Artists -->
									<div
										v-if="serie.artists?.length > 0"
										class="flex items-start gap-2"
									>
										<UIcon
											name="i-lucide-pen"
											class="h-4 w-4 mt-0.5 text-muted-foreground"
										/>
										<div>
											<p class="text-muted-foreground">
												Artist
											</p>
											<p class="font-medium">
												{{ serie.artists.map((a: { name: string }) => a.name).join(", ") }}
											</p>
										</div>
									</div>

									<!-- Updated -->
									<div class="flex items-start gap-2">
										<UIcon
											name="i-lucide-calendar"
											class="h-4 w-4 mt-0.5 text-muted-foreground"
										/>
										<div>
											<p class="text-muted-foreground">
												Updated
											</p>
											<p class="font-medium">
												{{ formatRelativeTime(serie.updated_at) }}
											</p>
										</div>
									</div>
								</div>

								<!-- Genres -->
								<template v-if="serie.genres?.length > 0">
									<USeparator />
									<div>
										<p class="text-sm text-muted-foreground mb-2">
											Genres
										</p>
										<div class="flex flex-wrap gap-1.5">
											<UBadge
												v-for="g in serie.genres"
												:key="g.id"
												variant="outline"
											>
												{{ g.title }}
											</UBadge>
										</div>
									</div>
								</template>
							</div>
						</UCard>
					</div>

					<!-- Main content -->
					<div class="space-y-6 min-w-0">
						<!-- Title and Synopsis -->
						<UCard>
							<template #header>
								<h2 class="text-xl font-semibold">
									{{ title }}
								</h2>
							</template>
							<div
								v-if="synopsis"
								class="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
							>
								{{ synopsis }}
							</div>
						</UCard>

						<!-- Chapters -->
						<UCard :ui="{ body: 'p-0' }">
							<template #header>
								<div class="flex items-center justify-between">
									<div>
										<h3 class="text-lg font-semibold">
											Chapters
										</h3>
										<p class="text-sm text-muted-foreground">
											<template v-if="chaptersStatus === 'pending'">
												Loading chapters...
											</template>
											<template v-else>
												{{ enabledChapters.length }} chapters available
												<span
													v-if="disabledCount > 0"
													class="text-muted-foreground ml-2"
												>
													({{ disabledCount }} disabled)
												</span>
												<span
													v-if="missingChapters.length > 0"
													class="text-orange-500 ml-2"
												>
													({{ missingChapters.length }} missing)
												</span>
											</template>
										</p>
									</div>
								</div>
							</template>
							<div
								v-if="chaptersStatus === 'pending'"
								class="flex items-center justify-center py-12"
							>
								<UIcon
									name="i-lucide-loader-2"
									class="h-6 w-6 animate-spin text-muted-foreground"
								/>
							</div>
							<SeriesChapterTable
								v-else
								:items="allItems"
								:is-admin="isAdmin"
								:serie-id="serieId"
								@chapters-deleted="refreshChapters"
								@chapters-acknowledged="refreshChapters"
							/>
						</UCard>
					</div>
				</div>
			</template>
		</template>
	</UDashboardPanel>
</template>
