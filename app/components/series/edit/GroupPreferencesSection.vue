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
	<section
		v-if="availableLanguages.length > 0"
		class="edit-section"
	>
		<div class="section-header">
			<div class="section-title">
				<div class="section-icon">
					<UIcon
						name="i-lucide-users"
						class="icon"
					/>
				</div>
				<div>
					<h2>Group Preferences</h2>
					<p>Set scanlation group priority for deduplication</p>
				</div>
			</div>

			<!-- Reset button in header when there are prioritized groups -->
			<button
				v-if="prioritizedGroups.length > 0"
				class="reset-button"
				:disabled="isPending"
				@click="resetAll"
			>
				<UIcon
					v-if="isPending"
					name="i-lucide-loader-2"
					class="spinner"
				/>
				<template v-else>
					<UIcon
						name="i-lucide-rotate-ccw"
						class="btn-icon"
					/>
					<span class="reset-text">Reset</span>
				</template>
			</button>
		</div>

		<div class="section-body">
			<!-- Language tabs -->
			<div class="language-tabs">
				<button
					v-for="lang in availableLanguages"
					:key="lang"
					class="lang-tab"
					:class="{ active: activeLanguage === lang }"
					@click="activeLanguage = lang"
				>
					<span class="lang-code">{{ lang.toUpperCase() }}</span>
				</button>
			</div>

			<!-- Empty state -->
			<div
				v-if="allGroups.length === 0"
				class="empty-state"
			>
				<div class="empty-icon-wrapper">
					<UIcon
						name="i-lucide-users-round"
						class="empty-icon"
					/>
				</div>
				<p class="empty-title">
					No groups available
				</p>
				<p class="empty-desc">
					This language has no scanlation groups
				</p>
			</div>

			<template v-else>
				<!-- Prioritized groups -->
				<div class="groups-section">
					<div class="section-label">
						<div class="label-badge prioritized">
							<UIcon
								name="i-lucide-crown"
								class="label-icon"
							/>
						</div>
						<span class="label-text">Prioritized</span>
						<span class="label-count">{{ prioritizedGroups.length }}</span>
					</div>

					<div
						v-if="prioritizedGroups.length === 0"
						class="empty-section"
					>
						<UIcon
							name="i-lucide-plus-circle"
							class="empty-section-icon"
						/>
						<p>Click <strong>+</strong> on a group below to prioritize</p>
					</div>

					<draggable
						v-else
						v-model="prioritizedGroups"
						item-key="group_id"
						handle=".drag-handle"
						ghost-class="group-ghost"
						drag-class="group-drag"
						class="groups-list prioritized-list"
						:disabled="isPending"
						@end="onDragEnd"
					>
						<template #item="{ element: group, index }">
							<div
								class="group-row prioritized"
								:style="{ '--stagger': index }"
							>
								<div class="drag-handle">
									<UIcon
										name="i-lucide-grip-vertical"
										class="grip-icon"
									/>
								</div>

								<div class="group-rank">
									<span class="rank-number">{{ index + 1 }}</span>
								</div>

								<div class="group-info">
									<span class="group-name">{{ group.name }}</span>
									<span class="group-meta">
										<UIcon
											name="i-lucide-book-open"
											class="meta-icon"
										/>
										{{ group.chapter_count }}
									</span>
								</div>

								<div class="group-actions">
									<button
										class="action-btn remove"
										:disabled="isPending"
										title="Remove from priority list"
										@click="deprioritize(group)"
									>
										<UIcon
											name="i-lucide-x"
											class="action-icon"
										/>
									</button>
								</div>
							</div>
						</template>
					</draggable>
				</div>

				<!-- Automatic groups -->
				<div class="groups-section">
					<div class="section-label">
						<div class="label-badge automatic">
							<UIcon
								name="i-lucide-sparkles"
								class="label-icon"
							/>
						</div>
						<span class="label-text">Automatic</span>
						<span class="label-count">{{ automaticGroups.length }}</span>
					</div>

					<div
						v-if="automaticGroups.length === 0"
						class="empty-section minimal"
					>
						<p>All groups are prioritized</p>
					</div>

					<div
						v-else
						class="groups-list"
					>
						<div
							v-for="(group, index) in automaticGroups"
							:key="group.group_id"
							class="group-row automatic"
							:style="{ '--stagger': index }"
						>
							<div class="group-info">
								<span class="group-name">{{ group.name }}</span>
								<span class="group-meta">
									<UIcon
										name="i-lucide-book-open"
										class="meta-icon"
									/>
									{{ group.chapter_count }}
								</span>
							</div>

							<div class="group-actions">
								<button
									class="action-btn add"
									:disabled="isPending"
									title="Add to priority list"
									@click="prioritize(group)"
								>
									<UIcon
										name="i-lucide-plus"
										class="action-icon"
									/>
								</button>
							</div>
						</div>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>

