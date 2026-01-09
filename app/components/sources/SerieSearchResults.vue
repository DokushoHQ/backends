<script setup lang="ts">
import type { SearchResult } from "~/composables/useSourceBrowser"

const props = defineProps<{
	results: SearchResult[]
	selectedId: string | null
	searching: boolean
	hasMore: boolean
	// Optional: for tracking additional imported IDs (e.g., just-imported items)
	additionalImportedIds?: Set<string>
	// Optional: current serie ID for link mode to show "Already Linked"
	currentSerieId?: string
}>()

const emit = defineEmits<{
	select: [serieId: string]
	navigate: [serieId: string]
	loadMore: []
}>()

function isImported(serie: SearchResult) {
	return serie.imported || props.additionalImportedIds?.has(serie.id)
}

function handleClick(serie: SearchResult) {
	// If imported and has a serieId, navigate to it
	if (isImported(serie) && serie.serieId) {
		// In link mode, if it's a different serie, don't allow selection
		if (props.currentSerieId && serie.serieId !== props.currentSerieId) {
			return
		}
		emit("navigate", serie.serieId)
	}
	else {
		emit("select", serie.id)
	}
}

function isDisabled(serie: SearchResult) {
	// In link mode, disable if imported to a different serie
	if (props.currentSerieId && serie.imported && serie.serieId !== props.currentSerieId) {
		return true
	}
	return false
}

function getBadgeInfo(serie: SearchResult): { text: string, variant: "subtle" | "outline", class?: string } | null {
	if (props.currentSerieId) {
		// Link mode
		if (serie.serieId === props.currentSerieId) {
			return { text: "Already Linked", variant: "subtle" }
		}
		if (serie.imported) {
			return { text: "Different Serie", variant: "outline", class: "text-orange-600 border-orange-300" }
		}
	}
	else {
		// Import mode
		if (isImported(serie)) {
			return { text: "In Library", variant: "subtle" }
		}
	}
	return null
}
</script>

<template>
	<div class="h-full overflow-y-auto">
		<p
			v-if="results.length === 0 && !searching"
			class="text-sm text-muted-foreground text-center py-8"
		>
			No series found
		</p>
		<div
			v-else
			class="space-y-2 pr-2"
		>
			<button
				v-for="serie in results"
				:key="serie.id"
				type="button"
				:disabled="isDisabled(serie)"
				class="w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-colors"
				:class="[
					selectedId === serie.id
						? 'border-primary bg-primary/5'
						: isDisabled(serie)
							? 'opacity-50 cursor-not-allowed'
							: 'hover:bg-muted/50 cursor-pointer',
				]"
				@click="handleClick(serie)"
			>
				<div class="h-20 w-14 bg-muted rounded overflow-hidden shrink-0">
					<img
						v-if="serie.cover"
						:src="serie.cover"
						:alt="serie.title"
						class="h-full w-full object-cover"
					>
					<div
						v-else
						class="h-full w-full flex items-center justify-center"
					>
						<UIcon
							name="i-lucide-book-open"
							class="h-6 w-6 text-muted-foreground"
						/>
					</div>
				</div>
				<div class="flex-1 min-w-0">
					<p class="font-medium text-sm line-clamp-2">
						{{ serie.title }}
					</p>
					<p class="text-xs text-muted-foreground mt-1 truncate">
						{{ serie.id }}
					</p>
				</div>
				<UBadge
					v-if="getBadgeInfo(serie)"
					:variant="getBadgeInfo(serie)!.variant"
					:class="getBadgeInfo(serie)!.class"
					class="shrink-0"
				>
					<UIcon
						v-if="getBadgeInfo(serie)!.text === 'In Library' || getBadgeInfo(serie)!.text === 'Already Linked'"
						name="i-lucide-check"
						class="h-3 w-3 mr-1"
					/>
					{{ getBadgeInfo(serie)!.text }}
				</UBadge>
			</button>

			<UButton
				v-if="hasMore"
				variant="outline"
				class="w-full"
				:disabled="searching"
				@click="emit('loadMore')"
			>
				<UIcon
					v-if="searching"
					name="i-lucide-loader-2"
					class="h-4 w-4 animate-spin"
				/>
				Load more
			</UButton>
		</div>
	</div>
</template>
