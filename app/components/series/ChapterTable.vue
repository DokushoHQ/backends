<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui"
import type { PageFetchStatus, UIChapter, UIChapterItem } from "#shared/ui/type/chapter"

const { formatRelativeTime } = useFormatters()

// Status badge config
function getStatusBadge(status: PageFetchStatus) {
	switch (status) {
		case "Success":
			return { label: "Success", color: "success" as const, icon: "i-lucide-check" }
		case "Pending":
			return { label: "Pending", color: "warning" as const, icon: "i-lucide-clock" }
		case "InProgress":
			return { label: "In Progress", color: "info" as const, icon: "i-lucide-loader-2" }
		case "Partial":
			return { label: "Partial", color: "warning" as const, icon: "i-lucide-alert-triangle" }
		case "Failed":
			return { label: "Failed", color: "error" as const, icon: "i-lucide-x-circle" }
	}
}

const props = defineProps<{
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	items: Array<{ type: "chapter", data: any } | { type: "missing", chapterNumber: number }>
	isAdmin: boolean
	serieId: string
}>()

const emit = defineEmits<{
	chaptersDeleted: []
	chaptersAcknowledged: []
}>()

const selectedIds = ref<Set<string>>(new Set())
const optimisticEnabled = ref<Map<string, boolean>>(new Map())
const isPending = ref(false)
const isDeleting = ref(false)
const isAcknowledging = ref(false)
const deleteDialogOpen = ref(false)

// Viewer state
const viewerOpen = ref(false)
const viewerChapter = ref<UIChapter | null>(null)

// Filters
const sourceFilter = ref("all")
const groupFilter = ref("all")
const languageFilter = ref("all")
const statusFilter = ref("all")
const sourceAvailabilityFilter = ref("all")

// Extract chapters only
const chapters = computed(() =>
	props.items.filter((item): item is { type: "chapter", data: UIChapter } => item.type === "chapter"),
)

// Extract unique values for filters
const filterOptions = computed(() => {
	const sources = new Map<string, string>()
	const groups = new Map<string, string>()
	const languages = new Set<string>()

	for (const { data: chapter } of chapters.value) {
		sources.set(chapter.source.external_id, chapter.source.name)
		for (const group of chapter.groups) {
			groups.set(group.id, group.name)
		}
		languages.add(chapter.language)
	}

	return {
		sources: Array.from(sources.entries()).sort((a, b) => a[1].localeCompare(b[1])),
		groups: Array.from(groups.entries()).sort((a, b) => a[1].localeCompare(b[1])),
		languages: Array.from(languages).sort(),
	}
})

// Helper to determine chapter source availability status
function getSourceAvailabilityStatus(chapter: UIChapter): "available" | "removed-unacknowledged" | "removed-acknowledged" {
	if (!chapter.source_removed_at) {
		return "available"
	}
	return chapter.source_removal_acknowledged_at ? "removed-acknowledged" : "removed-unacknowledged"
}

// Filter items
const filteredItems = computed(() => {
	return props.items.filter((item) => {
		if (item.type === "missing") {
			// Show missing chapters only if no filters are active
			return sourceFilter.value === "all" && groupFilter.value === "all" && languageFilter.value === "all" && statusFilter.value === "all" && sourceAvailabilityFilter.value === "all"
		}

		const chapter = item.data

		if (sourceFilter.value !== "all" && chapter.source.external_id !== sourceFilter.value) {
			return false
		}

		if (groupFilter.value === "none" && chapter.groups.length > 0) {
			return false
		}
		if (groupFilter.value !== "all" && groupFilter.value !== "none" && !chapter.groups.some((g: { id: string }) => g.id === groupFilter.value)) {
			return false
		}

		if (languageFilter.value !== "all" && chapter.language !== languageFilter.value) {
			return false
		}

		if (statusFilter.value !== "all" && chapter.page_fetch_status !== statusFilter.value) {
			return false
		}

		if (sourceAvailabilityFilter.value !== "all" && getSourceAvailabilityStatus(chapter) !== sourceAvailabilityFilter.value) {
			return false
		}

		return true
	})
})

const filteredChapters = computed(() =>
	filteredItems.value.filter(
		(item): item is { type: "chapter", data: UIChapter } => item.type === "chapter",
	),
)

const filteredChapterIds = computed(() => filteredChapters.value.map(c => c.data.id))

const allSelected = computed(() =>
	selectedIds.value.size > 0 && filteredChapterIds.value.every(id => selectedIds.value.has(id)),
)

