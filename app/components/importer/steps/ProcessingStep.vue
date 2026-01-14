<script setup lang="ts">
import { useImportWizardInjected } from "~/composables/useImportWizard"

const wizard = useImportWizardInjected()

const emit = defineEmits<{
	close: []
}>()

function getStatusIcon(state?: string) {
	switch (state) {
		case "success": return "i-lucide-check-circle"
		case "error": return "i-lucide-x-circle"
		case "processing": return "i-lucide-loader-2"
		default: return "i-lucide-circle"
	}
}

function getStatusColor(state?: string) {
	switch (state) {
		case "success": return "text-success"
		case "error": return "text-destructive"
		case "processing": return "text-primary animate-spin"
		default: return "text-muted-foreground"
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
				{{ wizard.cartItems.value.filter(s => s.processingState === 'success' || s.processingState === 'error').length }}
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

		<!-- Item List -->
		<div class="border border-border rounded-lg divide-y divide-border max-h-[300px] overflow-y-auto">
			<div
				v-for="serie in wizard.cartItems.value"
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
						{{ serie.processingMessage || 'Waiting...' }}
					</div>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="pt-4 border-t border-border flex justify-end">
			<UButton @click="emit('close')">
				{{ wizard.processingComplete.value ? 'Close' : 'Close (imports continue in background)' }}
			</UButton>
		</div>
	</div>
</template>
