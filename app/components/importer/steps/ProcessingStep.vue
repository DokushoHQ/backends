<script setup lang="ts">
import { useImportWizardInjected } from "~/composables/useImportWizard"

const wizard = useImportWizardInjected()

const emit = defineEmits<{
	close: []
}>()

// Categorize items into three groups
const importItems = computed(() =>
	wizard.cartItems.value.filter(s =>
		s.isPrimaryInGroup || (s.action === "import" && !s.cartDuplicates?.length),
	),
)
const linkExistingItems = computed(() =>
	wizard.cartItems.value.filter(s =>
		s.action === "link" && s.linkToSerieId,
	),
)
const postImportLinkItems = computed(() =>
	wizard.cartItems.value.filter(s =>
		s.linkToCartKey && !s.linkToSerieId,
	),
)

function getStatusIcon(state?: string) {
	switch (state) {
		case "done": return "i-lucide-check-circle"
		case "error": return "i-lucide-x-circle"
		case "processing": return "i-lucide-loader-2"
		case "queued": return "i-lucide-clock"
		default: return "i-lucide-circle"
	}
}

function getStatusColor(state?: string) {
	switch (state) {
		case "done": return "text-success"
		case "error": return "text-destructive"
		case "processing": return "text-primary animate-spin"
		case "queued": return "text-amber-500"
		default: return "text-muted-foreground"
	}
}

function getStatusLabel(state?: string, linkToCartKey?: string) {
	switch (state) {
		case "done": return "Complete"
		case "error": return "Failed"
		case "processing": return "Processing..."
		case "queued": return "Queued"
		case "pending":
			if (linkToCartKey) return "Waiting for primary"
			return "Pending"
		default: return "Waiting..."
	}
}
</script>

<template>
	<div class="space-y-4">
		<!-- Completion State -->
		<div
			v-if="wizard.processingComplete.value"
			class="text-center py-4"
		>
			<UIcon
				name="i-lucide-check-circle"
				class="w-12 h-12 text-success mx-auto mb-3"
			/>
			<h4 class="text-lg font-semibold mb-1">
				Import Complete
			</h4>
			<p class="text-muted-foreground text-sm">
				Successfully processed {{ wizard.processingStats.value.total }} series
			</p>
			<div class="flex justify-center gap-4 mt-2 text-sm">
				<span v-if="wizard.processingStats.value.linked > 0">
					{{ wizard.processingStats.value.linked }} linked
				</span>
				<span v-if="wizard.processingStats.value.imported > 0">
					{{ wizard.processingStats.value.imported }} imported
				</span>
				<span
					v-if="wizard.processingStats.value.errors > 0"
					class="text-destructive"
				>
					{{ wizard.processingStats.value.errors }} failed
				</span>
			</div>
		</div>

		<!-- Progress Header -->
		<div
			v-else
			class="text-center"
		>
			<h4 class="text-lg font-semibold">
				Importing...
			</h4>
			<p class="text-muted-foreground text-sm">
				{{ wizard.cartItems.value.filter(s => s.processingState === 'done' || s.processingState === 'error').length }}
				of {{ wizard.cartCount.value }} complete
			</p>
		</div>

		<!-- Progress Bar -->
		<div class="w-full bg-muted rounded-full h-2 overflow-hidden">
			<div
				class="h-full bg-primary transition-all duration-300"
				:style="{ width: `${wizard.processingProgress.value}%` }"
			/>
		</div>

		<!-- Three-group item list -->
		<div class="space-y-4 max-h-[400px] overflow-y-auto">
			<!-- Group 1: Import (new series) -->
			<section v-if="importItems.length > 0">
				<h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
					<UIcon
						name="i-lucide-download"
						class="w-3.5 h-3.5"
					/>
					Importing ({{ importItems.length }})
				</h5>
				<div class="border border-border rounded-lg divide-y divide-border">
					<div
						v-for="serie in importItems"
						:key="`${serie.sourceId}:${serie.externalId}`"
						class="p-3 flex items-center gap-3"
					>
						<UIcon
							:name="getStatusIcon(serie.processingState)"
							:class="['w-5 h-5', getStatusColor(serie.processingState)]"
						/>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium truncate">
								{{ serie.title }}
							</div>
							<div class="text-xs text-muted-foreground">
								{{ serie.processingMessage || getStatusLabel(serie.processingState) }}
							</div>
						</div>
						<span
							v-if="serie.isPrimaryInGroup"
							class="px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-[10px] font-semibold flex-shrink-0"
						>
							PRIMARY
						</span>
					</div>
				</div>
			</section>

			<!-- Group 2: Link to existing library series -->
			<section v-if="linkExistingItems.length > 0">
				<h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
					<UIcon
						name="i-lucide-link"
						class="w-3.5 h-3.5"
					/>
					Linking to existing ({{ linkExistingItems.length }})
				</h5>
				<div class="border border-border rounded-lg divide-y divide-border">
					<div
						v-for="serie in linkExistingItems"
						:key="`${serie.sourceId}:${serie.externalId}`"
						class="p-3 flex items-center gap-3"
					>
						<UIcon
							:name="getStatusIcon(serie.processingState)"
							:class="['w-5 h-5', getStatusColor(serie.processingState)]"
						/>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium truncate">
								{{ serie.title }}
							</div>
							<div class="text-xs text-muted-foreground truncate">
								{{ serie.processingMessage || `Linking to ${serie.linkToSerieTitle || 'existing'}` }}
							</div>
						</div>
					</div>
				</div>
			</section>

			<!-- Group 3: Post-import link (linking to series from this import batch) -->
			<section v-if="postImportLinkItems.length > 0">
				<h5 class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
					<UIcon
						name="i-lucide-link-2"
						class="w-3.5 h-3.5"
					/>
					Linking after import ({{ postImportLinkItems.length }})
				</h5>
				<div class="border border-border rounded-lg divide-y divide-border">
					<div
						v-for="serie in postImportLinkItems"
						:key="`${serie.sourceId}:${serie.externalId}`"
						class="p-3 flex items-center gap-3"
					>
						<UIcon
							:name="getStatusIcon(serie.processingState)"
							:class="['w-5 h-5', getStatusColor(serie.processingState)]"
						/>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium truncate">
								{{ serie.title }}
							</div>
							<div class="text-xs text-muted-foreground">
								{{ serie.processingMessage || getStatusLabel(serie.processingState, serie.linkToCartKey) }}
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>

		<!-- Footer -->
		<div class="pt-4 border-t border-border flex justify-end">
			<UButton @click="emit('close')">
				{{ wizard.processingComplete.value ? 'Close' : 'Close (imports continue in background)' }}
			</UButton>
		</div>
	</div>
</template>