const someSelected = computed(() =>
	selectedIds.value.size > 0 && filteredChapterIds.value.some(id => selectedIds.value.has(id)) && !allSelected.value,
)

const hasActiveFilters = computed(() =>
	sourceFilter.value !== "all" || groupFilter.value !== "all" || languageFilter.value !== "all" || statusFilter.value !== "all" || sourceAvailabilityFilter.value !== "all",
)

// Selected chapters that can be deleted (have source_removed_at set)
const selectedDeletableChapters = computed(() => {
	const deletable: string[] = []
	for (const { data: chapter } of chapters.value) {
		if (selectedIds.value.has(chapter.id) && chapter.source_removed_at !== null) {
			deletable.push(chapter.id)
		}
	}
	return deletable
})

// Count of selected chapters that are NOT deletable
const nonDeletableSelectedCount = computed(() => {
	return selectedIds.value.size - selectedDeletableChapters.value.length
})

// Selected chapters that can be acknowledged (removed but not yet acknowledged)
const selectedAcknowledgeableChapters = computed(() => {
	const acknowledgeable: string[] = []
	for (const { data: chapter } of chapters.value) {
		if (selectedIds.value.has(chapter.id) && chapter.source_removed_at !== null && chapter.source_removal_acknowledged_at === null) {
			acknowledgeable.push(chapter.id)
		}
	}
	return acknowledgeable
})

function clearFilters() {
	sourceFilter.value = "all"
	groupFilter.value = "all"
	languageFilter.value = "all"
	statusFilter.value = "all"
	sourceAvailabilityFilter.value = "all"
}

function toggleSelectAll() {
	if (allSelected.value) {
		// Deselect all filtered chapters
		const next = new Set(selectedIds.value)
		for (const id of filteredChapterIds.value) {
			next.delete(id)
		}
		selectedIds.value = next
	}
	else {
		// Select all filtered chapters
		selectedIds.value = new Set([...selectedIds.value, ...filteredChapterIds.value])
	}
}

function toggleSelect(id: string) {
	const next = new Set(selectedIds.value)
	if (next.has(id)) {
		next.delete(id)
	}
	else {
		next.add(id)
	}
	selectedIds.value = next
}

async function handleToggleEnabled(chapterId: string, currentEnabled: boolean) {
	const newEnabled = !currentEnabled
	optimisticEnabled.value = new Map(optimisticEnabled.value).set(chapterId, newEnabled)

	try {
		await $fetch(`/api/v1/serie/${props.serieId}/chapters/toggle`, {
			method: "POST",
			body: {
				chapterIds: [chapterId],
				enabled: newEnabled,
			},
		})
	}
	catch {
		const next = new Map(optimisticEnabled.value)
		next.delete(chapterId)
		optimisticEnabled.value = next
	}
}

async function handleBulkToggle(enabled: boolean) {
	const ids = Array.from(selectedIds.value)
	const next = new Map(optimisticEnabled.value)
	for (const id of ids) {
		next.set(id, enabled)
	}
	optimisticEnabled.value = next
	isPending.value = true

	try {
		await $fetch(`/api/v1/serie/${props.serieId}/chapters/toggle`, {
			method: "POST",
			body: {
				chapterIds: ids,
				enabled,
			},
		})
		selectedIds.value = new Set()
	}
	catch {
		const revert = new Map(optimisticEnabled.value)
		for (const id of ids) {
			revert.delete(id)
		}
		optimisticEnabled.value = revert
	}
	finally {
		isPending.value = false
	}
}

async function handleBulkDelete() {
	const ids = selectedDeletableChapters.value
	if (ids.length === 0) return

	isDeleting.value = true

	try {
		await $fetch(`/api/v1/serie/${props.serieId}/chapters/delete`, {
			method: "POST",
			body: { chapterIds: ids },
		})
		selectedIds.value = new Set()
		deleteDialogOpen.value = false
		emit("chaptersDeleted")
	}
	catch (e) {
		console.error("Failed to delete chapters:", e)
	}
	finally {
		isDeleting.value = false
	}
}

async function handleBulkAcknowledge() {
	const ids = selectedAcknowledgeableChapters.value
	if (ids.length === 0) return

	isAcknowledging.value = true

	try {
		await $fetch(`/api/v1/serie/${props.serieId}/chapters/acknowledge`, {
			method: "POST",
			body: { chapterIds: ids },
		})
		selectedIds.value = new Set()
		emit("chaptersAcknowledged")
	}
	catch (e) {
		console.error("Failed to acknowledge chapters:", e)
	}
	finally {
		isAcknowledging.value = false
	}
}

