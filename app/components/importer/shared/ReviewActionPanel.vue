<script setup lang="ts">
import type { SelectedSerie } from "~/composables/useImportWizard"

const props = defineProps<{
	serie: SelectedSerie | null
	hasSelection: boolean
}>()

const emit = defineEmits<{
	setAction: [action: "import" | "link", linkToSerieId?: string, linkToSerieTitle?: string, linkToSerieCover?: string | null]
	remove: []
	openLibrarySearch: []
}>()

const showMoreMatches = ref(false)

const topMatch = computed(() => props.serie?.similarMatches?.[0])
const additionalMatches = computed(() => props.serie?.similarMatches?.slice(1) || [])
const hasMatches = computed(() => (props.serie?.similarMatches?.length || 0) > 0)

function handleActionChange(value: string) {
	if (value === "import") {
		emit("setAction", "import")
	}
	else if (value === "link-other") {
		emit("openLibrarySearch")
	}
	else if (value.startsWith("link:")) {
		const serieId = value.replace("link:", "")
		// Find the match to get its title and cover
		const match = props.serie?.similarMatches?.find(m => m.serieId === serieId)
		emit("setAction", "link", serieId, match?.title, match?.cover)
	}
}

const selectedValue = computed(() => {
	if (!props.serie?.action) return undefined
	if (props.serie.action === "import") return "import"
	if (props.serie.action === "link" && props.serie.linkToSerieId) {
		const isKnownMatch = props.serie.similarMatches?.some(m => m.serieId === props.serie?.linkToSerieId)
		if (isKnownMatch) {
			return `link:${props.serie.linkToSerieId}`
		}
		return "link-other"
	}
	return undefined
})

const radioGroupName = computed(() => props.serie ? `panel-action-${props.serie.sourceId}-${props.serie.externalId}` : "panel-action")

// Check if action is complete (import, or link with linkToSerieId)
const isActionComplete = computed(() => {
	if (props.serie?.action === "import") return true
	if (props.serie?.action === "link" && props.serie.linkToSerieId) return true
	return false
})

// Reset showMoreMatches when serie changes
watch(() => props.serie?.externalId, () => {
	showMoreMatches.value = false
})
</script>

