<script setup lang="ts">
import draggable from "vuedraggable"

definePageMeta({
	title: "Source Settings",
	layout: "default",
})

const toast = useToast()

type SourceItem = {
	id: string
	external_id: string
	name: string
	icon: string
	enabled: boolean
	priority: number
}

// Fetch all sources sorted by priority
const { data: fetchedSources, refresh, pending } = await useFetch<SourceItem[]>("/api/sources/settings", {
	default: () => [],
})

// Local copy for drag and drop manipulation
const sources = ref<SourceItem[]>([])

// Sync fetched data to local state
watch(fetchedSources, (newSources) => {
	sources.value = [...(newSources ?? [])]
}, { immediate: true })

// Filter state
const searchQuery = ref("")
const typeFilter = ref<"all" | "native" | "suwayomi">("all")

const typeOptions = [
	{ label: "All", value: "all" },
	{ label: "Native", value: "native" },
	{ label: "Suwayomi", value: "suwayomi" },
]

// Check if drag is allowed (only when no filters active)
const canDrag = computed(() => !searchQuery.value && typeFilter.value === "all")

// Computed filtered sources (for display only when filters active)
const displaySources = computed(() => {
	let result = sources.value

	// Apply search filter
	if (searchQuery.value) {
		const query = searchQuery.value.toLowerCase()
		result = result.filter(s => s.name.toLowerCase().includes(query))
	}

	// Apply type filter
	if (typeFilter.value !== "all") {
		result = result.filter((s) => {
			const isSuwayomi = s.external_id.startsWith("suwayomi-")
			return typeFilter.value === "suwayomi" ? isSuwayomi : !isSuwayomi
		})
	}

	return result
})

// Update source
async function updateSource(sourceId: string, update: { priority?: number, enabled?: boolean }) {
	try {
		await $fetch(`/api/v1/sources/${sourceId}`, {
			method: "PATCH",
			body: update,
		})
	}
	catch (err) {
		toast.add({
			title: "Update Failed",
			description: err instanceof Error ? err.message : "Failed to update source",
			color: "error",
		})
		throw err
	}
}

// Handle drag end - update priorities based on new order
async function onDragEnd() {
	// Update priorities based on new array positions
	const updates = sources.value.map((source, index) => ({
		id: source.id,
		newPriority: index + 1,
		oldPriority: source.priority,
	})).filter(u => u.newPriority !== u.oldPriority)

	if (updates.length === 0) return

	try {
		await Promise.all(
			updates.map(u => updateSource(u.id, { priority: u.newPriority })),
		)
		// Update local state with new priorities
		sources.value = sources.value.map((s, index) => ({
			...s,
			priority: index + 1,
		}))
	}
	catch {
		// Revert on error
		await refresh()
	}
}

// Toggle enabled
async function toggleEnabled(source: SourceItem) {
	const newEnabled = !source.enabled
	// Optimistic update
	source.enabled = newEnabled
	try {
		await updateSource(source.id, { enabled: newEnabled })
	}
	catch {
		// Revert on error
		source.enabled = !newEnabled
	}
}

// Get source type
function getSourceType(source: SourceItem): "native" | "suwayomi" {
	return source.external_id.startsWith("suwayomi-") ? "suwayomi" : "native"
}
</script>

