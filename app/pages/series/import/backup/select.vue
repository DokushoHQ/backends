<script setup lang="ts">
definePageMeta({
	layout: "default",
	middleware: "import-guard",
})

const router = useRouter()
const cart = useImportCart()
const backup = useImportBackup()

// Redirect if no backup results
onMounted(() => {
	cart.hydrateFromStorage()
	if (!backup.backupResults.value) {
		router.replace("/series/import/backup")
	}
})

const categoryItems = computed(() => {
	if (!backup.backupResults.value) return [[]]

	const items = [
		{
			label: "All Categories",
			onSelect: () => { backup.backupSelectedCategory.value = null },
		},
		...backup.backupResults.value.categories.map(c => ({
			label: `${c.name} (${c.count})`,
			onSelect: () => { backup.backupSelectedCategory.value = c.id },
		})),
	]
	return [items]
})

const selectedCategoryLabel = computed(() => {
	if (backup.backupSelectedCategory.value === null) return "All Categories"
	const category = backup.backupResults.value?.categories.find(
		c => c.id === backup.backupSelectedCategory.value,
	)
	return category ? `${category.name} (${category.count})` : "All Categories"
})

// Count stats for current filter
const filteredStats = computed(() => {
	const manga = backup.backupFilteredManga.value
	return {
		total: manga.length,
		mapped: manga.filter(m => m.mapped && !m.alreadyImported).length,
		unmapped: manga.filter(m => !m.mapped).length,
		alreadyImported: manga.filter(m => m.alreadyImported).length,
		selected: manga.filter(m => m.selected).length,
	}
})

async function handleAddToCart() {
	await backup.addBackupToCart()
	router.push("/series/import/review")
}
</script>

<template>
	<div class="select-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UiPageHeader
					title="Select Manga"
					description="Choose manga to import"
					back-to="/series/import/backup"
				>
					<template #right>
						<ImporterSharedCartBadge
							v-if="cart.cartCount.value > 0"
							:count="cart.cartCount.value"
							@click="router.push('/series/import/review')"
						/>
					</template>
				</UiPageHeader>
			</template>

			<template #body>
				<!-- Header -->
				<div class="select-header">
					<div class="header-info">
						<h3 class="header-title">
							Select Manga to Import
						</h3>
						<p class="header-subtitle">
							{{ backup.backupResults.value?.stats.total ?? 0 }} manga found in backup
						</p>
					</div>

					<!-- Stats Badges -->
					<div class="header-stats">
						<UBadge
							color="success"
							variant="subtle"
						>
							{{ backup.backupResults.value?.stats.mapped ?? 0 }} mapped
						</UBadge>
						<UBadge
							color="warning"
							variant="subtle"
						>
							{{ backup.backupResults.value?.stats.unmapped ?? 0 }} unmapped
						</UBadge>
						<UBadge variant="subtle">
							{{ backup.backupResults.value?.stats.alreadyImported ?? 0 }} imported
						</UBadge>
					</div>
				</div>

				<!-- Filter Row -->
				<div class="filter-row">
					<!-- Category Filter -->
					<UDropdownMenu :items="categoryItems">
						<UButton
							variant="outline"
							:label="selectedCategoryLabel"
							trailing-icon="i-lucide-chevron-down"
						/>
					</UDropdownMenu>

					<!-- Select All / Deselect All -->
					<div class="filter-actions">
						<UButton
							variant="ghost"
							size="sm"
							:disabled="filteredStats.mapped === 0"
							@click="backup.selectAllBackupManga()"
						>
							Select All
						</UButton>
						<UButton
							variant="ghost"
							size="sm"
							:disabled="filteredStats.selected === 0"
							@click="backup.deselectAllBackupManga()"
						>
							Deselect All
						</UButton>
					</div>
				</div>

				<!-- Manga List -->
				<div class="manga-list">
					<!-- Empty State -->
					<div
						v-if="backup.backupFilteredManga.value.length === 0"
						class="empty-state"
					>
						<UIcon
							name="i-lucide-inbox"
							class="empty-icon"
						/>
						<p class="empty-text">
							No manga in this category
						</p>
					</div>

					<!-- List Items -->
					<div
						v-else
						class="manga-items"
					>
						<div
							v-for="manga in backup.backupFilteredManga.value"
							:key="manga.id"
							class="manga-item"
							:class="{
								'manga-item--selectable': manga.mapped && !manga.alreadyImported,
								'manga-item--disabled': !manga.mapped || manga.alreadyImported,
							}"
							@click="manga.mapped && !manga.alreadyImported && backup.toggleBackupMangaSelection(manga.id)"
						>
							<!-- Checkbox / Status Icon -->
							<div class="manga-checkbox">
								<UCheckbox
									v-if="manga.mapped && !manga.alreadyImported"
									:model-value="manga.selected"
									@click.stop
									@update:model-value="backup.toggleBackupMangaSelection(manga.id)"
								/>
								<UIcon
									v-else-if="manga.alreadyImported"
									name="i-lucide-check-circle"
									class="status-icon status-icon--imported"
								/>
								<UIcon
									v-else
									name="i-lucide-alert-triangle"
									class="status-icon status-icon--unmapped"
								/>
							</div>

							<!-- Title and Source Info -->
							<div class="manga-info">
								<span
									class="manga-title"
									:class="{ 'manga-title--muted': manga.alreadyImported }"
								>
									{{ manga.title }}
								</span>
								<span class="manga-source">
									<template v-if="manga.mapped">
										{{ manga.sourceName }}
									</template>
									<template v-else>
										{{ manga.backupSourceName }} (not supported)
									</template>
								</span>
							</div>

							<!-- Status Badge -->
							<div class="manga-status">
								<UBadge
									v-if="manga.alreadyImported"
									variant="subtle"
									size="xs"
								>
									Already Imported
								</UBadge>
								<UBadge
									v-else-if="manga.mapped"
									color="success"
									variant="subtle"
									size="xs"
								>
									Mapped
								</UBadge>
								<UBadge
									v-else
									color="warning"
									variant="subtle"
									size="xs"
								>
									Unmapped
								</UBadge>
							</div>

							<!-- Categories (desktop only) -->
							<div
								v-if="manga.categories.length > 0"
								class="manga-categories"
							>
								<UBadge
									v-for="cat in manga.categories.slice(0, 2)"
									:key="cat"
									variant="outline"
									size="xs"
								>
									{{ cat }}
								</UBadge>
								<span
									v-if="manga.categories.length > 2"
									class="manga-categories-more"
								>
									+{{ manga.categories.length - 2 }}
								</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="select-footer">
					<div class="footer-actions">
						<span
							v-if="backup.backupSelectedCount.value > 0"
							class="selected-count"
						>
							{{ backup.backupSelectedCount.value }} selected
						</span>
						<UButton
							:disabled="backup.backupImportableManga.value.length === 0"
							:loading="backup.backupAddingToCart.value"
							@click="handleAddToCart"
						>
							<UIcon
								name="i-lucide-plus"
								class="w-4 h-4 mr-2"
							/>
							Add to Selection
						</UButton>
					</div>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
