<script setup lang="ts">
import { useImportWizardInjected } from "~/composables/useImportWizard"

const wizard = useImportWizardInjected()

const nativeSources = computed(() =>
	wizard.sources.value.filter(s => !s.external_id.startsWith("suwayomi-")),
)

const suwayomiSources = computed(() =>
	wizard.sources.value.filter(s => s.external_id.startsWith("suwayomi-")),
)

const DISCLAIMER_STORAGE_KEY = "dokusho-source-disclaimer-dismissed"

const disclaimerDismissed = ref(false)

onMounted(() => {
	disclaimerDismissed.value = localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "true"
})

function dismissDisclaimer() {
	disclaimerDismissed.value = true
	localStorage.setItem(DISCLAIMER_STORAGE_KEY, "true")
}

function showDisclaimer() {
	disclaimerDismissed.value = false
	localStorage.removeItem(DISCLAIMER_STORAGE_KEY)
}
</script>

<template>
	<div class="space-y-6">
		<!-- Disclaimer Banner -->
		<div
			v-if="!disclaimerDismissed && !wizard.loadingSources.value && wizard.sources.value.length > 0"
			class="relative rounded-lg border border-border bg-muted/50 p-4 pr-10"
		>
			<button
				class="absolute top-2 right-2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
				@click="dismissDisclaimer"
			>
				<UIcon
					name="i-lucide-x"
					class="w-4 h-4"
				/>
			</button>
			<div class="flex gap-3">
				<UIcon
					name="i-lucide-info"
					class="w-5 h-5 text-muted-foreground shrink-0 mt-0.5"
				/>
				<div>
					<p class="font-medium mb-2">
						About Sources
					</p>
					<p class="text-sm text-muted-foreground">
						<strong class="text-foreground">Native sources</strong> are built-in scrapers with full support for metadata and chapter fetching.
					</p>
					<p class="text-sm text-muted-foreground mt-1">
						<strong class="text-foreground">Suwayomi sources</strong> are extensions loaded from your Suwayomi server. While they provide access to many more sources,
						<span class="text-warning font-medium">chapter fetching and metadata retrieval may be unreliable or broken</span> for some of them.
					</p>
				</div>
			</div>
		</div>

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

		<template v-else>
			<!-- Native Sources -->
			<div v-if="nativeSources.length > 0">
				<div class="flex items-center justify-between mb-3">
					<h3 class="text-sm font-medium text-muted-foreground">
						Native Sources
					</h3>
					<button
						v-if="disclaimerDismissed"
						class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
						@click="showDisclaimer"
					>
						<UIcon
							name="i-lucide-info"
							class="w-4 h-4"
						/>
						<span>About sources</span>
					</button>
				</div>
				<div class="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
					<button
						v-for="source in nativeSources"
						:key="source.id"
						class="p-5 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-colors text-center"
						@click="wizard.selectSource(source)"
					>
						<div class="flex flex-col items-center gap-3">
							<NuxtImg
								v-if="source.icon"
								:src="source.icon"
								:alt="source.name"
								class="w-12 h-12 rounded"
							/>
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

			<!-- Suwayomi Sources -->
			<div v-if="suwayomiSources.length > 0">
				<div class="flex items-center justify-between mb-3">
					<h3 class="text-sm font-medium text-muted-foreground">
						Suwayomi Sources
					</h3>
					<button
						v-if="disclaimerDismissed && nativeSources.length === 0"
						class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
						@click="showDisclaimer"
					>
						<UIcon
							name="i-lucide-info"
							class="w-4 h-4"
						/>
						<span>About sources</span>
					</button>
				</div>
				<div class="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
					<button
						v-for="source in suwayomiSources"
						:key="source.id"
						class="p-5 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-colors text-center"
						@click="wizard.selectSource(source)"
					>
						<div class="flex flex-col items-center gap-3">
							<NuxtImg
								v-if="source.icon"
								:src="source.icon"
								:alt="source.name"
								class="w-12 h-12 rounded"
							/>
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
	</div>
</template>
