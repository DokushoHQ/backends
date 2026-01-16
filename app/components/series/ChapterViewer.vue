<script setup lang="ts">
import type { UIChapter, UIChapterPage } from "#shared/ui/type/chapter"

const props = defineProps<{
	chapter: UIChapter | null
	serieId: string
}>()

const open = defineModel<boolean>("open", { default: false })

const pages = ref<UIChapterPage[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const loadedImages = ref<Set<number>>(new Set())
const togglingPages = ref<Set<number>>(new Set())

watch([() => open.value, () => props.chapter], async ([isOpen, chapter]) => {
	if (isOpen && chapter) {
		loading.value = true
		error.value = null
		pages.value = []
		loadedImages.value = new Set()

		try {
			const data = await $fetch(`/api/v1/serie/${props.serieId}/chapters/${chapter.id}/data`)
			pages.value = data.pages ?? []
		}
		catch (e: unknown) {
			error.value = e instanceof Error ? e.message : "Failed to load chapter"
		}
		finally {
			loading.value = false
		}
	}
}, { immediate: true })

function handleImageLoad(index: number) {
	loadedImages.value = new Set([...loadedImages.value, index])
}

async function togglePermanentlyFailed(page: UIChapterPage) {
	if (!props.chapter) return

	togglingPages.value = new Set([...togglingPages.value, page.index])

	try {
		await $fetch(`/api/v1/serie/${props.serieId}/chapters/${props.chapter.id}/pages/${page.index}/toggle-permanent`, {
			method: "POST",
			body: { permanently_failed: !page.permanently_failed },
		})

		// Update local state
		const idx = pages.value.findIndex(p => p.index === page.index)
		const current = pages.value[idx]
		if (idx !== -1 && current) {
			pages.value[idx] = {
				index: current.index,
				type: current.type,
				url: current.url,
				content: current.content,
				image_quality: current.image_quality,
				metadata_issues: current.metadata_issues,
				permanently_failed: !page.permanently_failed,
			}
		}
	}
	catch (e) {
		console.error("Failed to toggle permanently_failed:", e)
	}
	finally {
		const next = new Set(togglingPages.value)
		next.delete(page.index)
		togglingPages.value = next
	}
}

const imagePages = computed(() => pages.value.filter(p => p.type === "image"))

const pageStats = computed(() => {
	const total = imagePages.value.length
	const successful = imagePages.value.filter(p => p.url).length
	const failed = imagePages.value.filter(p => !p.url && !p.permanently_failed).length
	const permanentlyFailed = imagePages.value.filter(p => p.permanently_failed).length
	const degraded = imagePages.value.filter(p => p.image_quality === "degraded").length
	const corrupted = imagePages.value.filter(p => p.image_quality === "corrupted").length
	return { total, successful, failed, permanentlyFailed, degraded, corrupted }
})
</script>

<template>
	<USlideover
		v-model:open="open"
		side="right"
		:ui="{ content: 'w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl' }"
	>
		<template #content>
			<div class="flex flex-col h-full">
				<div class="p-4 border-b shrink-0">
					<div class="flex items-start justify-between gap-2">
						<h3 class="font-semibold flex items-center gap-2">
							<UIcon
								name="i-lucide-book-open"
								class="h-4 w-4"
							/>
							<span v-if="chapter?.volume_number !== null">Vol. {{ chapter?.volume_number }}</span>
							Ch. {{ chapter?.chapter_number }}
						</h3>
						<UButton
							variant="ghost"
							size="sm"
							icon="i-lucide-x"
							class="shrink-0 -mr-2 -mt-1"
							@click="open = false"
						/>
					</div>
					<div class="flex items-center gap-2 flex-wrap text-sm text-muted-foreground mt-1">
						<span v-if="chapter?.title">{{ chapter.title }}</span>
						<UBadge variant="subtle">
							{{ chapter?.source.name }}
						</UBadge>
						<UBadge variant="outline">
							{{ chapter?.language }}
						</UBadge>
						<span
							v-if="imagePages.length > 0"
							class="text-xs text-muted-foreground ml-auto flex items-center gap-1.5"
						>
							<span class="flex items-center gap-0.5">
								<UIcon
									name="i-lucide-file-image"
									class="h-3 w-3"
								/>
								{{ pageStats.total }}
							</span>
							<span
								v-if="pageStats.failed > 0"
								class="text-warning flex items-center gap-0.5"
								title="Failed (retryable)"
							>
								<UIcon
									name="i-lucide-x-circle"
									class="h-3 w-3"
								/>
								{{ pageStats.failed }}
							</span>
							<span
								v-if="pageStats.permanentlyFailed > 0"
								class="text-error flex items-center gap-0.5"
								title="Permanently failed"
							>
								<UIcon
									name="i-lucide-ban"
									class="h-3 w-3"
								/>
								{{ pageStats.permanentlyFailed }}
							</span>
							<span
								v-if="pageStats.degraded > 0"
								class="text-warning flex items-center gap-0.5"
								title="Degraded quality"
							>
								<UIcon
									name="i-lucide-alert-triangle"
									class="h-3 w-3"
								/>
								{{ pageStats.degraded }}
							</span>
							<span
								v-if="pageStats.corrupted > 0"
								class="text-error flex items-center gap-0.5"
								title="Corrupted"
							>
								<UIcon
									name="i-lucide-alert-circle"
									class="h-3 w-3"
								/>
								{{ pageStats.corrupted }}
							</span>
						</span>
					</div>
				</div>

				<div class="flex-1 min-h-0 overflow-y-auto p-4">
					<!-- Loading -->
					<div
						v-if="loading"
						class="flex items-center justify-center py-12"
					>
						<UIcon
							name="i-lucide-loader-2"
							class="h-8 w-8 animate-spin text-muted-foreground"
						/>
					</div>

					<!-- Error -->
					<div
						v-else-if="error"
						class="flex flex-col items-center justify-center py-12 text-destructive"
					>
						<p class="font-medium">
							Failed to load chapter
						</p>
						<p class="text-sm text-muted-foreground">
							{{ error }}
						</p>
					</div>

					<!-- Empty -->
					<div
						v-else-if="pages.length === 0"
						class="flex flex-col items-center justify-center py-12 text-muted-foreground"
					>
						<UIcon
							name="i-lucide-image-off"
							class="h-12 w-12 mb-4"
						/>
						<p class="font-medium">
							No pages available
						</p>
						<p class="text-sm">
							Chapter data has not been fetched yet
						</p>
					</div>

					<!-- Pages -->
					<div
						v-else
						class="space-y-2"
					>
						<div
							v-for="page in imagePages"
							:key="page.index"
							class="relative bg-muted/30 rounded-md overflow-hidden"
						>
							<!-- Failed page placeholder -->
							<template v-if="!page.url">
								<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
									<UIcon
										:name="page.permanently_failed ? 'i-lucide-ban' : 'i-lucide-image-off'"
										class="h-12 w-12 mb-2"
										:class="page.permanently_failed ? 'text-error' : 'text-warning'"
									/>
									<p class="font-medium text-sm">
										Page {{ page.index + 1 }}
									</p>
									<p class="text-xs mb-3">
										{{ page.permanently_failed ? 'Permanently failed' : 'Failed to load' }}
									</p>
									<UButton
										size="xs"
										variant="outline"
										:loading="togglingPages.has(page.index)"
										@click="togglePermanentlyFailed(page)"
									>
										<UIcon
											:name="page.permanently_failed ? 'i-lucide-rotate-ccw' : 'i-lucide-ban'"
											class="h-3 w-3 mr-1"
										/>
										{{ page.permanently_failed ? 'Mark as retryable' : 'Mark as permanent' }}
									</UButton>
								</div>
							</template>

							<!-- Successful page -->
							<template v-else>
								<div
									v-if="!loadedImages.has(page.index)"
									class="absolute inset-0 flex items-center justify-center"
								>
									<UIcon
										name="i-lucide-loader-2"
										class="h-6 w-6 animate-spin text-muted-foreground"
									/>
								</div>
								<!-- Quality indicator badge -->
								<UTooltip
									v-if="page.image_quality && page.image_quality !== 'healthy'"
									:text="page.metadata_issues?.issues?.join(', ') || page.image_quality"
								>
									<div
										class="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
										:class="page.image_quality === 'corrupted' ? 'bg-error text-error-foreground' : 'bg-warning text-warning-foreground'"
									>
										<UIcon
											:name="page.image_quality === 'corrupted' ? 'i-lucide-alert-circle' : 'i-lucide-alert-triangle'"
											class="h-3 w-3"
										/>
										{{ page.image_quality }}
									</div>
								</UTooltip>
								<NuxtImg
									:src="page.url"
									:alt="`Page ${page.index + 1}`"
									class="w-full h-auto"
									loading="lazy"
									@load="handleImageLoad(page.index)"
								/>
							</template>
						</div>
					</div>
				</div>
			</div>
		</template>
	</USlideover>
</template>