<template>
	<div class="h-full flex flex-col min-h-0 bg-background">
		<!-- Empty state -->
		<div
			v-if="!hasSelection"
			class="flex-1 flex items-center justify-center text-muted-foreground p-4"
		>
			<div class="text-center">
				<UIcon
					name="i-lucide-mouse-pointer-click"
					class="w-10 h-10 mx-auto mb-3 opacity-50"
				/>
				<p class="text-sm">
					Select a series to configure
				</p>
			</div>
		</div>

		<!-- Loading -->
		<div
			v-else-if="serie?.loadingSimilarity"
			class="flex-1 flex items-center justify-center"
		>
			<div class="text-center">
				<UIcon
					name="i-lucide-loader-2"
					class="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2"
				/>
				<p class="text-sm text-muted-foreground">
					Checking for duplicates...
				</p>
			</div>
		</div>

		<!-- Content -->
		<template v-else-if="serie">
			<div class="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
				<!-- Cover -->
				<div class="aspect-[2/3] max-w-[140px] mx-auto rounded-lg overflow-hidden bg-muted">
					<img
						v-if="serie.cover"
						:src="serie.cover"
						:alt="serie.title"
						class="w-full h-full object-cover"
						referrerpolicy="no-referrer"
					>
					<div
						v-else
						class="w-full h-full flex items-center justify-center"
					>
						<UIcon
							name="i-lucide-image"
							class="w-10 h-10 text-muted-foreground"
						/>
					</div>
				</div>

				<!-- Title -->
				<div class="text-center">
					<h4 class="font-bold">
						{{ serie.title }}
					</h4>
					<p class="text-sm text-muted-foreground">
						{{ serie.sourceName }}
					</p>
				</div>

				<!-- Status -->
				<div
					v-if="hasMatches"
					class="flex items-center justify-center gap-1.5 text-sm text-warning"
				>
					<UIcon
						name="i-lucide-alert-triangle"
						class="w-4 h-4"
					/>
					Similar series found in library
				</div>
				<div
					v-else
					class="flex items-center justify-center gap-1.5 text-sm text-success"
				>
					<UIcon
						name="i-lucide-check-circle"
						class="w-4 h-4"
					/>
					No duplicates found
				</div>

				<!-- Action Options -->
				<div class="space-y-3 pt-2">
					<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
						Choose action
					</p>

					<!-- Import as new -->
					<label class="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
						<input
							type="radio"
							:name="radioGroupName"
							value="import"
							:checked="selectedValue === 'import'"
							class="w-4 h-4"
							@change="handleActionChange('import')"
						>
						<div class="flex-1">
							<span class="text-sm font-medium">
								Import as new series
							</span>
							<p class="text-xs text-muted-foreground">
								Create a new entry in your library
							</p>
						</div>
					</label>

					<!-- Top match -->
					<label
						v-if="topMatch"
						class="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
					>
						<input
							type="radio"
							:name="radioGroupName"
							:value="`link:${topMatch.serieId}`"
							:checked="selectedValue === `link:${topMatch.serieId}`"
							class="w-4 h-4"
							@change="handleActionChange(`link:${topMatch.serieId}`)"
						>
						<div class="flex-1 min-w-0">
							<span class="text-sm font-medium">
								Link to existing
							</span>
							<p class="text-xs text-muted-foreground truncate">
								{{ topMatch.title }}
								<span class="text-primary ml-1">{{ Math.round(topMatch.similarity * 100) }}% match</span>
							</p>
						</div>
					</label>

					<!-- Show more matches -->
					<button
						v-if="additionalMatches.length > 0 && !showMoreMatches"
						class="text-xs text-primary hover:underline pl-1"
						@click="showMoreMatches = true"
					>
						Show {{ additionalMatches.length }} more matches
					</button>

					<!-- Additional matches -->
					<template v-if="showMoreMatches">
						<label
							v-for="match in additionalMatches"
							:key="match.serieId"
							class="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
						>
							<input
								type="radio"
								:name="radioGroupName"
								:value="`link:${match.serieId}`"
								:checked="selectedValue === `link:${match.serieId}`"
								class="w-4 h-4"
								@change="handleActionChange(`link:${match.serieId}`)"
							>
							<div class="flex-1 min-w-0">
								<span class="text-sm font-medium">
									Link to existing
								</span>
								<p class="text-xs text-muted-foreground truncate">
									{{ match.title }}
									<span class="text-primary ml-1">{{ Math.round(match.similarity * 100) }}% match</span>
								</p>
							</div>
						</label>
					</template>

					<!-- Link to other -->
					<label class="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
						<input
							type="radio"
							:name="radioGroupName"
							value="link-other"
							:checked="selectedValue === 'link-other'"
							class="w-4 h-4"
							@change="handleActionChange('link-other')"
						>
						<div class="flex-1">
							<span class="text-sm font-medium">
								Link to other series
							</span>
							<button
								class="text-xs text-primary hover:underline block"
								@click.prevent="emit('openLibrarySearch')"
							>
								Search your library...
							</button>
						</div>
					</label>

					<!-- Validation error -->
					<div
						v-if="!isActionComplete"
						class="flex items-center gap-1.5 text-sm text-destructive"
					>
						<UIcon
							name="i-lucide-x-circle"
							class="w-4 h-4"
						/>
						{{ serie.action === 'link' && !serie.linkToSerieId ? 'Please select a series to link' : 'Please select an option' }}
					</div>

					<!-- Linked serie preview -->
					<div
						v-if="serie.action === 'link' && serie.linkToSerieId && serie.linkToSerieTitle"
						class="mt-4 p-3 rounded-lg border border-border bg-muted/30"
					>
						<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
							Will link to
						</p>
						<div class="flex items-center gap-3">
							<div class="flex-shrink-0 w-10 h-14 rounded overflow-hidden bg-muted">
								<img
									v-if="serie.linkToSerieCover"
									:src="serie.linkToSerieCover"
									:alt="serie.linkToSerieTitle"
									class="w-full h-full object-cover"
									referrerpolicy="no-referrer"
								>
								<div
									v-else
									class="w-full h-full flex items-center justify-center"
								>
									<UIcon
										name="i-lucide-book-open"
										class="w-4 h-4 text-muted-foreground"
									/>
								</div>
							</div>
							<div class="flex-1 min-w-0">
								<p class="font-medium text-sm truncate">
									{{ serie.linkToSerieTitle }}
								</p>
								<button
									class="text-xs text-primary hover:underline"
									@click="emit('openLibrarySearch')"
								>
									Change...
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex-shrink-0 p-4 border-t border-border">
				<UButton
					class="w-full"
					variant="outline"
					color="error"
					@click="emit('remove')"
				>
					<UIcon
						name="i-lucide-trash-2"
						class="w-4 h-4 mr-2"
					/>
					Remove from selection
				</UButton>
			</div>
		</template>
	</div>
</template>
