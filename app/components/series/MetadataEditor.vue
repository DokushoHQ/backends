<script setup lang="ts">
import type { UISerie, UIMultiLanguage } from "#shared/ui/type/serie"

const props = defineProps<{
	serie: UISerie
}>()

const emit = defineEmits<{
	updated: []
}>()

const open = defineModel<boolean>("open", { default: false })
const isPending = ref(false)

// Title state
const customTitle = ref(props.serie.title)
const isTitleLocked = computed(() => (props.serie.locked_fields ?? []).includes("title"))

// Synopsis state
const customSynopsis = ref(props.serie.synopsis ?? "")
const isSynopsisLocked = computed(() => (props.serie.locked_fields ?? []).includes("synopsis"))

// Cover state
const customCoverUrl = ref("")
const isCoverLocked = computed(() => (props.serie.locked_fields ?? []).includes("cover"))
const coverUploadStatus = ref<"idle" | "uploading" | "processing" | "completed">("idle")
const coverUploadError = ref<string | null>(null)

// Reset state when dialog opens
watch(open, (isOpen) => {
	if (isOpen) {
		customTitle.value = props.serie.title
		customSynopsis.value = props.serie.synopsis ?? ""
		customCoverUrl.value = ""
		coverUploadStatus.value = "idle"
		coverUploadError.value = null
	}
})

// Collect all titles from all sources
const allTitles = computed(() => {
	const titles: { lang: string, value: string, isAlternate: boolean, sourceName: string }[] = []

	for (const source of props.serie.sources) {
		const sourceTitle = source.title as UIMultiLanguage | null
		const alternateTitles = source.alternates_titles as UIMultiLanguage | null

		if (sourceTitle) {
			for (const [lang, values] of Object.entries(sourceTitle)) {
				for (const value of values) {
					if (!titles.some(t => t.value === value)) {
						titles.push({ lang, value, isAlternate: false, sourceName: source.source.name })
					}
				}
			}
		}
		if (alternateTitles) {
			for (const [lang, values] of Object.entries(alternateTitles)) {
				for (const value of values) {
					if (!titles.some(t => t.value === value)) {
						titles.push({ lang, value, isAlternate: true, sourceName: source.source.name })
					}
				}
			}
		}
	}

	return titles
})

// Collect all synopsis options from all sources
const synopsisOptions = computed(() => {
	const options: { key: string, lang: string, value: string, sourceName: string }[] = []

	for (const source of props.serie.sources) {
		const sourceSynopsis = source.synopsis as UIMultiLanguage | null
		if (sourceSynopsis) {
			for (const [lang, values] of Object.entries(sourceSynopsis)) {
				const value = values?.[0]
				if (value) {
					const key = `${source.source.name}-${lang}`
					if (!options.some(s => s.value === value)) {
						options.push({ key, lang, value, sourceName: source.source.name })
					}
				}
			}
		}
	}

	return options
})

// Collect covers from all sources
const sourceCovers = computed(() =>
	props.serie.sources
		.filter(s => s.cover)
		.map(s => ({
			url: s.cover as string,
			sourceName: s.source.name,
			isPrimary: s.is_primary,
		})),
)

// Field operations
async function lockField(field: string) {
	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serie.id}/field`, {
			method: "POST",
			body: { field, action: "lock" },
		})
		emit("updated")
	}
	catch (e: unknown) {
		console.error("Failed to lock field:", e)
	}
	finally {
		isPending.value = false
	}
}

async function unlockField(field: string) {
	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serie.id}/field`, {
			method: "POST",
			body: { field, action: "unlock" },
		})
		emit("updated")
	}
	catch (e: unknown) {
		console.error("Failed to unlock field:", e)
	}
	finally {
		isPending.value = false
	}
}

