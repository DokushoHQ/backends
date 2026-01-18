<script setup lang="ts">
import type { SelectedSerie } from "~/composables/useImportWizard"

const props = defineProps<{
	serie: SelectedSerie
}>()

const emit = defineEmits<{
	setAction: [action: "import" | "link", linkToSerieId?: string, linkToSerieTitle?: string, linkToSerieCover?: string | null]
	remove: []
	openLibrarySearch: []
	setGroupPrimary: [cartKey: string]
}>()

const showMoreMatches = ref(false)

const topMatch = computed(() => props.serie.similarMatches?.[0])
const additionalMatches = computed(() => props.serie.similarMatches?.slice(1) || [])
const hasMatches = computed(() => (props.serie.similarMatches?.length || 0) > 0)
const hasCartDuplicates = computed(() => (props.serie.cartDuplicates?.length || 0) > 0)
const currentCartKey = computed(() => `${props.serie.sourceId}:${props.serie.externalId}`)

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
		const match = props.serie.similarMatches?.find(m => m.serieId === serieId)
		emit("setAction", "link", serieId, match?.title, match?.cover)
	}
}

const selectedValue = computed(() => {
	if (!props.serie.action) return undefined
	if (props.serie.action === "import") return "import"
	if (props.serie.action === "link" && props.serie.linkToSerieId) {
		// Check if it's one of the similar matches
		const isKnownMatch = props.serie.similarMatches?.some(m => m.serieId === props.serie.linkToSerieId)
		if (isKnownMatch) {
			return `link:${props.serie.linkToSerieId}`
		}
		return "link-other"
	}
	return undefined
})

// Unique radio group name per item
const radioGroupName = computed(() => `action-${props.serie.sourceId}-${props.serie.externalId}`)

// Check if action is complete (import, or link with linkToSerieId, or linkToCartKey set)
const isActionComplete = computed(() => {
	if (props.serie.action === "import") return true
	if (props.serie.action === "link" && props.serie.linkToSerieId) return true
	if (props.serie.linkToCartKey) return true // Linked to another cart item
	return false
})
</script>

