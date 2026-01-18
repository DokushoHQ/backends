<script setup lang="ts">
import { useImportWizardInjected } from "~/composables/useImportWizard"

const wizard = useImportWizardInjected()

const categoryItems = computed(() => {
	if (!wizard.tmbResults.value) return [[]]

	const items = [
		{
			label: "All Categories",
			onSelect: () => { wizard.tmbSelectedCategory.value = null },
		},
		...wizard.tmbResults.value.categories.map(c => ({
			label: `${c.name} (${c.count})`,
			onSelect: () => { wizard.tmbSelectedCategory.value = c.id },
		})),
	]
	return [items]
})

const selectedCategoryLabel = computed(() => {
	if (wizard.tmbSelectedCategory.value === null) return "All Categories"
	const category = wizard.tmbResults.value?.categories.find(
		c => c.id === wizard.tmbSelectedCategory.value,
	)
	return category ? `${category.name} (${category.count})` : "All Categories"
})

// Count stats for current filter
const filteredStats = computed(() => {
	const manga = wizard.tmbFilteredManga.value
	return {
		total: manga.length,
		mapped: manga.filter(m => m.mapped && !m.alreadyImported).length,
		unmapped: manga.filter(m => !m.mapped).length,
		alreadyImported: manga.filter(m => m.alreadyImported).length,
		selected: manga.filter(m => m.selected).length,
	}
})
</script>

<template>
	<div class="h-full flex flex-col min-h-0">
		<!-- Header -->
		<div class="flex-shrink-0 mb-4">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h3 class="text-lg font-semibold">
						Select Manga to Import
					</h3>
					<p class="text-sm text-muted-foreground">
						{{ wizard.tmbResults.value?.stats.total ?? 0 }} manga found in backup
					</p>
				</div>

				<!-- Stats Badges -->
				<div class="flex items-center gap-2">
					<UBadge
						color="success"
						variant="subtle"
					>
						{{ wizard.tmbResults.value?.stats.mapped ?? 0 }} mapped
					</UBadge>
					<UBadge
						color="warning"
						variant="subtle"
					>
						{{ wizard.tmbResults.value?.stats.unmapped ?? 0 }} unmapped
					</UBadge>
					<UBadge variant="subtle">
						{{ wizard.tmbResults.value?.stats.alreadyImported ?? 0 }} imported
					</UBadge>
				</div>
			</div>

			<!-- Filter Row -->
			<div class="flex items-center gap-3">
				<!-- Category Filter -->
				<UDropdownMenu :items="categoryItems">
					<UButton
						variant="outline"
						:label="selectedCategoryLabel"
						trailing-icon="i-lucide-chevron-down"
					/>
				</UDropdownMenu>

				<!-- Select All / Deselect All -->
				<div class="flex items-center gap-2 ml-auto">
					<UButton
						variant="ghost"
						size="sm"
						:disabled="filteredStats.mapped === 0"
						@click="wizard.selectAllTmbManga()"
					>
						Select All
					</UButton>
					<UButton
						variant="ghost"
						size="sm"
						:disabled="filteredStats.selected === 0"
						@click="wizard.deselectAllTmbManga()"
					>
						Deselect All
					</UButton>
				</div>
			</div>
		</div>

		<!-- Manga List -->
		<div class="flex-1 overflow-y-auto min-h-0 border border-border rounded-lg">
			<div
				v-if="wizard.tmbFilteredManga.value.length === 0"
				class="flex items-center justify-center h-full text-muted-foreground"
			>
				<div class="text-center">
					<UIcon
						name="i-lucide-inbox"
						class="w-12 h-12 mx-auto mb-2 opacity-50"
					/>
					<p>No manga in this category</p>
				</div>
			</div>

			<div
				v-else
				class="divide-y divide-border"
			>
				<div
					v-for="manga in wizard.tmbFilteredManga.value"
					:key="manga.id"
					class="p-3 flex items-center gap-3"
					:class="[
						manga.mapped && !manga.alreadyImported
							? 'hover:bg-muted/50 cursor-pointer'
							: 'bg-muted/20',
					]"
					@click="manga.mapped && !manga.alreadyImported && wizard.toggleTmbMangaSelection(manga.id)"
				>
					<!-- Checkbox / Status Icon -->
					<div class="flex-shrink-0 w-6">
						<UCheckbox
							v-if="manga.mapped && !manga.alreadyImported"
							:model-value="manga.selected"
							@click.stop
							@update:model-value="wizard.toggleTmbMangaSelection(manga.id)"
						/>
						<UIcon
							v-else-if="manga.alreadyImported"
							name="i-lucide-check-circle"
							class="w-5 h-5 text-muted-foreground"
						/>
						<UIcon
							v-else
							name="i-lucide-alert-triangle"
							class="w-5 h-5 text-amber-500"
						/>
					</div>

					<!-- Title and Source Info -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<span
								class="text-sm font-medium truncate"
								:class="manga.alreadyImported ? 'text-muted-foreground' : ''"
							>
								{{ manga.title }}
							</span>
						</div>
						<div class="text-xs text-muted-foreground truncate">
							<template v-if="manga.mapped">
								{{ manga.sourceName }}
							</template>
							<template v-else>
								{{ manga.backupSourceName }} (not supported)
							</template>
						</div>
					</div>

					<!-- Status Badge -->
					<div class="flex-shrink-0">
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

					<!-- Categories -->
					<div
						v-if="manga.categories.length > 0"
						class="hidden lg:flex items-center gap-1 flex-shrink-0"
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
							class="text-xs text-muted-foreground"
						>
							+{{ manga.categories.length - 2 }}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="flex-shrink-0 pt-4 border-t border-border flex justify-between items-center mt-4">
			<UButton
				variant="outline"
				@click="wizard.goToStep('tmb-upload')"
			>
				<UIcon
					name="i-lucide-arrow-left"
					class="w-4 h-4 mr-2"
				/>
				Back
			</UButton>

			<div class="flex items-center gap-3">
				<span
					v-if="wizard.tmbSelectedCount.value > 0"
					class="text-sm text-muted-foreground"
				>
					{{ wizard.tmbSelectedCount.value }} selected
				</span>
				<UButton
					:disabled="wizard.tmbImportableManga.value.length === 0"
					:loading="wizard.tmbAddingToCart.value"
					@click="wizard.addTmbToCart()"
				>
					<UIcon
						name="i-lucide-plus"
						class="w-4 h-4 mr-2"
					/>
					Add to Selection
				</UButton>
			</div>
		</div>
	</div>
</template>
