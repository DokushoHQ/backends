<script setup lang="ts">
import type { SerieDetail } from "~/composables/useSourceBrowser"

defineProps<{
	detail: SerieDetail | null
	loading: boolean
	hasSelection: boolean
	// Action button
	actionPending: boolean
	actionDisabled?: boolean
	actionLabel: string
	actionLoadingLabel: string
	actionIcon: string
}>()

const emit = defineEmits<{
	action: []
}>()
</script>

<template>
	<div class="h-full flex flex-col min-h-0">
		<!-- Empty state -->
		<div
			v-if="!hasSelection"
			class="flex-1 flex items-center justify-center text-muted-foreground"
		>
			<p class="text-sm text-center">
				Select a series to see details
			</p>
		</div>

		<!-- Loading skeleton -->
		<div
			v-else-if="loading"
			class="space-y-4 p-4"
		>
			<div class="flex gap-4">
				<USkeleton class="h-48 w-32 rounded" />
				<div class="flex-1 space-y-2">
					<USkeleton class="h-6 w-3/4" />
					<USkeleton class="h-4 w-1/2" />
					<USkeleton class="h-4 w-1/3" />
				</div>
			</div>
			<USkeleton class="h-20 w-full" />
		</div>

		<!-- Detail content -->
		<template v-else-if="detail">
			<div class="flex-1 overflow-y-auto min-h-0 p-4">
				<div class="space-y-4">
					<!-- Header with cover and title -->
					<div class="flex gap-4">
						<div class="h-48 w-32 bg-muted rounded overflow-hidden shrink-0">
							<img
								v-if="detail.cover"
								:src="detail.cover"
								:alt="detail.title"
								class="h-full w-full object-cover"
							>
							<div
								v-else
								class="h-full w-full flex items-center justify-center"
							>
								<UIcon
									name="i-lucide-book-open"
									class="h-10 w-10 text-muted-foreground"
								/>
							</div>
						</div>
						<div class="flex-1 min-w-0">
							<h3 class="font-semibold text-lg">
								{{ detail.title }}
							</h3>
							<div class="flex flex-wrap gap-1 mt-2">
								<UBadge
									v-if="detail.type"
									variant="outline"
								>
									{{ detail.type }}
								</UBadge>
								<UBadge
									v-for="s in detail.status"
									:key="s"
									:variant="s === 'Completed' ? 'solid' : 'subtle'"
								>
									{{ s }}
								</UBadge>
							</div>
							<p
								v-if="detail.authors.length > 0"
								class="text-sm text-muted-foreground mt-2"
							>
								<span class="font-medium">Authors:</span> {{ detail.authors.join(", ") }}
							</p>
							<p
								v-if="detail.artists.length > 0 && detail.artists.join(',') !== detail.authors.join(',')"
								class="text-sm text-muted-foreground"
							>
								<span class="font-medium">Artists:</span> {{ detail.artists.join(", ") }}
							</p>
						</div>
					</div>

					<!-- Genres -->
					<div v-if="detail.genres.length > 0">
						<p class="text-sm font-medium mb-1">
							Genres
						</p>
						<div class="flex flex-wrap gap-1.5">
							<UBadge
								v-for="genre in detail.genres"
								:key="genre"
								variant="outline"
							>
								{{ genre }}
							</UBadge>
						</div>
					</div>

					<!-- Synopsis -->
					<div v-if="detail.synopsis">
						<p class="text-sm font-medium mb-1">
							Synopsis
						</p>
						<p class="text-sm text-muted-foreground whitespace-pre-line">
							{{ detail.synopsis }}
						</p>
					</div>

					<!-- Alternate titles -->
					<div v-if="detail.alternateTitles.length > 0">
						<p class="text-sm font-medium mb-1">
							Alternative Titles
						</p>
						<p class="text-sm text-muted-foreground">
							{{ detail.alternateTitles.join(" • ") }}
						</p>
					</div>
				</div>
			</div>

			<!-- Action button -->
			<div class="pt-3 mt-3 border-t shrink-0 px-4 pb-4">
				<UButton
					class="w-full"
					size="lg"
					:disabled="actionPending || actionDisabled"
					@click="emit('action')"
				>
					<UIcon
						v-if="actionPending"
						name="i-lucide-loader-2"
						class="h-4 w-4 animate-spin"
					/>
					<UIcon
						v-else
						:name="actionIcon"
						class="h-4 w-4"
					/>
					{{ actionPending ? actionLoadingLabel : actionLabel }}
				</UButton>
			</div>
		</template>
	</div>
</template>