<style scoped>
.edit-section {
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.75rem;
	overflow: hidden;
}

/* Section header */
.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem 1.25rem;
	border-bottom: 1px solid var(--ui-border-muted);
}

.section-title {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.section-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
	background: color-mix(in oklch, var(--ui-info) 15%, transparent);
	border-radius: 0.375rem;
}

.section-icon .icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-info);
}

.section-title h2 {
	font-size: var(--font-size-base);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
}

.section-title p {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin: 0;
}

/* Reset button in header */
.reset-button {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem 0.625rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: transparent;
	border: 1px solid var(--ui-border);
	border-radius: 0.375rem;
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.reset-button:hover:not(:disabled) {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
	border-color: var(--ui-border);
}

.reset-button:active:not(:disabled) {
	transform: scale(0.97);
}

.reset-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-icon {
	width: 0.75rem;
	height: 0.75rem;
}

.reset-text {
	display: none;
}

@media (min-width: 480px) {
	.reset-text {
		display: inline;
	}
}

.spinner {
	width: 0.875rem;
	height: 0.875rem;
	animation: spin 0.8s linear infinite;
}

/* Section body */
.section-body {
	padding: 1rem 1.25rem 1.25rem;
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

/* Language tabs */
.language-tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
	padding: 0.25rem;
	background: var(--ui-bg);
	border-radius: 0.5rem;
	border: 1px solid var(--ui-border-muted);
}

.lang-tab {
	position: relative;
	padding: 0.375rem 0.625rem;
	font-size: var(--font-size-xs);
	font-weight: 600;
	letter-spacing: 0.025em;
	color: var(--ui-text-muted);
	background: transparent;
	border: none;
	border-radius: 0.375rem;
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.lang-tab:hover:not(.active) {
	background: var(--ui-bg-muted);
	color: var(--ui-text);
}

.lang-tab.active {
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
	box-shadow: 0 1px 2px color-mix(in oklch, var(--ui-primary) 15%, transparent);
}

.lang-code {
	display: block;
}

/* Empty state */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.5rem;
	padding: 2.5rem 1rem;
}

.empty-icon-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 3.5rem;
	height: 3.5rem;
	background: var(--ui-bg);
	border: 1px dashed var(--ui-border);
	border-radius: 50%;
	margin-bottom: 0.25rem;
}

.empty-icon {
	width: 1.5rem;
	height: 1.5rem;
	color: var(--ui-text-muted);
	opacity: 0.5;
}

.empty-title {
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
}

.empty-desc {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin: 0;
}

/* Groups section */
.groups-section {
	display: flex;
	flex-direction: column;
	gap: 0.625rem;
}

.section-label {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.label-badge {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.375rem;
	height: 1.375rem;
	border-radius: 0.25rem;
}

.label-badge.prioritized {
	background: var(--ui-primary-soft);
}

.label-badge.automatic {
	background: var(--ui-bg-muted);
}

.label-badge .label-icon {
	width: 0.75rem;
	height: 0.75rem;
}

.label-badge.prioritized .label-icon {
	color: var(--ui-primary);
}

.label-badge.automatic .label-icon {
	color: var(--ui-text-muted);
}

.label-text {
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.label-count {
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-dimmed);
	padding: 0.0625rem 0.375rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border-muted);
	border-radius: 9999px;
}

/* Empty section */
.empty-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	padding: 1.25rem 1rem;
	background: var(--ui-bg);
	border: 1px dashed var(--ui-border);
	border-radius: 0.5rem;
}

