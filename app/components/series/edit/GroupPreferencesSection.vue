<script setup lang="ts">
import draggable from "vuedraggable"

interface GroupInfo {
	group_id: string
	name: string
	chapter_count: number
	priority: number
}

const props = defineProps<{
	serieId: string
}>()

const emit = defineEmits<{
	updated: []
}>()

const toast = useToast()
const isPending = ref(false)
const activeLanguage = ref<string | null>(null)

// Fetch group preferences
const { data: groupData, refresh: refreshGroups } = await useFetch(`/api/v1/serie/${props.serieId}/group-preference`)

// Available languages (sorted alphabetically)
const availableLanguages = computed(() => {
	if (!groupData.value?.groups_by_language) return []
	return Object.keys(groupData.value.groups_by_language).sort()
})

// Set initial active language
watch(availableLanguages, (langs) => {
	if (langs.length > 0 && !activeLanguage.value) {
		activeLanguage.value = langs[0] ?? null
	}
}, { immediate: true })

// All groups for the active language
const allGroups = computed<GroupInfo[]>(() => {
	if (!activeLanguage.value || !groupData.value?.groups_by_language) return []
	return groupData.value.groups_by_language[activeLanguage.value] ?? []
})

// Local state for draggable - prioritized groups (priority > 0)
const prioritizedGroups = ref<GroupInfo[]>([])

// Automatic groups (priority <= 0), sorted by chapter count
const automaticGroups = computed(() =>
	allGroups.value
		.filter(g => g.priority <= 0)
		.sort((a, b) => b.chapter_count - a.chapter_count),
)

// Sync prioritized groups when data changes or language changes
watch([allGroups, activeLanguage], () => {
	prioritizedGroups.value = allGroups.value
		.filter(g => g.priority > 0)
		.sort((a, b) => b.priority - a.priority) // Higher priority = higher rank
}, { immediate: true })

// Handle drag end - recalculate priorities based on new order
async function onDragEnd() {
	if (isPending.value || !activeLanguage.value) return

	// Calculate new priorities: first item gets highest priority
	const count = prioritizedGroups.value.length
	const updates: { group_id: string, newPriority: number }[] = []

	prioritizedGroups.value.forEach((group, index) => {
		const newPriority = count - index // First item = highest, last = 1
		if (group.priority !== newPriority) {
			updates.push({ group_id: group.group_id, newPriority })
		}
	})

	if (updates.length === 0) return

	isPending.value = true
	try {
		await Promise.all(
			updates.map(u =>
				$fetch(`/api/v1/serie/${props.serieId}/group-preference`, {
					method: "PATCH",
					body: { group_id: u.group_id, language: activeLanguage.value, priority: u.newPriority },
				}),
			),
		)
		// Update local priority values
		prioritizedGroups.value.forEach((group, index) => {
			group.priority = count - index
		})
		emit("updated")
	}
	catch (e) {
		console.error("Failed to update priorities:", e)
		toast.add({ title: "Update Failed", color: "error" })
		await refreshGroups()
	}
	finally {
		isPending.value = false
	}
}

// Add a group to prioritized list (adds to bottom with lowest priority)
async function prioritize(group: GroupInfo) {
	if (isPending.value || !activeLanguage.value) return

	isPending.value = true
	try {
		// Increment all existing priorities to make room for new group at priority 1
		if (prioritizedGroups.value.length > 0) {
			await Promise.all(
				prioritizedGroups.value.map(g =>
					$fetch(`/api/v1/serie/${props.serieId}/group-preference`, {
						method: "PATCH",
						body: { group_id: g.group_id, language: activeLanguage.value, priority: g.priority + 1 },
					}),
				),
			)
			// Update local state
			prioritizedGroups.value.forEach(g => g.priority += 1)
		}

		// Add new group with priority 1 (lowest, appears at bottom)
		await $fetch(`/api/v1/serie/${props.serieId}/group-preference`, {
			method: "PATCH",
			body: { group_id: group.group_id, language: activeLanguage.value, priority: 1 },
		})

		group.priority = 1
		prioritizedGroups.value.push(group)

		toast.add({
			title: "Group Prioritized",
			description: `${group.name} added to priority list`,
			color: "success",
		})
		emit("updated")
	}
	catch (e) {
		console.error("Failed to prioritize group:", e)
		toast.add({ title: "Update Failed", color: "error" })
		await refreshGroups()
	}
	finally {
		isPending.value = false
	}
}

