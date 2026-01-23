<script setup lang="ts">
import type { SelectedSerie } from "~/composables/useImportWizard"

const props = defineProps<{
	serie: SelectedSerie
	selected: boolean
}>()

defineEmits<{
	click: []
}>()

const hasMatches = computed(() => (props.serie.similarMatches?.length || 0) > 0)
const hasCartDuplicates = computed(() => (props.serie.cartDuplicates?.length || 0) > 0)

// Status: configured, needs-attention, pending
// "configured" only if action is complete (import, or link with linkToSerieId, or linkToCartKey set for cart duplicates)
const isConfigured = computed(() => {
	if (props.serie.action === "import") return true
	if (props.serie.action === "link" && props.serie.linkToSerieId) return true
	if (props.serie.linkToCartKey) return true
	return false
})

const status = computed(() => {
	if (props.serie.loadingSimilarity) return "loading"
	if (isConfigured.value) return "configured"
	if (hasCartDuplicates.value) return "cart-duplicate"
	if (hasMatches.value) return "needs-attention"
	return "pending"
})

const statusIcon = computed(() => {
	switch (status.value) {
		case "loading": return "i-lucide-loader-2"
		case "configured": return "i-lucide-check-circle"
		case "cart-duplicate": return "i-lucide-copy"
		case "needs-attention": return "i-lucide-alert-triangle"
		default: return "i-lucide-circle"
	}
})
</script>

<template>
	<div
		class="group rounded-lg bg-elevated overflow-hidden border transition-all cursor-pointer"
		:class="[
			selected ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-primary/50',
		]"
		@click="$emit('click')"
	>
		<div class="aspect-[2/3] relative bg-muted overflow-hidden">
			<NuxtImg
				v-if="serie.cover"
				:src="serie.cover"
				:alt="serie.title"
				class="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
			/>
			<div
				v-else
				class="absolute inset-0 flex items-center justify-center"
			>
				<UIcon
					name="i-lucide-book-open"
					class="h-8 w-8 text-muted-foreground/50"
				/>
			</div>
			<!-- Status indicator -->
			<div class="absolute top-1.5 right-1.5 flex items-center gap-1">
				<!-- Primary badge for cart duplicates -->
				<div
					v-if="serie.isPrimaryInGroup"
					class="px-1.5 py-0.5 bg-primary rounded text-[9px] font-semibold text-primary-foreground"
				>
					PRIMARY
				</div>
				<div
					class="w-5 h-5 rounded-full flex items-center justify-center"
					:class="{
						'bg-success': status === 'configured',
						'bg-warning': status === 'needs-attention' || status === 'cart-duplicate',
						'bg-muted': status !== 'configured' && status !== 'needs-attention' && status !== 'cart-duplicate',
					}"
				>
					<UIcon
						:name="statusIcon"
						class="w-3 h-3"
						:class="[
							status === 'loading' ? 'animate-spin text-muted-foreground' : '',
							status === 'configured' ? 'text-success-foreground' : '',
							status === 'needs-attention' || status === 'cart-duplicate' ? 'text-warning-foreground' : 'text-muted-foreground',
						]"
					/>
				</div>
			</div>
			<div class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-2 pt-6">
				<p class="font-medium text-white text-xs leading-tight truncate">
					{{ serie.title }}
				</p>
				<p class="text-white/70 text-[10px] truncate">
					{{ serie.sourceName }}
				</p>
			</div>
		</div>
	</div>
</template>
