<script setup lang="ts">
import { useImportWizardInjected } from "~/composables/useImportWizard"

const wizard = useImportWizardInjected()
</script>

<template>
	<div class="space-y-6">
		<!-- Import Method Cards - Grid on desktop -->
		<div class="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
			<button
				class="p-6 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-colors text-left h-full"
				@click="wizard.startBrowse()"
			>
				<div class="flex flex-col items-center text-center gap-4">
					<div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
						<UIcon
							name="i-lucide-search"
							class="w-6 h-6 text-primary"
						/>
					</div>
					<div>
						<div class="font-semibold text-lg">
							Browse Sources
						</div>
						<div class="text-sm text-muted-foreground mt-1">
							Search and select from available manga sources
						</div>
					</div>
				</div>
			</button>

			<button
				class="p-6 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-colors text-left h-full"
				@click="wizard.startUrlPaste()"
			>
				<div class="flex flex-col items-center text-center gap-4">
					<div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
						<UIcon
							name="i-lucide-link"
							class="w-6 h-6 text-primary"
						/>
					</div>
					<div>
						<div class="font-semibold text-lg">
							Paste URLs / Upload File
						</div>
						<div class="text-sm text-muted-foreground mt-1">
							Import from direct links or CSV/TXT file
						</div>
					</div>
				</div>
			</button>
		</div>

		<!-- Cart Summary -->
		<div
			v-if="wizard.cartCount.value > 0"
			class="max-w-md mx-auto"
		>
			<div class="flex items-center justify-between p-4 bg-muted rounded-lg">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
						<UIcon
							name="i-lucide-shopping-cart"
							class="w-5 h-5 text-primary"
						/>
					</div>
					<div>
						<div class="font-medium">
							{{ wizard.cartCount.value }} series selected
						</div>
						<div class="text-sm text-muted-foreground">
							Ready to review
						</div>
					</div>
				</div>
				<UButton @click="wizard.goToReview()">
					View Selection
				</UButton>
			</div>
		</div>
	</div>
</template>
