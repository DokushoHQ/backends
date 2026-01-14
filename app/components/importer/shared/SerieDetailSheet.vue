<script setup lang="ts">
import type { SerieDetail } from "~/composables/useSourceBrowser"

const open = defineModel<boolean>("open", { default: false })

defineProps<{
	detail: SerieDetail | null
	loading: boolean
	sourceId?: string
	sourceName?: string
	isInCart: boolean
}>()

defineEmits<{
	toggle: []
	close: []
}>()
</script>

<template>
	<USlideover
		v-model:open="open"
		side="right"
		:ui="{ content: 'sm:max-w-md' }"
	>
		<template #content>
			<div class="flex flex-col h-full">
				<!-- Header -->
				<div class="flex items-center justify-between p-4 border-b border-border">
					<h3 class="text-lg font-semibold truncate">
						{{ detail?.title || 'Loading...' }}
					</h3>
					<UButton
						icon="i-lucide-x"
						variant="ghost"
						size="sm"
						@click="$emit('close')"
					/>
				</div>

				<!-- Loading -->
				<div
					v-if="loading"
					class="flex-1 flex items-center justify-center"
				>
					<UIcon
						name="i-lucide-loader-2"
						class="w-8 h-8 animate-spin text-muted-foreground"
					/>
				</div>

				<!-- Content -->
				<div
					v-else-if="detail"
					class="flex-1 overflow-y-auto p-4 space-y-4"
				>
					<!-- Cover -->
					<div class="aspect-[2/3] max-w-[200px] mx-auto rounded-lg overflow-hidden bg-muted">
						<img
							v-if="detail.cover"
							:src="detail.cover"
							:alt="detail.title"
							class="w-full h-full object-cover"
							referrerpolicy="no-referrer"
						>
						<div
							v-else
							class="w-full h-full flex items-center justify-center"
						>
							<UIcon
								name="i-lucide-image"
								class="w-12 h-12 text-muted-foreground"
							/>
						</div>
					</div>

					<!-- Title -->
					<div class="text-center">
						<h4 class="text-xl font-bold">
							{{ detail.title }}
						</h4>
						<div
							v-if="detail.alternateTitles.length > 0"
							class="text-sm text-muted-foreground mt-1"
						>
							{{ detail.alternateTitles[0] }}
						</div>
					</div>

					<!-- Meta -->
					<div class="flex flex-wrap gap-2 justify-center">
						<UBadge
							v-if="detail.type"
							variant="subtle"
						>
							{{ detail.type }}
						</UBadge>
						<UBadge
							v-for="status in detail.status"
							:key="status"
							variant="subtle"
						>
							{{ status }}
						</UBadge>
					</div>

					<!-- Synopsis -->
					<div
						v-if="detail.synopsis"
						class="text-sm text-muted-foreground"
					>
						{{ detail.synopsis }}
					</div>

					<!-- Details -->
					<div class="space-y-2 text-sm">
						<div
							v-if="detail.authors.length > 0"
							class="flex gap-2"
						>
							<span class="text-muted-foreground">Authors:</span>
							<span>{{ detail.authors.join(', ') }}</span>
						</div>
						<div
							v-if="detail.artists.length > 0"
							class="flex gap-2"
						>
							<span class="text-muted-foreground">Artists:</span>
							<span>{{ detail.artists.join(', ') }}</span>
						</div>
						<div v-if="detail.genres.length > 0">
							<span class="text-muted-foreground">Genres:</span>
							<div class="flex flex-wrap gap-1 mt-1">
								<UBadge
									v-for="genre in detail.genres"
									:key="genre"
									variant="outline"
									size="sm"
								>
									{{ genre }}
								</UBadge>
							</div>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="flex-shrink-0 p-4 border-t border-border">
					<UButton
						class="w-full"
						:variant="isInCart ? 'outline' : 'solid'"
						@click="$emit('toggle')"
					>
						<UIcon
							:name="isInCart ? 'i-lucide-check' : 'i-lucide-plus'"
							class="w-4 h-4 mr-2"
						/>
						{{ isInCart ? 'Selected' : 'Add to Selection' }}
					</UButton>
				</div>
			</div>
		</template>
	</USlideover>
</template>
