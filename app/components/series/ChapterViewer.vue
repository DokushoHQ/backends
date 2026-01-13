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

const imagePages = computed(() => pages.value.filter(p => p.type === "image" && p.url))
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
							class="text-xs text-muted-foreground ml-auto flex items-center gap-1"
						>
							<UIcon
								name="i-lucide-file-image"
								class="h-3 w-3"
							/>
							{{ imagePages.length }} pages
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
							<div
								v-if="!loadedImages.has(page.index)"
								class="absolute inset-0 flex items-center justify-center"
							>
								<UIcon
									name="i-lucide-loader-2"
									class="h-6 w-6 animate-spin text-muted-foreground"
								/>
							</div>
							<img
								:src="page.url ?? ''"
								:alt="`Page ${page.index + 1}`"
								class="w-full h-auto"
								loading="lazy"
								@load="handleImageLoad(page.index)"
							>
						</div>
					</div>
				</div>
			</div>
		</template>
	</USlideover>
</template>