async function updateField(field: string, value: string | null) {
	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serie.id}/field`, {
			method: "POST",
			body: { field, action: "update", value },
		})
		emit("updated")
	}
	catch (e: unknown) {
		console.error("Failed to update field:", e)
	}
	finally {
		isPending.value = false
	}
}

// Title handlers
function handleSetTitle(value: string) {
	customTitle.value = value
	updateField("title", value)
}

// Synopsis handlers
function handleSetSynopsis(value: string) {
	customSynopsis.value = value
	updateField("synopsis", value || null)
}

// Cover handlers
async function handleUploadCover(url: string) {
	if (!url) return

	coverUploadError.value = null
	coverUploadStatus.value = "uploading"

	try {
		const _response = await $fetch<{ success: boolean, jobId: string }>(`/api/v1/serie/${props.serie.id}/cover`, {
			method: "POST",
			body: { coverUrl: url },
		})

		coverUploadStatus.value = "processing"
		customCoverUrl.value = ""

		// Poll job status
		let attempts = 0
		while (attempts < 30) {
			await new Promise(resolve => setTimeout(resolve, 1000))
			// For now, just wait a bit and assume success
			// In a real implementation, you'd poll the job status
			attempts++
			if (attempts === 3) {
				coverUploadStatus.value = "completed"
				emit("updated")
				setTimeout(() => {
					coverUploadStatus.value = "idle"
				}, 2000)
				return
			}
		}
	}
	catch (e: unknown) {
		const fetchError = e as { data?: { message?: string }, message?: string }
		coverUploadError.value = fetchError.data?.message || fetchError.message || "Failed to upload cover"
		coverUploadStatus.value = "idle"
	}
}

const coverButtonText = computed(() => {
	switch (coverUploadStatus.value) {
		case "uploading":
			return "Uploading..."
		case "processing":
			return "Processing..."
		case "completed":
			return "Done!"
		default:
			return "Upload"
	}
})
</script>

<template>
	<UModal
		v-model:open="open"
		:ui="{ content: 'sm:max-w-4xl' }"
	>
		<UButton
			variant="outline"
			size="sm"
			@click="open = true"
		>
			<UIcon
				name="i-lucide-edit-2"
				class="h-4 w-4"
			/>
			<span class="hidden sm:inline">Edit</span>
		</UButton>

		<template #content>
			<UCard
				class="max-h-[90vh] flex flex-col"
				:ui="{ body: 'flex-1 overflow-hidden flex flex-col' }"
			>
				<template #header>
					<div>
						<h3 class="text-lg font-semibold">
							Edit Serie Metadata
						</h3>
						<p class="text-sm text-muted-foreground">
							Override source metadata or set custom display values. Locked fields won't be updated by source refreshes.
						</p>
					</div>
				</template>

				<div class="space-y-6 overflow-y-auto flex-1 min-h-0 -mr-4 pr-4">
					<!-- Title Editor -->
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<label class="text-base font-medium">Title</label>
							<UButton
								variant="ghost"
								size="sm"
								:disabled="isPending"
								@click="isTitleLocked ? unlockField('title') : lockField('title')"
							>
								<UIcon
									:name="isTitleLocked ? 'i-lucide-unlock' : 'i-lucide-lock'"
									class="h-4 w-4"
								/>
								{{ isTitleLocked ? "Unlock" : "Lock" }}
							</UButton>
						</div>

						<div class="space-y-3">
							<div>
								<p class="text-sm text-muted-foreground">
									Current Display
								</p>
								<p class="font-medium truncate">
									{{ serie.title }}
								</p>
							</div>

							<template v-if="isTitleLocked">
								<div>
									<p class="text-sm text-muted-foreground">
										Custom Title
									</p>
									<div class="flex gap-2 mt-1">
										<UInput
											v-model="customTitle"
											placeholder="Enter custom title..."
											:disabled="isPending"
											class="flex-1"
										/>
										<UButton
											variant="outline"
											:disabled="isPending || !customTitle"
											@click="handleSetTitle(customTitle)"
										>
											Set
										</UButton>
									</div>
								</div>

								<div v-if="allTitles.length > 0">
									<p class="text-sm text-muted-foreground">
										Available Titles (click to select)
									</p>
									<div class="flex flex-col gap-2 mt-2">
										<UBadge
											v-for="title in allTitles"
											:key="`${title.sourceName}-${title.lang}-${title.value}`"
											:variant="serie.title === title.value ? 'solid' : 'outline'"
											:class="[
												'cursor-pointer transition-colors whitespace-normal w-auto max-w-full',
												title.isAlternate && 'border-dashed',
											]"
											@click="handleSetTitle(title.value)"
										>
											<UIcon
												v-if="serie.title === title.value"
												name="i-lucide-check"
												class="h-3 w-3 shrink-0"
											/>
											<span class="opacity-60 shrink-0">[{{ title.lang }}]</span>
											<span
												v-if="serie.sources.length > 1"
												class="opacity-40 shrink-0 text-[10px]"
											>({{ title.sourceName }})</span>
											<span class="truncate">{{ title.value }}</span>
										</UBadge>
									</div>
								</div>
							</template>

							<p
								v-else
								class="text-sm text-muted-foreground"
							>
								Lock this field to set a custom title
							</p>
						</div>
					</div>

					<USeparator />

					<!-- Synopsis Editor -->
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<label class="text-base font-medium">Synopsis</label>
							<UButton
								variant="ghost"
								size="sm"
								:disabled="isPending"
								@click="isSynopsisLocked ? unlockField('synopsis') : lockField('synopsis')"
							>
								<UIcon
									:name="isSynopsisLocked ? 'i-lucide-unlock' : 'i-lucide-lock'"
									class="h-4 w-4"
								/>
								{{ isSynopsisLocked ? "Unlock" : "Lock" }}
							</UButton>
						</div>

						<div class="space-y-3">
							<div>
								<p class="text-sm text-muted-foreground">
									Current Display
								</p>
								<p class="text-sm text-muted-foreground line-clamp-3 mt-1">
									{{ serie.synopsis || "No synopsis" }}
								</p>
							</div>

							<template v-if="isSynopsisLocked">
								<div v-if="synopsisOptions.length > 0">
									<p class="text-sm text-muted-foreground">
										Select Synopsis (click to use)
									</p>
									<div class="flex flex-wrap gap-2 mt-2">
										<UBadge
											v-for="option in synopsisOptions"
											:key="option.key"
											variant="outline"
											class="cursor-pointer transition-colors hover:bg-muted"
											:title="option.value.slice(0, 200) + (option.value.length > 200 ? '...' : '')"
											@click="handleSetSynopsis(option.value)"
										>
											{{ option.lang }}
											<span
												v-if="serie.sources.length > 1"
												class="opacity-60 text-[10px] ml-1"
											>({{ option.sourceName }})</span>
										</UBadge>
									</div>
								</div>

								<div>
									<p class="text-sm text-muted-foreground">
										Custom Synopsis
									</p>
									<UTextarea
										v-model="customSynopsis"
										placeholder="Enter custom synopsis..."
										:disabled="isPending"
										:rows="4"
										class="mt-1 w-full"
									/>
									<UButton
										variant="outline"
										size="sm"
										class="mt-2"
										:disabled="isPending || !customSynopsis"
										@click="handleSetSynopsis(customSynopsis)"
									>
										Set Custom Synopsis
									</UButton>
								</div>
							</template>

							<p
								v-else
								class="text-sm text-muted-foreground"
							>
								Lock this field to set a custom synopsis
							</p>
						</div>
					</div>

					<USeparator />

					<!-- Cover Editor -->
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<label class="text-base font-medium">Cover</label>
							<UButton
								variant="ghost"
								size="sm"
								:disabled="isPending"
								@click="isCoverLocked ? unlockField('cover') : lockField('cover')"
							>
								<UIcon
									:name="isCoverLocked ? 'i-lucide-unlock' : 'i-lucide-lock'"
									class="h-4 w-4"
								/>
								{{ isCoverLocked ? "Unlock" : "Lock" }}
							</UButton>
						</div>

						<div class="flex gap-4 flex-wrap">
							<div v-if="serie.cover">
								<p class="text-sm text-muted-foreground">
									Current Display
								</p>
								<img
									:src="serie.cover"
									alt="Cover"
									class="w-24 h-36 object-cover rounded mt-1"
								>
							</div>

							<template v-if="isCoverLocked">
								<div
									v-for="sc in sourceCovers.filter((c) => c.url !== serie.cover)"
									:key="sc.sourceName"
								>
									<p class="text-sm text-muted-foreground">
										{{ sc.sourceName }}
										<span v-if="sc.isPrimary && serie.sources.length > 1">(Primary)</span>
									</p>
									<button
										type="button"
										class="block mt-1 rounded focus:outline-none focus:ring-2 ring-primary hover:ring-2"
										@click="handleUploadCover(sc.url)"
									>
										<img
											:src="sc.url"
											:alt="`${sc.sourceName} cover`"
											class="w-24 h-36 object-cover rounded cursor-pointer"
										>
									</button>
								</div>
							</template>
						</div>

						<template v-if="isCoverLocked">
							<div>
								<p class="text-sm text-muted-foreground">
									Custom Cover URL
								</p>
								<p class="text-xs text-muted-foreground mb-1">
									Image will be downloaded and stored permanently
								</p>
								<div class="flex gap-2">
									<UInput
										v-model="customCoverUrl"
										placeholder="Enter image URL..."
										:disabled="coverUploadStatus !== 'idle'"
										class="flex-1"
									/>
									<UButton
										:variant="coverUploadStatus === 'completed' ? 'solid' : 'outline'"
										:disabled="coverUploadStatus !== 'idle' || !customCoverUrl"
										@click="handleUploadCover(customCoverUrl)"
									>
										{{ coverButtonText }}
									</UButton>
								</div>
								<p
									v-if="coverUploadStatus === 'processing'"
									class="text-xs text-blue-500 mt-1"
								>
									Processing image... This may take a few seconds.
								</p>
								<p
									v-if="coverUploadError"
									class="text-xs text-destructive mt-1"
								>
									{{ coverUploadError }}
								</p>
							</div>
						</template>

						<p
							v-else
							class="text-sm text-muted-foreground"
						>
							Lock this field to set a custom cover
						</p>
					</div>
				</div>
			</UCard>
		</template>
	</UModal>
</template>