function getEnabled(chapter: UIChapter) {
	return optimisticEnabled.value.has(chapter.id)
		? (optimisticEnabled.value.get(chapter.id) ?? chapter.enabled)
		: chapter.enabled
}

function openViewer(chapter: UIChapter) {
	viewerChapter.value = chapter
	viewerOpen.value = true
}

function handleRowSelect(_event: Event, row: { original: UIChapterItem }) {
	if (row.original.type === "chapter") {
		openViewer(row.original.data)
	}
}

// Source filter items
const sourceFilterItems = computed(() => [
	{ label: "All Sources", value: "all" },
	...filterOptions.value.sources.map(([id, name]) => ({ label: name, value: id })),
])

// Group filter items
const groupFilterItems = computed(() => [
	{ label: "All Groups", value: "all" },
	{ label: "No Group", value: "none" },
	...filterOptions.value.groups.map(([id, name]) => ({ label: name, value: id })),
])

// Language filter items
const languageFilterItems = computed(() => [
	{ label: "All", value: "all" },
	...filterOptions.value.languages.map(lang => ({ label: lang, value: lang })),
])

// Status filter items (admin only)
const statusFilterItems = [
	{ label: "All Status", value: "all" },
	{ label: "Success", value: "Success" },
	{ label: "Pending", value: "Pending" },
	{ label: "In Progress", value: "InProgress" },
	{ label: "Partial", value: "Partial" },
	{ label: "Failed", value: "Failed" },
]

// Source availability filter items (admin only)
const sourceAvailabilityFilterItems = [
	{ label: "All", value: "all" },
	{ label: "Available", value: "available" },
	{ label: "Removed (Unack.)", value: "removed-unacknowledged" },
	{ label: "Removed (Ack.)", value: "removed-acknowledged" },
]