<template>
	<div class="settings-page">
		<UDashboardPanel>
			<template #header>
				<UDashboardNavbar
					title="Source Settings"
					description="Configure global source priority and availability"
				>
					<template #left>
						<UButton
							variant="ghost"
							icon="i-lucide-arrow-left"
							to="/sources"
						/>
					</template>
				</UDashboardNavbar>
			</template>

			<template #body>
				<div class="page-content">
					<UiContentCard
						title="Source Priority"
						description="Drag to reorder. Priority determines fallback preference when filling chapter gaps."
						icon="i-lucide-list-ordered"
						color="blue"
					>
						<template #header-actions>
							<UInput
								v-model="searchQuery"
								placeholder="Search sources..."
								icon="i-lucide-search"
								size="sm"
								class="search-input"
							/>
						</template>

						<div class="source-list-container">
							<!-- Filter tabs -->
							<div class="filter-row">
								<UiSegmentedControl
									v-model="typeFilter"
									:options="typeOptions"
								/>
								<span
									v-if="!canDrag"
									class="drag-disabled-hint"
								>
									Clear filters to reorder
								</span>
							</div>

							<!-- Loading state -->
							<div
								v-if="pending && !sources.length"
								class="loading-state"
							>
								<UIcon
									name="i-lucide-loader-2"
									class="loading-spinner"
								/>
							</div>

							<!-- Empty state -->
							<div
								v-else-if="!displaySources.length"
								class="empty-state"
							>
								<p v-if="searchQuery || typeFilter !== 'all'">
									No sources match your filter
								</p>
								<p v-else>
									No sources configured
								</p>
							</div>

							<!-- Draggable source list (when no filters) -->
							<draggable
								v-else-if="canDrag"
								v-model="sources"
								item-key="id"
								handle=".drag-handle"
								ghost-class="source-ghost"
								drag-class="source-drag"
								class="source-list"
								@end="onDragEnd"
							>
								<template #item="{ element: source, index }">
									<div
										class="source-row"
										:class="{ disabled: !source.enabled }"
									>
										<div class="drag-handle">
											<UIcon
												name="i-lucide-grip-vertical"
												class="grip-icon"
											/>
										</div>

										<div class="source-rank">
											{{ index + 1 }}
										</div>

										<div class="source-icon">
											<img
												:src="source.icon"
												:alt="source.name"
												class="icon-img"
											>
										</div>

										<div class="source-info">
											<span class="source-name">{{ source.name }}</span>
											<UBadge
												:color="getSourceType(source) === 'native' ? 'primary' : 'warning'"
												variant="subtle"
												size="xs"
											>
												{{ getSourceType(source) === 'native' ? 'Native' : 'Suwayomi' }}
											</UBadge>
										</div>

										<div class="source-actions">
											<UBadge
												:color="source.enabled ? 'success' : 'neutral'"
												variant="subtle"
												size="sm"
												class="status-badge cursor-pointer"
												@click="toggleEnabled(source)"
											>
												{{ source.enabled ? 'Enabled' : 'Disabled' }}
											</UBadge>
										</div>
									</div>
								</template>
							</draggable>

							<!-- Static list (when filters active) -->
							<div
								v-else
								class="source-list"
							>
								<div
									v-for="source in displaySources"
									:key="source.id"
									class="source-row"
									:class="{ disabled: !source.enabled }"
								>
									<div class="drag-handle drag-disabled">
										<UIcon
											name="i-lucide-grip-vertical"
											class="grip-icon"
										/>
									</div>

									<div class="source-rank">
										{{ source.priority }}
									</div>

									<div class="source-icon">
										<img
											:src="source.icon"
											:alt="source.name"
											class="icon-img"
										>
									</div>

									<div class="source-info">
										<span class="source-name">{{ source.name }}</span>
										<UBadge
											:color="getSourceType(source) === 'native' ? 'primary' : 'warning'"
											variant="subtle"
											size="xs"
										>
											{{ getSourceType(source) === 'native' ? 'Native' : 'Suwayomi' }}
										</UBadge>
									</div>

									<div class="source-actions">
										<UBadge
											:color="source.enabled ? 'success' : 'neutral'"
											variant="subtle"
											size="sm"
											class="status-badge cursor-pointer"
											@click="toggleEnabled(source)"
										>
											{{ source.enabled ? 'Enabled' : 'Disabled' }}
										</UBadge>
									</div>
								</div>
							</div>
						</div>
					</UiContentCard>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
.settings-page {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
}

.page-content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.search-input {
	width: 200px;
}

@media (max-width: 640px) {
	.search-input {
		width: 150px;
	}
}

.source-list-container {
	display: flex;
	flex-direction: column;
}

.filter-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	border-bottom: 1px solid var(--ui-border);
}

.drag-disabled-hint {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	font-style: italic;
}

.source-list {
	display: flex;
	flex-direction: column;
	max-height: 500px;
	overflow-y: auto;
}

.source-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	border-bottom: 1px solid var(--ui-border);
	background: var(--ui-bg-elevated);
	transition: background 0.15s ease;
}

.source-row:last-child {
	border-bottom: none;
}

.source-row:hover {
	background: var(--ui-bg-muted);
}

.source-row.disabled {
	opacity: 0.5;
}

/* Drag handle */
.drag-handle {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.5rem;
	height: 1.5rem;
	cursor: grab;
	flex-shrink: 0;
}

.drag-handle:active {
	cursor: grabbing;
}

.drag-handle.drag-disabled {
	cursor: not-allowed;
	opacity: 0.3;
}

.grip-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
}

/* Drag states */
.source-ghost {
	opacity: 0.5;
	background: var(--ui-primary-soft);
}

.source-drag {
	background: var(--ui-bg-elevated);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	border-radius: 0.5rem;
}

.source-rank {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	border-radius: 0.375rem;
	flex-shrink: 0;
}

.source-icon {
	width: 2rem;
	height: 2rem;
	flex-shrink: 0;
}

.icon-img {
	width: 100%;
	height: 100%;
	object-fit: contain;
	border-radius: 0.25rem;
}

.source-info {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex: 1;
	min-width: 0;
}

.source-name {
	font-size: var(--font-size-base);
	font-weight: 500;
	color: var(--ui-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.source-actions {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	flex-shrink: 0;
}

.status-badge {
	min-width: 4.5rem;
	justify-content: center;
}

.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 3rem 1rem;
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

.empty-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 3rem 1rem;
}

.empty-state p {
	font-size: var(--font-size-base);
	color: var(--ui-text-muted);
}
</style>