.empty-section.minimal {
	padding: 0.875rem 1rem;
}

.empty-section-icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-text-muted);
	opacity: 0.4;
}

.empty-section p {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin: 0;
	text-align: center;
}

.empty-section p strong {
	color: var(--ui-text);
	font-weight: 600;
}

/* Groups list */
.groups-list {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.prioritized-list {
	background: var(--ui-bg);
	border: 1px solid var(--ui-border-muted);
	border-radius: 0.5rem;
	padding: 0.25rem;
}

/* Group row */
.group-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.625rem;
	background: transparent;
	border-radius: 0.375rem;
	transition: all 0.15s ease;
	animation: fadeSlideIn 0.25s ease-out backwards;
	animation-delay: calc(var(--stagger, 0) * 30ms);
}

@keyframes fadeSlideIn {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.group-row.prioritized {
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border-muted);
}

.group-row.prioritized:hover {
	border-color: var(--ui-border);
}

.group-row.automatic {
	padding: 0.5rem 0.75rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border-muted);
	border-radius: 0.5rem;
}

.group-row.automatic:hover {
	background: var(--ui-bg-muted);
	border-color: var(--ui-border);
}

/* Drag handle */
.drag-handle {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.25rem;
	cursor: grab;
	flex-shrink: 0;
	opacity: 0.4;
	transition: opacity 0.15s ease;
}

.group-row:hover .drag-handle {
	opacity: 0.8;
}

.drag-handle:active {
	cursor: grabbing;
}

.grip-icon {
	width: 0.875rem;
	height: 0.875rem;
	color: var(--ui-text-muted);
}

/* Drag states */
.group-ghost {
	opacity: 0.3;
	background: var(--ui-primary-soft) !important;
	border-style: dashed !important;
}

.group-drag {
	background: var(--ui-bg-elevated) !important;
	box-shadow:
		0 8px 24px -4px rgba(0, 0, 0, 0.12),
		0 4px 8px -2px rgba(0, 0, 0, 0.08);
	border-color: var(--ui-primary) !important;
	z-index: 100;
}

/* Group rank */
.group-rank {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.375rem;
	height: 1.375rem;
	flex-shrink: 0;
}

.rank-number {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.375rem;
	height: 1.375rem;
	font-size: 0.6875rem;
	font-weight: 700;
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
	border-radius: 0.25rem;
}

/* Group info */
.group-info {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 0.625rem;
	min-width: 0;
}

.group-name {
	flex: 1;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.group-meta {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	flex-shrink: 0;
}

.meta-icon {
	width: 0.75rem;
	height: 0.75rem;
	opacity: 0.7;
}

/* Group actions */
.group-actions {
	display: flex;
	gap: 0.25rem;
	flex-shrink: 0;
}

.action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.5rem;
	height: 1.5rem;
	background: transparent;
	border: 1px solid transparent;
	border-radius: 0.25rem;
	cursor: pointer;
	opacity: 0.5;
	transition: all 0.15s ease;
}

.group-row:hover .action-btn {
	opacity: 1;
	background: var(--ui-bg-muted);
	border-color: var(--ui-border-muted);
}

.action-btn:disabled {
	opacity: 0.2 !important;
	cursor: not-allowed;
}

.action-btn.add:hover:not(:disabled) {
	background: var(--ui-primary-soft);
	border-color: color-mix(in oklch, var(--ui-primary) 30%, transparent);
	transform: scale(1.05);
}

.action-btn.add:hover:not(:disabled) .action-icon {
	color: var(--ui-primary);
}

.action-btn.add:active:not(:disabled) {
	transform: scale(0.95);
}

.action-btn.remove:hover:not(:disabled) {
	background: var(--ui-error-soft);
	border-color: color-mix(in oklch, var(--ui-error) 30%, transparent);
	transform: scale(1.05);
}

.action-btn.remove:hover:not(:disabled) .action-icon {
	color: var(--ui-error);
}

.action-btn.remove:active:not(:disabled) {
	transform: scale(0.95);
}

.action-icon {
	width: 0.75rem;
	height: 0.75rem;
	color: var(--ui-text-muted);
	transition: color 0.15s ease;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