// Table columns
const columns = computed<TableColumn<UIChapterItem>[]>(() => {
	const cols: TableColumn<UIChapterItem>[] = []

	if (props.isAdmin) {
		cols.push({
			id: "select",
			header: () =>
				h(resolveComponent("UCheckbox"), {
					"modelValue": allSelected.value,
					"indeterminate": someSelected.value,
					"onUpdate:modelValue": toggleSelectAll,
				}),
			cell: ({ row }) => {
				if (row.original.type === "missing") return null
				const chapter = (row.original as { type: "chapter", data: UIChapter }).data
				return h(resolveComponent("UCheckbox"), {
					"modelValue": selectedIds.value.has(chapter.id),
					"onUpdate:modelValue": () => toggleSelect(chapter.id),
					"onClick": (e: Event) => e.stopPropagation(),
				})
			},
		})
	}

	cols.push(
		{
			id: "chapter",
			header: "Chapter",
			cell: ({ row }) => {
				if (row.original.type === "missing") {
					return h("span", { class: "flex items-center gap-2 font-medium text-orange-500" }, [
						h(resolveComponent("UIcon"), { name: "i-lucide-alert-triangle", class: "h-3 w-3" }),
						`Ch. ${row.original.chapterNumber}`,
					])
				}
				const chapter = (row.original as { type: "chapter", data: UIChapter }).data
				// Only show strike-through for unacknowledged removed chapters
				const isUnacknowledgedRemoved = !!chapter.source_removed_at && !chapter.source_removal_acknowledged_at
				const isAcknowledgedRemoved = !!chapter.source_removed_at && !!chapter.source_removal_acknowledged_at
				const baseClass = isUnacknowledgedRemoved ? "font-medium opacity-50 line-through" : "font-medium"
				return h("span", { class: `flex items-center gap-1.5 ${baseClass}` }, [
					chapter.volume_number !== null
						? h("span", { class: "text-muted-foreground mr-1" }, `Vol. ${chapter.volume_number}`)
						: null,
					`Ch. ${chapter.chapter_number}`,
					// Show cloud-off icon for acknowledged removed chapters
					isAcknowledgedRemoved
						? h(resolveComponent("UIcon"), {
								name: "i-lucide-cloud-off",
								class: "h-3 w-3 text-muted-foreground",
								title: "Removed from source (acknowledged)",
							})
						: null,
				])
			},
		},
		{
			id: "title",
			header: "Title",
			cell: ({ row }) => {
				if (row.original.type === "missing") {
					return h("span", { class: "text-orange-500/70 italic text-sm" }, "Missing chapter")
				}
				const chapter = (row.original as { type: "chapter", data: UIChapter }).data
				// Only show strike-through for unacknowledged removed chapters
				const isUnacknowledgedRemoved = !!chapter.source_removed_at && !chapter.source_removal_acknowledged_at
				const baseClass = isUnacknowledgedRemoved ? "text-muted-foreground opacity-50 line-through" : "text-muted-foreground"
				return h("span", { class: baseClass }, chapter.title || "No title")
			},
		},
		{
			id: "source",
			header: "Source",
			cell: ({ row }) => {
				if (row.original.type === "missing") return null
				const chapter = (row.original as { type: "chapter", data: UIChapter }).data
				return h(resolveComponent("UBadge"), { variant: "subtle" }, () => chapter.source.name)
			},
		},
		{
			id: "groups",
			header: "Groups",
			cell: ({ row }) => {
				if (row.original.type === "missing") return null
				const chapter = (row.original as { type: "chapter", data: UIChapter }).data
				const groups = chapter.groups
				if (!groups?.length) {
					return h("span", { class: "text-muted-foreground/50 italic" }, "-")
				}
				return h(
					"div",
					{ class: "flex flex-wrap gap-1", onClick: (e: Event) => e.stopPropagation() },
					groups.map(group =>
						h(resolveComponent("UBadge"), { key: group.id, variant: "outline" }, () =>
							group.url
								? h(
										"a",
										{
											href: group.url,
											target: "_blank",
											rel: "noopener noreferrer",
											class: "hover:underline",
										},
										group.name,
									)
								: group.name,
						),
					),
				)
			},
		},
		{
			id: "language",
			header: "Language",
			cell: ({ row }) => {
				if (row.original.type === "missing") return null
				const chapter = (row.original as { type: "chapter", data: UIChapter }).data
				return h(resolveComponent("UBadge"), { variant: "outline" }, () => chapter.language)
			},
		},
		{
			id: "uploaded",
			header: "Uploaded",
			cell: ({ row }) => {
				if (row.original.type === "missing") return null
				const chapter = (row.original as { type: "chapter", data: UIChapter }).data
				return h(
					"span",
					{ class: "text-sm text-muted-foreground" },
					formatRelativeTime(chapter.date_upload),
				)
			},
		},
	)

	if (props.isAdmin) {
		cols.push({
			id: "status",
			header: "Status",
			cell: ({ row }) => {
				if (row.original.type === "missing") return null
				const chapter = (row.original as { type: "chapter", data: UIChapter }).data
				const badge = getStatusBadge(chapter.page_fetch_status)
				return h(resolveComponent("UBadge"), {
					color: badge.color,
					variant: "subtle",
					class: "gap-1",
				}, () => [
					h(resolveComponent("UIcon"), { name: badge.icon, class: "h-3 w-3" }),
					badge.label,
				])
			},
		})
	}

	if (props.isAdmin) {
		cols.push({
			id: "enabled",
			header: "Enabled",
			cell: ({ row }) => {
				if (row.original.type === "missing") return null
				const chapter = row.original.data
				return h(resolveComponent("USwitch"), {
					"modelValue": getEnabled(chapter),
					"disabled": isPending.value,
					"onUpdate:modelValue": () => handleToggleEnabled(chapter.id, getEnabled(chapter)),
					"onClick": (e: Event) => e.stopPropagation(),
				})
			},
		})
	}

	return cols
})
</script>

