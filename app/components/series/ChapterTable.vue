<script setup lang="ts">
import type { PageFetchStatus, UIChapter, UIChapterItem } from "#shared/ui/type/chapter"
import { isSplitChapter } from "#shared/utils/chapters"

const { formatRelativeTime } = useFormatters()

// Alternative selection state
const isSelectingAlternative = ref(false)

async function handleSelectAlternative(chapterId: string) {
	isSelectingAlternative.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/chapters/${chapterId}/select`, {
			method: "POST",
		})
		emit("versionSelected")
	}
	catch (e) {
		console.error("Failed to select alternative:", e)
	}
	finally {
		isSelectingAlternative.value = false
	}
}

function getStatusLabel(status: PageFetchStatus): string {
	switch (status) {
		case "Success": return "Ready"
		case "Pending": return "Pending"
		case "InProgress": return "Loading"
		default: return "Failed"
	}
}

function getStatusColor(status: PageFetchStatus): string {
	switch (status) {
		case "Success": return "text-emerald-500"
		case "Pending":
		case "InProgress": return "text-amber-500"
		default: return "text-red-500"
	}
}

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
		case "PermanentlyFailed":
			return { label: "Perm. Failed", color: "error" as const, icon: "i-lucide-ban" }
		case "Incomplete":
			return { label: "Incomplete", color: "warning" as const, icon: "i-lucide-circle-alert" }
	}
}

const props = defineProps<{
	items: UIChapterItem[]
	isAdmin: boolean
	serieId: string
}>()

const emit = defineEmits<{
	chaptersDeleted: []
	chaptersAcknowledged: []
	versionSelected: []
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

// Expanded groups state (keyed by "chapterNumber-language")
const expandedGroups = ref<Set<string>>(new Set())

// Filters (language is now handled by parent tabs)
const sourceFilter = ref("all")
const groupFilter = ref("all")
const statusFilter = ref("all")
const sourceAvailabilityFilter = ref("all")

// Extract chapters only (items should only contain chapters now, no missing markers)
const chapters = computed(() =>
	props.items.filter((item): item is { type: "chapter", data: UIChapter } => item.type === "chapter"),
)

// Extract unique values for filters
const filterOptions = computed(() => {
	const sources = new Map<string, string>()
	const groups = new Map<string, string>()

	for (const { data: chapter } of chapters.value) {
		sources.set(chapter.source.external_id, chapter.source.name)
		for (const group of chapter.groups) {
			groups.set(group.id, group.name)
		}
	}

	return {
		sources: Array.from(sources.entries()).sort((a, b) => a[1].localeCompare(b[1])),
		groups: Array.from(groups.entries()).sort((a, b) => a[1].localeCompare(b[1])),
	}
})

// Helper to determine chapter source availability status
function getSourceAvailabilityStatus(chapter: UIChapter): "available" | "removed-unacknowledged" | "removed-acknowledged" {
	if (!chapter.source_removed_at) {
		return "available"
	}
	return chapter.source_removal_acknowledged_at ? "removed-acknowledged" : "removed-unacknowledged"
}

// Filter a single chapter
function passesFilters(chapter: UIChapter): boolean {
	if (sourceFilter.value !== "all" && chapter.source.external_id !== sourceFilter.value) {
		return false
	}

	if (groupFilter.value === "none" && chapter.groups.length > 0) {
		return false
	}
	if (groupFilter.value !== "all" && groupFilter.value !== "none" && !chapter.groups.some((g: { id: string }) => g.id === groupFilter.value)) {
		return false
	}

	if (statusFilter.value !== "all" && chapter.page_fetch_status !== statusFilter.value) {
		return false
	}

	if (sourceAvailabilityFilter.value !== "all" && getSourceAvailabilityStatus(chapter) !== sourceAvailabilityFilter.value) {
		return false
	}

	return true
}

// Group chapters by (chapter_number, language) for nested display
type ChapterGroup = {
	key: string
	chapterNumber: number
	language: string
	primary: UIChapter | null // The enabled chapter (or first if none enabled)
	duplicates: UIChapter[] // Other versions (disabled or splits collapsed under whole)
	hasSplitsCollapsed?: boolean // True if this group has splits collapsed under a whole chapter
}

/**
 * Check if a chapter number is a whole number (no decimal).
 */
function isWholeChapter(chapterNumber: number): boolean {
	return chapterNumber === Math.floor(chapterNumber)
}

/**
 * Get the base (floor) chapter number.
 */
function getBaseChapterNumber(chapterNumber: number): number {
	return Math.floor(chapterNumber)
}

const groupedChapters = computed<ChapterGroup[]>(() => {
	// Step 1: Group all chapters by exact (chapter_number, language)
	const exactGroups = new Map<string, { chapters: UIChapter[] }>()

	for (const { data: chapter } of chapters.value) {
		if (!passesFilters(chapter)) continue

		const key = `${chapter.chapter_number}-${chapter.language}`
		if (!exactGroups.has(key)) {
			exactGroups.set(key, { chapters: [] })
		}
		exactGroups.get(key)!.chapters.push(chapter)
	}

	// Step 2: Identify base numbers that have BOTH a whole chapter AND splits
	// For these, we'll collapse splits under the whole
	const baseNumbersWithWhole = new Map<string, boolean>() // key: "base-language" -> hasWhole

	for (const key of exactGroups.keys()) {
		const [numStr, lang] = key.split("-")
		const num = parseFloat(numStr!)
		const base = getBaseChapterNumber(num)
		const baseKey = `${base}-${lang}`

		if (isWholeChapter(num)) {
			baseNumbersWithWhole.set(baseKey, true)
		}
	}

	// Step 3: Build result groups
	// - If a whole chapter exists for a base number, collapse splits under it
	// - Otherwise, keep chapters as separate groups (current behavior)
	const result: ChapterGroup[] = []
	const processedSplits = new Set<string>() // Track split keys that were collapsed

	for (const [key, group] of exactGroups) {
		const [numStr, lang] = key.split("-")
		const num = parseFloat(numStr!)
		const base = getBaseChapterNumber(num)
		const baseKey = `${base}-${lang}`

		// If this is a split and the whole exists, skip it (will be added to whole's duplicates)
		if (isSplitChapter(num) && baseNumbersWithWhole.get(baseKey)) {
			processedSplits.add(key)
			continue
		}

		// Sort: enabled first, then by date_upload desc
		const sorted = [...group.chapters].sort((a, b) => {
			if (a.enabled !== b.enabled) return b.enabled ? 1 : -1
			return new Date(b.date_upload).getTime() - new Date(a.date_upload).getTime()
		})

		const primary = sorted[0] || null
		let duplicates = sorted.slice(1)
		let hasSplitsCollapsed = false

		// If this is a whole chapter, add splits to duplicates
		if (primary && isWholeChapter(num) && baseNumbersWithWhole.get(baseKey)) {
			// Find all splits for this base number
			const splits: UIChapter[] = []
			for (const [splitKey, splitGroup] of exactGroups) {
				const [splitNumStr, splitLang] = splitKey.split("-")
				const splitNum = parseFloat(splitNumStr!)
				if (splitLang === lang && isSplitChapter(splitNum) && getBaseChapterNumber(splitNum) === base) {
					splits.push(...splitGroup.chapters)
				}
			}

			if (splits.length > 0) {
				// Sort splits by chapter number ascending, then enabled first
				splits.sort((a, b) => {
					if (a.chapter_number !== b.chapter_number) return a.chapter_number - b.chapter_number
					if (a.enabled !== b.enabled) return b.enabled ? 1 : -1
					return new Date(b.date_upload).getTime() - new Date(a.date_upload).getTime()
				})
				duplicates = [...duplicates, ...splits]
				hasSplitsCollapsed = true
			}
		}

		if (primary) {
			result.push({
				key,
				chapterNumber: primary.chapter_number,
				language: primary.language,
				primary,
				duplicates,
				hasSplitsCollapsed,
			})
		}
	}

	// Sort by chapter number descending
	result.sort((a, b) => b.chapterNumber - a.chapterNumber)

	return result
})

const totalChapterCount = computed(() => chapters.value.length)
const visibleChapterCount = computed(() => {
	let count = 0
	for (const group of groupedChapters.value) {
		count += 1 + group.duplicates.length
	}
	return count
})

const filteredChapterIds = computed(() => {
	const ids: string[] = []
	for (const group of groupedChapters.value) {
		if (group.primary) ids.push(group.primary.id)
		for (const dup of group.duplicates) {
			ids.push(dup.id)
		}
	}
	return ids
})

const allSelected = computed(() =>
	selectedIds.value.size > 0 && filteredChapterIds.value.every(id => selectedIds.value.has(id)),
)

const someSelected = computed(() =>
	selectedIds.value.size > 0 && filteredChapterIds.value.some(id => selectedIds.value.has(id)) && !allSelected.value,
)

const hasActiveFilters = computed(() =>
	sourceFilter.value !== "all" || groupFilter.value !== "all" || statusFilter.value !== "all" || sourceAvailabilityFilter.value !== "all",
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

function toggleGroup(key: string) {
	const next = new Set(expandedGroups.value)
	if (next.has(key)) {
		next.delete(key)
	}
	else {
		next.add(key)
	}
	expandedGroups.value = next
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

function isUnacknowledgedRemoved(chapter: UIChapter): boolean {
	return !!chapter.source_removed_at && !chapter.source_removal_acknowledged_at
}

function isAcknowledgedRemoved(chapter: UIChapter): boolean {
	return !!chapter.source_removed_at && !!chapter.source_removal_acknowledged_at
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

// Status filter items (admin only)
const statusFilterItems = [
	{ label: "All Status", value: "all" },
	{ label: "Success", value: "Success" },
	{ label: "Pending", value: "Pending" },
	{ label: "In Progress", value: "InProgress" },
	{ label: "Partial", value: "Partial" },
	{ label: "Failed", value: "Failed" },
	{ label: "Perm. Failed", value: "PermanentlyFailed" },
	{ label: "Incomplete", value: "Incomplete" },
]

// Source availability filter items (admin only)
const sourceAvailabilityFilterItems = [
	{ label: "All", value: "all" },
	{ label: "Available", value: "available" },
	{ label: "Removed (Unack.)", value: "removed-unacknowledged" },
	{ label: "Removed (Ack.)", value: "removed-acknowledged" },
]
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
				{{ groupedChapters.length }} chapters
				<template v-if="visibleChapterCount !== groupedChapters.length">
					({{ visibleChapterCount }} with duplicates)
				</template>
				of {{ totalChapterCount }} total
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
				@click="() => { deleteDialogOpen = true }"
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
				@click="() => { selectedIds = new Set() }"
			>
				Clear
			</UButton>
		</div>

		<!-- Custom Table with nested rows -->
		<div class="max-h-[60vh] overflow-auto">
			<table class="w-full">
				<thead class="bg-elevated sticky top-0 z-10">
					<tr class="border-b">
						<th
							v-if="isAdmin"
							class="px-4 py-3 text-left font-medium w-10"
						>
							<UCheckbox
								:model-value="allSelected"
								:indeterminate="someSelected"
								@update:model-value="toggleSelectAll"
							/>
						</th>
						<th class="px-4 py-3 text-left font-medium w-8" />
						<th class="px-4 py-3 text-left font-medium">
							Chapter
						</th>
						<th class="px-4 py-3 text-left font-medium">
							Title
						</th>
						<th class="px-4 py-3 text-left font-medium">
							Source
						</th>
						<th class="px-4 py-3 text-left font-medium">
							Groups
						</th>
						<th class="px-4 py-3 text-left font-medium">
							Uploaded
						</th>
						<th
							v-if="isAdmin"
							class="px-4 py-3 text-left font-medium"
						>
							Status
						</th>
						<th
							v-if="isAdmin"
							class="px-4 py-3 text-left font-medium"
						>
							Enabled
						</th>
					</tr>
				</thead>
				<tbody>
					<template
						v-for="group in groupedChapters"
						:key="group.key"
					>
						<!-- Primary row -->
						<tr
							v-if="group.primary"
							class="border-b hover:bg-muted/50 transition-colors cursor-pointer"
							@click="openViewer(group.primary)"
						>
							<!-- Checkbox -->
							<td
								v-if="isAdmin"
								class="px-4 py-3"
								@click.stop
							>
								<UCheckbox
									:model-value="selectedIds.has(group.primary.id)"
									@update:model-value="toggleSelect(group.primary.id)"
								/>
							</td>

							<!-- Expand/collapse -->
							<td
								class="px-2 py-3"
								@click.stop
							>
								<button
									v-if="group.duplicates.length > 0"
									class="p-1 rounded hover:bg-muted transition-colors"
									@click="toggleGroup(group.key)"
								>
									<UIcon
										:name="expandedGroups.has(group.key) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
										class="h-4 w-4 text-muted-foreground"
									/>
								</button>
								<span
									v-else
									class="w-6 inline-block"
								/>
							</td>

							<!-- Chapter number -->
							<td class="px-4 py-3">
								<div class="flex items-center gap-2">
									<span
										:class="[
											'font-medium',
											isUnacknowledgedRemoved(group.primary) && 'opacity-50 line-through',
										]"
									>
										<span
											v-if="group.primary.volume_number !== null"
											class="text-muted-foreground mr-1"
										>
											Vol. {{ group.primary.volume_number }}
										</span>
										Ch. {{ group.primary.chapter_number }}
									</span>
									<UIcon
										v-if="isAcknowledgedRemoved(group.primary)"
										name="i-lucide-cloud-off"
										class="h-3 w-3 text-muted-foreground"
										title="Removed from source (acknowledged)"
									/>
									<!-- Split chapter indicator -->
									<UIcon
										v-if="isSplitChapter(group.primary.chapter_number)"
										name="i-lucide-split"
										class="h-3 w-3 text-orange-400"
										title="Split chapter (sub-division of whole chapter)"
									/>
									<!-- Splits collapsed badge (orange) -->
									<span
										v-if="group.hasSplitsCollapsed"
										class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20"
										:title="`${group.duplicates.length} split chapters collapsed`"
									>
										<UIcon
											name="i-lucide-git-merge"
											class="h-3 w-3"
										/>
										{{ group.duplicates.length + 1 }}
									</span>
									<!-- Duplicate count badge (purple) - only show if not splits collapsed -->
									<span
										v-else-if="group.duplicates.length > 0"
										class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20"
									>
										<UIcon
											name="i-lucide-layers"
											class="h-3 w-3"
										/>
										{{ group.duplicates.length + 1 }}
									</span>
								</div>
							</td>

							<!-- Title -->
							<td class="px-4 py-3">
								<span
									:class="[
										'text-muted-foreground',
										isUnacknowledgedRemoved(group.primary) && 'opacity-50 line-through',
									]"
								>
									{{ group.primary.title || 'No title' }}
								</span>
							</td>

							<!-- Source -->
							<td class="px-4 py-3">
								<UBadge variant="subtle">
									{{ group.primary.source.name }}
								</UBadge>
							</td>

							<!-- Groups -->
							<td
								class="px-4 py-3"
								@click.stop
							>
								<div class="flex flex-wrap items-center gap-1">
									<template v-if="group.primary.groups.length">
										<UBadge
											v-for="grp in group.primary.groups"
											:key="grp.id"
											variant="outline"
										>
											<a
												v-if="grp.url"
												:href="grp.url"
												target="_blank"
												rel="noopener noreferrer"
												class="hover:underline"
											>
												{{ grp.name }}
											</a>
											<template v-else>
												{{ grp.name }}
											</template>
										</UBadge>
									</template>
									<span
										v-else
										class="text-muted-foreground/50 italic"
									>-</span>

									<!-- Same-source alternatives popover -->
									<UPopover
										v-if="group.primary.has_alternatives && group.primary.alternatives?.length"
										:content="{ side: 'bottom', align: 'start' }"
									>
										<template #default="{ open }">
											<button
												type="button"
												class="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all"
												:class="[
													open
														? 'bg-purple-500 text-white'
														: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25',
												]"
											>
												<UIcon
													name="i-lucide-layers"
													class="w-3 h-3"
												/>
												+{{ group.primary.alternatives!.length }}
											</button>
										</template>
										<template #content>
											<div class="p-3 min-w-[280px] max-w-[360px]">
												<div class="flex items-center gap-2 mb-3 pb-2 border-b border-border">
													<UIcon
														name="i-lucide-layers"
														class="w-4 h-4 text-purple-500"
													/>
													<span class="text-sm font-medium">Alternative Versions</span>
												</div>

												<div class="space-y-2">
													<!-- Current version indicator -->
													<div class="flex items-center gap-2 p-2 rounded-md bg-purple-500/10 border border-purple-500/20">
														<UIcon
															name="i-lucide-check-circle"
															class="w-4 h-4 text-purple-500 shrink-0"
														/>
														<div class="flex-1 min-w-0">
															<div class="text-xs font-medium truncate">
																{{ group.primary.groups[0]?.name || 'Unknown Group' }}
															</div>
															<div class="text-xs text-muted-foreground">
																Current • {{ formatRelativeTime(group.primary.date_upload) }}
															</div>
														</div>
														<span :class="['text-xs font-medium', getStatusColor(group.primary.page_fetch_status)]">
															{{ getStatusLabel(group.primary.page_fetch_status) }}
														</span>
													</div>

													<!-- Alternative versions -->
													<div
														v-for="alt in group.primary.alternatives"
														:key="alt.id"
														class="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
													>
														<div class="w-4 h-4 shrink-0" />
														<div class="flex-1 min-w-0">
															<div class="text-xs font-medium truncate">
																{{ alt.groups[0]?.name || 'Unknown Group' }}
															</div>
															<div class="text-xs text-muted-foreground">
																{{ formatRelativeTime(alt.date_upload) }}
															</div>
														</div>
														<span :class="['text-xs font-medium mr-2', getStatusColor(alt.page_fetch_status)]">
															{{ getStatusLabel(alt.page_fetch_status) }}
														</span>
														<UButton
															size="xs"
															variant="soft"
															color="primary"
															:loading="isSelectingAlternative"
															@click.stop="handleSelectAlternative(alt.id)"
														>
															Switch
														</UButton>
													</div>
												</div>
											</div>
										</template>
									</UPopover>
								</div>
							</td>

							<!-- Uploaded -->
							<td class="px-4 py-3">
								<span class="text-sm text-muted-foreground">
									{{ formatRelativeTime(group.primary.date_upload) }}
								</span>
							</td>

							<!-- Status (admin only) -->
							<td
								v-if="isAdmin"
								class="px-4 py-3"
							>
								<UBadge
									:color="getStatusBadge(group.primary.page_fetch_status).color"
									variant="subtle"
									class="gap-1"
								>
									<UIcon
										:name="getStatusBadge(group.primary.page_fetch_status).icon"
										class="h-3 w-3"
									/>
									{{ getStatusBadge(group.primary.page_fetch_status).label }}
								</UBadge>
							</td>

							<!-- Enabled (admin only) -->
							<td
								v-if="isAdmin"
								class="px-4 py-3"
								@click.stop
							>
								<UiToggleSwitch
									:model-value="getEnabled(group.primary)"
									:disabled="isPending"
									@update:model-value="handleToggleEnabled(group.primary.id, getEnabled(group.primary))"
								/>
							</td>
						</tr>

						<!-- Duplicate rows (nested) -->
						<template v-if="expandedGroups.has(group.key)">
							<tr
								v-for="dup in group.duplicates"
								:key="dup.id"
								class="border-b bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
								@click="openViewer(dup)"
							>
								<!-- Checkbox -->
								<td
									v-if="isAdmin"
									class="px-4 py-2"
									@click.stop
								>
									<UCheckbox
										:model-value="selectedIds.has(dup.id)"
										@update:model-value="toggleSelect(dup.id)"
									/>
								</td>

								<!-- Indent spacer -->
								<td class="px-2 py-2">
									<div class="ml-2 pl-2 border-l-2 border-purple-500/30 h-full" />
								</td>

								<!-- Chapter number (dimmed, shows it's a duplicate) -->
								<td class="px-4 py-2">
									<div class="flex items-center gap-1">
										<span
											:class="[
												'text-sm text-muted-foreground',
												isUnacknowledgedRemoved(dup) && 'opacity-50 line-through',
											]"
										>
											<UIcon
												name="i-lucide-corner-down-right"
												class="h-3 w-3 mr-1 inline"
											/>
											Ch. {{ dup.chapter_number }}
										</span>
										<!-- Split chapter indicator -->
										<UIcon
											v-if="isSplitChapter(dup.chapter_number)"
											name="i-lucide-split"
											class="h-3 w-3 text-orange-400"
											title="Split chapter (sub-division of whole chapter)"
										/>
									</div>
								</td>

								<!-- Title -->
								<td class="px-4 py-2">
									<span
										:class="[
											'text-sm text-muted-foreground',
											isUnacknowledgedRemoved(dup) && 'opacity-50 line-through',
										]"
									>
										{{ dup.title || 'No title' }}
									</span>
								</td>

								<!-- Source -->
								<td class="px-4 py-2">
									<UBadge
										variant="outline"
										size="sm"
									>
										{{ dup.source.name }}
									</UBadge>
								</td>

								<!-- Groups -->
								<td
									class="px-4 py-2"
									@click.stop
								>
									<div class="flex flex-wrap gap-1">
										<template v-if="dup.groups.length">
											<UBadge
												v-for="grp in dup.groups"
												:key="grp.id"
												variant="outline"
												size="sm"
											>
												{{ grp.name }}
											</UBadge>
										</template>
										<span
											v-else
											class="text-muted-foreground/50 italic text-sm"
										>-</span>
									</div>
								</td>

								<!-- Uploaded -->
								<td class="px-4 py-2">
									<span class="text-xs text-muted-foreground">
										{{ formatRelativeTime(dup.date_upload) }}
									</span>
								</td>

								<!-- Status (admin only) -->
								<td
									v-if="isAdmin"
									class="px-4 py-2"
								>
									<UBadge
										:color="getStatusBadge(dup.page_fetch_status).color"
										variant="subtle"
										size="sm"
										class="gap-1"
									>
										<UIcon
											:name="getStatusBadge(dup.page_fetch_status).icon"
											class="h-3 w-3"
										/>
										{{ getStatusBadge(dup.page_fetch_status).label }}
									</UBadge>
								</td>

								<!-- Enabled (admin only) -->
								<td
									v-if="isAdmin"
									class="px-4 py-2"
									@click.stop
								>
									<UiToggleSwitch
										:model-value="getEnabled(dup)"
										:disabled="isPending"
										size="sm"
										@click.stop
										@update:model-value="handleToggleEnabled(dup.id, getEnabled(dup))"
									/>
								</td>
							</tr>
						</template>
					</template>

					<!-- Empty state -->
					<tr v-if="groupedChapters.length === 0">
						<td
							:colspan="isAdmin ? 9 : 6"
							class="px-4 py-8 text-center text-muted-foreground"
						>
							No chapters found
						</td>
					</tr>
				</tbody>
			</table>
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
								@click="() => { deleteDialogOpen = false }"
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