/* Header */
.select-header {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	gap: 1rem;
	margin-bottom: 1rem;
}

@media (min-width: 768px) {
	.select-header {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
	}
}

.header-info {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.header-title {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
}

.header-subtitle {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0;
}

.header-stats {
	display: flex;
	gap: 0.5rem;
	flex-wrap: wrap;
}

/* Filter Row */
.filter-row {
	flex-shrink: 0;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.75rem;
	margin-bottom: 1rem;
}

.filter-actions {
	display: flex;
	gap: 0.5rem;
	margin-left: auto;
}

/* Manga List */
.manga-list {
	flex: 1;
	overflow-y: auto;
	min-height: 0;
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	background: var(--ui-bg-elevated);
}

/* Empty State */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	min-height: 12rem;
	text-align: center;
}

.empty-icon {
	width: 3rem;
	height: 3rem;
	color: var(--ui-text-dimmed);
	opacity: 0.5;
	margin-bottom: 0.5rem;
}

.empty-text {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0;
}

/* Manga Items */
.manga-items {
	display: flex;
	flex-direction: column;
}

.manga-item {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	border-bottom: 1px solid var(--ui-border);
}

.manga-item:last-child {
	border-bottom: none;
}

.manga-item--selectable {
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.manga-item--selectable:hover {
	background: var(--ui-bg-muted);
}

.manga-item--disabled {
	background: color-mix(in oklch, var(--ui-bg-muted) 50%, transparent);
}

/* Manga Checkbox */
.manga-checkbox {
	flex-shrink: 0;
	width: 1.5rem;
	display: flex;
	align-items: center;
	justify-content: center;
}

.status-icon {
	width: 1.25rem;
	height: 1.25rem;
}

.status-icon--imported {
	color: var(--ui-text-muted);
}

.status-icon--unmapped {
	color: var(--ui-warning);
}

/* Manga Info */
.manga-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
}

.manga-title {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.manga-title--muted {
	color: var(--ui-text-muted);
}

.manga-source {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Manga Status */
.manga-status {
	flex-shrink: 0;
}

/* Manga Categories */
.manga-categories {
	display: none;
	align-items: center;
	gap: 0.25rem;
	flex-shrink: 0;
}

@media (min-width: 1024px) {
	.manga-categories {
		display: flex;
	}
}

.manga-categories-more {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

/* Footer */
.select-footer {
	flex-shrink: 0;
	display: flex;
	justify-content: flex-end;
	align-items: center;
	padding-top: 1rem;
	margin-top: 1rem;
	border-top: 1px solid var(--ui-border);
}

.footer-actions {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.selected-count {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}
</style>