<template>
	<div class="flex flex-col">
		<!-- Filters -->
		<div class="flex items-center gap-2 px-4 py-2 border-b flex-wrap">
			<USelectMenu
				v-model="sourceFilter"
				:items="sourceFilterItems"
				value-key="value"
				class="w-35"
				size="sm"
			/>

			<USelectMenu
				v-model="groupFilter"
				:items="groupFilterItems"
				value-key="value"
				class="w-35"
				size="sm"
			/>

			<USelectMenu
				v-model="languageFilter"
				:items="languageFilterItems"
				value-key="value"
				class="w-35"
				size="sm"
			/>

			<USelectMenu
				v-if="isAdmin"
				v-model="statusFilter"
				:items="statusFilterItems"
				value-key="value"
				class="w-35"
				size="sm"
			/>

			<USelectMenu
				v-if="isAdmin"
				v-model="sourceAvailabilityFilter"
				:items="sourceAvailabilityFilterItems"
				value-key="value"
				class="w-40"
				size="sm"
			/>

			<UButton
				v-if="hasActiveFilters"
				variant="ghost"
				size="sm"
				@click="clearFilters"
			>
				<UIcon
					name="i-lucide-x"
					class="h-3 w-3 mr-1"
				/>
				Clear
			</UButton>

			<span class="text-xs text-muted-foreground ml-auto">
				{{ filteredChapters.length }} of {{ chapters.length }} chapters
			</span>
		</div>

		<!-- Bulk actions -->
		<div
			v-if="isAdmin && selectedIds.size > 0"
			class="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b"
		>
			<span class="text-sm text-muted-foreground">{{ selectedIds.size }} selected</span>
			<UButton
				size="sm"
				variant="outline"
				:disabled="isPending"
				@click="handleBulkToggle(true)"
			>
				Enable
			</UButton>
			<UButton
				size="sm"
				variant="outline"
				:disabled="isPending || isDeleting"
				@click="handleBulkToggle(false)"
			>
				Disable
			</UButton>
			<UButton
				size="sm"
				variant="outline"
				color="error"
				:disabled="isPending || isDeleting || selectedDeletableChapters.length === 0"
				@click="deleteDialogOpen = true"
			>
				<UIcon
					name="i-lucide-trash-2"
					class="h-3 w-3 mr-1"
				/>
				Delete ({{ selectedDeletableChapters.length }})
			</UButton>
			<UButton
				size="sm"
				variant="outline"
				:disabled="isPending || isDeleting || isAcknowledging || selectedAcknowledgeableChapters.length === 0"
				:loading="isAcknowledging"
				@click="handleBulkAcknowledge"
			>
				<UIcon
					name="i-lucide-check-circle"
					class="h-3 w-3 mr-1"
				/>
				Acknowledge ({{ selectedAcknowledgeableChapters.length }})
			</UButton>
			<UButton
				size="sm"
				variant="ghost"
				:disabled="isPending || isDeleting || isAcknowledging"
				@click="selectedIds = new Set()"
			>
				Clear
			</UButton>
		</div>

		<!-- Table -->
		<div class="max-h-[60vh] overflow-auto">
			<UTable
				:data="filteredItems"
				:columns="columns"
				sticky
				:ui="{
					root: 'min-w-full',
					thead: 'bg-card',
					tr: 'hover:bg-muted/50 transition-colors cursor-pointer data-[selected=true]:bg-muted',
					td: 'px-4 py-3',
					th: 'px-4 py-3 text-left font-medium bg-card',
				}"
				@select="handleRowSelect"
			/>
		</div>

		<SeriesChapterViewer
			v-model:open="viewerOpen"
			:chapter="viewerChapter"
			:serie-id="serieId"
		/>

		<!-- Delete Confirmation Modal -->
		<UModal v-model:open="deleteDialogOpen">
			<template #content>
				<UCard>
					<template #header>
						<h3 class="text-lg font-semibold">
							Delete Chapters
						</h3>
					</template>

					<div class="space-y-3">
						<p class="text-muted-foreground">
							Are you sure you want to permanently delete
							<strong>{{ selectedDeletableChapters.length }}</strong>
							chapter{{ selectedDeletableChapters.length === 1 ? '' : 's' }}?
						</p>

						<p
							v-if="nonDeletableSelectedCount > 0"
							class="text-sm text-orange-500"
						>
							Note: {{ nonDeletableSelectedCount }} selected chapter{{ nonDeletableSelectedCount === 1 ? ' is' : 's are' }}
							not marked as "deleted from source" and will not be deleted.
						</p>

						<p class="text-sm text-destructive">
							This action cannot be undone. The chapters and their page data will be permanently removed.
						</p>
					</div>

					<template #footer>
						<div class="flex justify-end gap-2">
							<UButton
								variant="outline"
								:disabled="isDeleting"
								@click="deleteDialogOpen = false"
							>
								Cancel
							</UButton>
							<UButton
								color="error"
								:loading="isDeleting"
								@click="handleBulkDelete"
							>
								Delete {{ selectedDeletableChapters.length }} Chapter{{ selectedDeletableChapters.length === 1 ? '' : 's' }}
							</UButton>
						</div>
					</template>
				</UCard>
			</template>
		</UModal>
	</div>
</template>