// Remove a group from prioritized list
async function deprioritize(group: GroupInfo) {
	if (isPending.value || !activeLanguage.value) return

	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/group-preference`, {
			method: "PATCH",
			body: { group_id: group.group_id, language: activeLanguage.value, priority: 0 },
		})

		// Remove from prioritized list
		const idx = prioritizedGroups.value.findIndex(g => g.group_id === group.group_id)
		if (idx !== -1) {
			prioritizedGroups.value.splice(idx, 1)
		}
		group.priority = 0

		toast.add({
			title: "Priority Removed",
			description: `${group.name} will use automatic selection`,
			color: "success",
		})
		emit("updated")
	}
	catch (e) {
		console.error("Failed to deprioritize group:", e)
		toast.add({ title: "Update Failed", color: "error" })
	}
	finally {
		isPending.value = false
	}
}

// Reset all priorities for the current language
async function resetAll() {
	if (isPending.value || !activeLanguage.value || prioritizedGroups.value.length === 0) return

	isPending.value = true
	try {
		await Promise.all(
			prioritizedGroups.value.map(g =>
				$fetch(`/api/v1/serie/${props.serieId}/group-preference`, {
					method: "PATCH",
					body: { group_id: g.group_id, language: activeLanguage.value, priority: 0 },
				}),
			),
		)

		// Clear prioritized list
		prioritizedGroups.value.forEach(g => g.priority = 0)
		prioritizedGroups.value = []

		toast.add({
			title: "Priorities Reset",
			description: "All groups will use automatic selection",
			color: "success",
		})
		emit("updated")
	}
	catch (e) {
		console.error("Failed to reset priorities:", e)
		toast.add({ title: "Reset Failed", color: "error" })
	}
	finally {
		isPending.value = false
	}
}
</script>

<template>
	<UiPanel
		v-if="availableLanguages.length > 0"
		header-muted
	>
		<template #header>
			<div class="header-row">
				<div class="header-title">
					<div class="led active" />
					<span>GROUP CONTROL</span>
				</div>
				<button
					v-if="prioritizedGroups.length > 0"
					class="btn btn-danger"
					:disabled="isPending"
					@click="resetAll"
				>
					<UIcon
						v-if="isPending"
						name="i-lucide-loader-2"
						class="btn-icon spin"
					/>
					<template v-else>
						<UIcon
							name="i-lucide-rotate-ccw"
							class="btn-icon"
						/>
						<span class="btn-label">RESET</span>
					</template>
				</button>
			</div>
		</template>

		<template #tabs>
			<!-- Language Tabs -->
			<div class="lang-tabs">
				<button
					v-for="lang in availableLanguages"
					:key="lang"
					class="lang-tab"
					:class="{ active: activeLanguage === lang }"
					@click="activeLanguage = lang"
				>
					{{ lang.toUpperCase() }}
				</button>
			</div>
		</template>

		<!-- Panel Body Content -->
		<!-- Empty state -->
		<div
			v-if="allGroups.length === 0"
			class="empty"
		>
			<div class="led" />
			<span class="empty-text">NO GROUPS AVAILABLE</span>
		</div>

		<template v-else>
			<!-- Two-column layout -->
			<div class="groups-grid">
				<!-- Prioritized Column -->
				<div class="groups-column">
					<div class="column-header">
						<span class="column-title">PRIORITIZED</span>
						<span class="column-count">{{ prioritizedGroups.length }}</span>
					</div>

					<div
						v-if="prioritizedGroups.length === 0"
						class="column-empty"
					>
						<span class="empty-hint">Click [+] to add groups</span>
					</div>

					<draggable
						v-else
						v-model="prioritizedGroups"
						item-key="group_id"
						handle=".grip"
						ghost-class="group-ghost"
						drag-class="group-drag"
						class="groups-list"
						:disabled="isPending"
						@end="onDragEnd"
					>
						<template #item="{ element: group, index }">
							<div class="group-row prioritized">
								<div class="grip">
									<span class="grip-dots">⋮⋮</span>
								</div>
								<div class="group-rank">
									{{ index + 1 }}.
								</div>
								<div class="group-info">
									<span class="group-name">{{ group.name }}</span>
									<span class="group-chapters">[{{ group.chapter_count }}]</span>
								</div>
								<button
									class="action-btn remove"
									:disabled="isPending"
									title="Remove from priority"
									@click="deprioritize(group)"
								>
									<span class="action-icon">×</span>
								</button>
							</div>
						</template>
					</draggable>
				</div>

				<!-- Available Column -->
				<div class="groups-column">
					<div class="column-header">
						<span class="column-title">AVAILABLE</span>
						<span class="column-count">{{ automaticGroups.length }}</span>
					</div>

					<div
						v-if="automaticGroups.length === 0"
						class="column-empty"
					>
						<span class="empty-hint">All groups prioritized</span>
					</div>

					<div
						v-else
						class="groups-list"
					>
						<div
							v-for="group in automaticGroups"
							:key="group.group_id"
							class="group-row available"
						>
							<span class="bullet">•</span>
							<div class="group-info">
								<span class="group-name">{{ group.name }}</span>
								<span class="group-chapters">[{{ group.chapter_count }}]</span>
							</div>
							<button
								class="action-btn add"
								:disabled="isPending"
								title="Add to priority"
								@click="prioritize(group)"
							>
								<span class="action-icon">+</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		</template>
	</UiPanel>
</template>

<style scoped>
/* Header Row */
.header-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
}

.header-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text-muted);
	letter-spacing: 0.05em;
}

/* LED Indicator */
.led {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--ui-text-dimmed);
	box-shadow: 0 0 0 1px var(--ui-border);
	flex-shrink: 0;
}

.led.active {
	background: var(--ui-primary);
	box-shadow:
		0 0 6px color-mix(in oklch, var(--ui-primary) 30%, transparent),
		0 0 0 1px color-mix(in oklch, var(--ui-primary) 60%, transparent);
}

/* Language Tabs */
.lang-tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 0;
	padding: 0;
}

.lang-tab {
	padding: 0.5rem 0.75rem;
	font-family: inherit;
	font-size: var(--font-size-sm);
	font-weight: 600;
	letter-spacing: 0.05em;
	color: var(--ui-text-dimmed);
	background: transparent;
	border: none;
	border-bottom: 2px solid transparent;
	cursor: pointer;
	transition: all 0.15s ease;
}

.lang-tab:hover:not(.active) {
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
}

.lang-tab.active {
	color: var(--ui-primary);
	background: var(--ui-bg-elevated);
	border-bottom-color: var(--ui-primary);
}

/* Button Styles */
.btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	padding: 0.375rem 0.625rem;
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	letter-spacing: 0.05em;
	border-radius: 0.25rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.btn-danger {
	color: var(--ui-error);
	background: transparent;
	border: 1px solid var(--ui-error);
}

.btn-danger:hover:not(:disabled) {
	background: color-mix(in oklch, var(--ui-error) 15%, transparent);
	box-shadow: 0 0 8px color-mix(in oklch, var(--ui-error) 30%, transparent);
}

.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-icon {
	width: 0.75rem;
	height: 0.75rem;
}

.btn-label {
	display: none;
}

@media (min-width: 480px) {
	.btn-label {
		display: inline;
	}
}

.spin {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Empty State */
.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.75rem;
	padding: 2rem 1rem;
}

.empty-text {
	font-family: inherit;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text-dimmed);
	letter-spacing: 0.1em;
}

/* Groups Grid */
.groups-grid {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

@media (min-width: 640px) {
	.groups-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.875rem;
	}
}

/* Groups Column */
.groups-column {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.column-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 0.25rem;
}

.column-title {
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	letter-spacing: 0.1em;
}

.column-title::before {
	content: "─ ";
	color: var(--ui-text-dimmed);
}

.column-count {
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-dimmed);
	padding: 0.125rem 0.375rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
}

.column-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1.25rem 0.75rem;
	background: var(--ui-bg);
	border: 1px dashed var(--ui-border);
	border-radius: 0.25rem;
}

.empty-hint {
	font-family: inherit;
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	letter-spacing: 0.05em;
}

/* Groups List */
.groups-list {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	padding: 0.375rem;
}

/* Group Row */
.group-row {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.5rem 0.625rem;
	font-family: inherit;
	font-size: var(--font-size-sm);
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	transition: all 0.15s ease;
}

.group-row:hover {
	border-color: var(--ui-text-dimmed);
}

.group-row.prioritized:hover {
	border-color: var(--ui-primary);
	box-shadow: 0 0 6px color-mix(in oklch, var(--ui-primary) 15%, transparent);
}

/* Grip Handle */
.grip {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1rem;
	cursor: grab;
	flex-shrink: 0;
}

.grip:active {
	cursor: grabbing;
}

.grip-dots {
	color: var(--ui-text-dimmed);
	font-size: 0.625rem;
	letter-spacing: -0.125em;
	opacity: 0.5;
	transition: opacity 0.15s ease;
}

.group-row:hover .grip-dots {
	opacity: 1;
	color: var(--ui-primary);
}

/* Drag States */
.group-ghost {
	opacity: 0.3;
	background: color-mix(in oklch, var(--ui-primary) 15%, transparent) !important;
	border-style: dashed !important;
}

.group-drag {
	background: var(--ui-bg-elevated) !important;
	box-shadow:
		0 0 12px color-mix(in oklch, var(--ui-primary) 30%, transparent),
		0 4px 16px rgba(0, 0, 0, 0.2);
	border-color: var(--ui-primary) !important;
	z-index: 100;
}

/* Group Rank */
.group-rank {
	font-weight: 600;
	color: var(--ui-primary);
	min-width: 1.25rem;
	flex-shrink: 0;
}

/* Bullet for Available */
.bullet {
	color: var(--ui-text-dimmed);
	font-weight: 600;
	min-width: 1rem;
	flex-shrink: 0;
}

/* Group Info */
.group-info {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 0.5rem;
	min-width: 0;
}

.group-name {
	flex: 1;
	color: var(--ui-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.group-chapters {
	color: var(--ui-text-dimmed);
	flex-shrink: 0;
}

/* Action Buttons */
.action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.375rem;
	height: 1.375rem;
	font-family: inherit;
	font-weight: 700;
	background: transparent;
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	cursor: pointer;
	flex-shrink: 0;
	opacity: 0.6;
	transition: all 0.15s ease;
}

.group-row:hover .action-btn {
	opacity: 1;
}

.action-btn:disabled {
	opacity: 0.3 !important;
	cursor: not-allowed;
}

.action-icon {
	font-size: 0.875rem;
	line-height: 1;
}

.action-btn.add {
	color: var(--ui-success);
	border-color: var(--ui-success);
}

.action-btn.add:hover:not(:disabled) {
	background: color-mix(in oklch, var(--ui-success) 15%, transparent);
	box-shadow: 0 0 6px color-mix(in oklch, var(--ui-success) 30%, transparent);
}

.action-btn.remove {
	color: var(--ui-error);
	border-color: var(--ui-error);
}

.action-btn.remove:hover:not(:disabled) {
	background: color-mix(in oklch, var(--ui-error) 15%, transparent);
	box-shadow: 0 0 6px color-mix(in oklch, var(--ui-error) 30%, transparent);
}
</style>
