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

// Status: configured, needs-attention, pending
// "configured" only if action is complete (import, or link with linkToSerieId)
const isConfigured = computed(() => {
	if (props.serie.action === "import") return true
	if (props.serie.action === "link" && props.serie.linkToSerieId) return true
	return false
})

const status = computed(() => {
	if (props.serie.loadingSimilarity) return "loading"
	if (isConfigured.value) return "configured"
	if (hasMatches.value) return "needs-attention"
	return "pending"
})

const statusIcon = computed(() => {
	switch (status.value) {
		case "loading": return "i-lucide-loader-2"
		case "configured": return "i-lucide-check-circle"
		case "needs-attention": return "i-lucide-alert-triangle"
		default: return "i-lucide-circle"
	}
})
</script>

<template>
	<div
		class="group rounded-lg bg-card overflow-hidden border transition-all cursor-pointer"
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
			<div class="absolute top-1.5 right-1.5">
				<div
					class="w-5 h-5 rounded-full flex items-center justify-center"
					:class="status === 'configured' ? 'bg-success' : status === 'needs-attention' ? 'bg-warning' : 'bg-muted'"
				>
					<UIcon
						:name="statusIcon"
						class="w-3 h-3"
						:class="[
							status === 'loading' ? 'animate-spin text-muted-foreground' : '',
							status === 'configured' ? 'text-success-foreground' : '',
							status === 'needs-attention' ? 'text-warning-foreground' : 'text-muted-foreground',
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
