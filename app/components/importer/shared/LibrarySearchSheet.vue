<script setup lang="ts">
import type { RecentSerie } from "~/composables/useImportWizard"

const open = defineModel<boolean>("open", { default: false })

defineProps<{
	searchQuery: string
	searchResults: RecentSerie[]
	recentSeries: RecentSerie[]
	loadingSearch: boolean
	loadingRecent: boolean
}>()

const emit = defineEmits<{
	"update:searchQuery": [value: string]
	"search": [query: string]
	"select": [serieId: string, serieTitle: string, serieCover: string | null]
	"close": []
}>()

const localQuery = ref("")
const searchTimeout = ref<NodeJS.Timeout | null>(null)

function handleInput(value: string) {
	localQuery.value = value
	emit("update:searchQuery", value)

	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value)
	}
	searchTimeout.value = setTimeout(() => {
		emit("search", value)
	}, 300)
}

watch(open, (isOpen) => {
	if (!isOpen) {
		localQuery.value = ""
		if (searchTimeout.value) {
			clearTimeout(searchTimeout.value)
		}
	}
})
</script>

<template>
	<USlideover
		v-model:open="open"
		side="right"
		:ui="{ content: 'sm:max-w-md' }"
	>
		<template #content>
			<div class="flex flex-col h-full">
				<!-- Header -->
				<div class="flex items-center justify-between p-4 border-b border-border">
					<h3 class="text-lg font-semibold">
						Link to Existing
					</h3>
					<UButton
						icon="i-lucide-x"
						variant="ghost"
						size="sm"
						@click="emit('close')"
					/>
				</div>

				<!-- Search -->
				<div class="p-4 border-b border-border">
					<UInput
						:model-value="localQuery"
						placeholder="Search your library..."
						icon="i-lucide-search"
						@update:model-value="handleInput"
					/>
				</div>

				<!-- Content -->
				<div class="flex-1 overflow-y-auto">
					<!-- Search Results -->
					<div v-if="localQuery.trim()">
						<div
							v-if="loadingSearch"
							class="flex justify-center py-8"
						>
							<UIcon
								name="i-lucide-loader-2"
								class="w-6 h-6 animate-spin text-muted-foreground"
							/>
						</div>
						<div
							v-else-if="searchResults.length === 0"
							class="text-center py-8 text-muted-foreground"
						>
							No results found
						</div>
						<div
							v-else
							class="divide-y divide-border"
						>
							<button
								v-for="serie in searchResults"
								:key="serie.id"
								class="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
								@click="emit('select', serie.id, serie.title, serie.cover)"
							>
								<div class="flex-shrink-0 w-10 h-14 rounded overflow-hidden bg-muted">
									<NuxtImg
										v-if="serie.cover"
										:src="serie.cover"
										:alt="serie.title"
										class="w-full h-full object-cover"
									/>
								</div>
								<div class="flex-1 min-w-0">
									<div class="font-medium truncate">
										{{ serie.title }}
									</div>
									<div class="text-xs text-muted-foreground">
										{{ serie.sources.join(', ') }}
									</div>
								</div>
								<UButton
									size="xs"
									variant="outline"
								>
									Select
								</UButton>
							</button>
						</div>
					</div>

					<!-- Recent Series -->
					<div v-else>
						<div class="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/50">
							Recently Imported
						</div>
						<div
							v-if="loadingRecent"
							class="flex justify-center py-8"
						>
							<UIcon
								name="i-lucide-loader-2"
								class="w-6 h-6 animate-spin text-muted-foreground"
							/>
						</div>
						<div
							v-else-if="recentSeries.length === 0"
							class="text-center py-8 text-muted-foreground"
						>
							No recent imports
						</div>
						<div
							v-else
							class="divide-y divide-border"
						>
							<button
								v-for="serie in recentSeries"
								:key="serie.id"
								class="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
								@click="emit('select', serie.id, serie.title, serie.cover)"
							>
								<div class="flex-shrink-0 w-10 h-14 rounded overflow-hidden bg-muted">
									<NuxtImg
										v-if="serie.cover"
										:src="serie.cover"
										:alt="serie.title"
										class="w-full h-full object-cover"
									/>
								</div>
								<div class="flex-1 min-w-0">
									<div class="font-medium truncate">
										{{ serie.title }}
									</div>
									<div class="text-xs text-muted-foreground">
										{{ serie.sources.join(', ') }} &bull; {{ serie.chapterCount }} chapters
									</div>
								</div>
								<UButton
									size="xs"
									variant="outline"
								>
									Select
								</UButton>
							</button>
						</div>
					</div>
				</div>
			</div>
		</template>
	</USlideover>
</template>