<template>
	<div class="border border-border rounded-lg p-4 relative">
		<!-- Desktop: Horizontal layout / Mobile: Vertical layout -->
		<div class="flex flex-col md:flex-row md:items-start gap-4">
			<!-- Left: Serie Info -->
			<div class="flex items-start gap-3 md:w-64 md:flex-shrink-0">
				<!-- Cover -->
				<div class="flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-muted">
					<NuxtImg
						v-if="serie.cover"
						:src="serie.cover"
						:alt="serie.title"
						class="w-full h-full object-cover"
					/>
					<div
						v-else
						class="w-full h-full flex items-center justify-center"
					>
						<UIcon
							name="i-lucide-image"
							class="w-4 h-4 text-muted-foreground"
						/>
					</div>
				</div>

				<!-- Info -->
				<div class="flex-1 min-w-0">
					<div class="font-medium text-sm leading-tight">
						{{ serie.title }}
					</div>
					<div class="text-xs text-muted-foreground mt-0.5">
						{{ serie.sourceName }}
					</div>
					<!-- Status on desktop -->
					<div
						v-if="!serie.loadingSimilarity"
						class="hidden md:flex items-center gap-1 mt-2"
					>
						<template v-if="hasCartDuplicates">
							<UIcon
								name="i-lucide-copy"
								class="w-3.5 h-3.5 text-warning"
							/>
							<span class="text-xs text-warning">
								{{ serie.cartDuplicates!.length + 1 }} sources
							</span>
						</template>
						<template v-else-if="hasMatches">
							<UIcon
								name="i-lucide-alert-triangle"
								class="w-3.5 h-3.5 text-warning"
							/>
							<span class="text-xs text-warning">
								Similar found
							</span>
						</template>
						<template v-else>
							<UIcon
								name="i-lucide-check-circle"
								class="w-3.5 h-3.5 text-success"
							/>
							<span class="text-xs text-success">
								No duplicates
							</span>
						</template>
					</div>
					<!-- Primary badge on desktop -->
					<div
						v-if="serie.isPrimaryInGroup"
						class="hidden md:block mt-1"
					>
						<span class="px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-[10px] font-semibold">
							PRIMARY
						</span>
					</div>
				</div>
			</div>

			<!-- Middle: Action Selection -->
			<div class="flex-1 min-w-0">
				<!-- Loading -->
				<div
					v-if="serie.loadingSimilarity"
					class="flex items-center gap-2 text-sm text-muted-foreground"
				>
					<UIcon
						name="i-lucide-loader-2"
						class="w-4 h-4 animate-spin"
					/>
					Checking for similar series...
				</div>

				<div
					v-else
					class="space-y-1.5"
				>
					<!-- Status message (mobile only) -->
					<div
						v-if="hasCartDuplicates"
						class="flex md:hidden items-center gap-1.5 text-sm text-warning mb-2"
					>
						<UIcon
							name="i-lucide-copy"
							class="w-4 h-4"
						/>
						Same series from {{ serie.cartDuplicates!.length + 1 }} sources
						<span
							v-if="serie.isPrimaryInGroup"
							class="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-[10px] font-semibold"
						>
							PRIMARY
						</span>
					</div>
					<div
						v-else-if="hasMatches"
						class="flex md:hidden items-center gap-1.5 text-sm text-warning mb-2"
					>
						<UIcon
							name="i-lucide-alert-triangle"
							class="w-4 h-4"
						/>
						Similar series found
					</div>
					<div
						v-else
						class="flex md:hidden items-center gap-1.5 text-sm text-success mb-2"
					>
						<UIcon
							name="i-lucide-check-circle"
							class="w-4 h-4"
						/>
						No similar series found
					</div>

					<!-- Cart duplicates: Primary selection (replaces action options) -->
					<div
						v-if="hasCartDuplicates"
						class="space-y-2"
					>
						<p class="text-xs text-muted-foreground">
							Select the primary source for this series:
						</p>

						<!-- Current item as primary option -->
						<label class="flex items-center gap-2 cursor-pointer p-2 rounded border border-border hover:bg-muted/50">
							<input
								type="radio"
								:name="`primary-mobile-${currentCartKey}`"
								:checked="serie.isPrimaryInGroup"
								@change="emit('setGroupPrimary', currentCartKey)"
							>
							<span class="text-sm font-medium">
								{{ serie.sourceName }}
							</span>
							<span class="text-xs text-muted-foreground">
								(this source)
							</span>
						</label>

						<!-- Other sources in the duplicate group -->
						<label
							v-for="dup in serie.cartDuplicates"
							:key="dup.cartKey"
							class="flex items-center gap-2 cursor-pointer p-2 rounded border border-border hover:bg-muted/50"
						>
							<input
								type="radio"
								:name="`primary-mobile-${currentCartKey}`"
								:checked="serie.linkToCartKey === dup.cartKey"
								@change="emit('setGroupPrimary', dup.cartKey)"
							>
							<span class="text-sm font-medium">
								{{ dup.sourceName }}
							</span>
							<span class="text-xs text-muted-foreground">
								{{ Math.round(dup.similarity * 100) }}% match
							</span>
						</label>
					</div>

					<!-- Radio Options - horizontal on desktop (only show when not cart duplicate) -->
					<div
						v-if="!hasCartDuplicates"
						class="flex flex-col md:flex-row md:flex-wrap gap-x-4 gap-y-1.5"
					>
						<!-- Import as new -->
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								:name="radioGroupName"
								value="import"
								:checked="selectedValue === 'import'"
								@change="handleActionChange('import')"
							>
							<span class="text-sm">
								Import as new
							</span>
						</label>

						<!-- Top match -->
						<label
							v-if="topMatch"
							class="flex items-center gap-2 cursor-pointer"
						>
							<input
								type="radio"
								:name="radioGroupName"
								:value="`link:${topMatch.serieId}`"
								:checked="selectedValue === `link:${topMatch.serieId}`"
								@change="handleActionChange(`link:${topMatch.serieId}`)"
							>
							<span class="text-sm">
								Link to <span class="font-medium">{{ topMatch.title }}</span>
								<span class="text-muted-foreground text-xs ml-1">{{ Math.round(topMatch.similarity * 100) }}%</span>
							</span>
						</label>

						<!-- Link to other -->
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								:name="radioGroupName"
								value="link-other"
								:checked="selectedValue === 'link-other'"
								@change="handleActionChange('link-other')"
							>
							<span class="text-sm">
								Link to other
								<button
									class="text-primary hover:underline ml-1"
									@click.prevent="emit('openLibrarySearch')"
								>
									[Search...]
								</button>
							</span>
						</label>
					</div>

					<!-- Show more matches (only when not cart duplicate) -->
					<div
						v-if="!hasCartDuplicates && additionalMatches.length > 0 && !showMoreMatches"
						class="pt-1"
					>
						<button
							class="text-xs text-primary hover:underline"
							@click="showMoreMatches = true"
						>
							+{{ additionalMatches.length }} more matches
						</button>
					</div>

					<!-- Additional matches (only when not cart duplicate) -->
					<div
						v-if="!hasCartDuplicates && showMoreMatches"
						class="flex flex-col md:flex-row md:flex-wrap gap-x-4 gap-y-1.5 pt-1"
					>
						<label
							v-for="match in additionalMatches"
							:key="match.serieId"
							class="flex items-center gap-2 cursor-pointer"
						>
							<input
								type="radio"
								:name="radioGroupName"
								:value="`link:${match.serieId}`"
								:checked="selectedValue === `link:${match.serieId}`"
								@change="handleActionChange(`link:${match.serieId}`)"
							>
							<span class="text-sm">
								Link to <span class="font-medium">{{ match.title }}</span>
								<span class="text-muted-foreground text-xs ml-1">{{ Math.round(match.similarity * 100) }}%</span>
							</span>
						</label>
					</div>

					<!-- Validation error (only when not cart duplicate) -->
					<div
						v-if="!hasCartDuplicates && !isActionComplete"
						class="flex items-center gap-1.5 text-sm text-destructive pt-1"
					>
						<UIcon
							name="i-lucide-x-circle"
							class="w-4 h-4"
						/>
						{{ serie.action === 'link' && !serie.linkToSerieId ? 'Please select a series to link' : 'Please select an option' }}
					</div>

					<!-- Linked serie preview (only when not cart duplicate) -->
					<div
						v-if="!hasCartDuplicates && serie.action === 'link' && serie.linkToSerieId && serie.linkToSerieTitle"
						class="mt-3 p-2 rounded-lg border border-border bg-muted/30 flex items-center gap-2"
					>
						<div class="flex-shrink-0 w-8 h-11 rounded overflow-hidden bg-muted">
							<NuxtImg
								v-if="serie.linkToSerieCover"
								:src="serie.linkToSerieCover"
								:alt="serie.linkToSerieTitle"
								class="w-full h-full object-cover"
							/>
							<div
								v-else
								class="w-full h-full flex items-center justify-center"
							>
								<UIcon
									name="i-lucide-book-open"
									class="w-3 h-3 text-muted-foreground"
								/>
							</div>
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-xs text-muted-foreground">
								Will link to
							</p>
							<p class="font-medium text-sm truncate">
								{{ serie.linkToSerieTitle }}
							</p>
						</div>
						<button
							class="text-xs text-primary hover:underline flex-shrink-0"
							@click="emit('openLibrarySearch')"
						>
							Change
						</button>
					</div>
				</div>
			</div>

			<!-- Right: Remove button -->
			<div class="hidden md:block flex-shrink-0">
				<UButton
					icon="i-lucide-trash-2"
					variant="ghost"
					size="sm"
					color="error"
					@click="emit('remove')"
				/>
			</div>

			<!-- Mobile: Remove button in header area -->
			<UButton
				class="md:hidden absolute top-3 right-3"
				icon="i-lucide-trash-2"
				variant="ghost"
				size="sm"
				color="error"
				@click="emit('remove')"
			/>
		</div>
	</div>
</template>
