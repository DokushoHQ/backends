<script setup lang="ts">
import { useImportWizardInjected } from "~/composables/useImportWizard"

const wizard = useImportWizardInjected()
</script>

<template>
	<div class="space-y-4">
		<div
			v-if="wizard.loadingSources.value"
			class="flex justify-center py-8"
		>
			<UIcon
				name="i-lucide-loader-2"
				class="w-6 h-6 animate-spin text-muted-foreground"
			/>
		</div>

		<div
			v-else-if="wizard.sources.value.length === 0"
			class="text-center py-8 text-muted-foreground"
		>
			No sources available
		</div>

		<div
			v-else
			class="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
		>
			<button
				v-for="source in wizard.sources.value"
				:key="source.id"
				class="p-5 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-colors text-center"
				@click="wizard.selectSource(source)"
			>
				<div class="flex flex-col items-center gap-3">
					<img
						v-if="source.icon"
						:src="source.icon"
						:alt="source.name"
						class="w-12 h-12 rounded"
						referrerpolicy="no-referrer"
					>
					<UIcon
						v-else
						name="i-lucide-globe"
						class="w-12 h-12 text-muted-foreground"
					/>
					<span class="font-medium">{{ source.name }}</span>
				</div>
			</button>
		</div>
	</div>
</template>
