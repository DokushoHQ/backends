<script setup lang="ts">
import type { Source } from "~/composables/useSourceBrowser"

defineProps<{
	sources: Source[]
	title?: string
	emptyMessage?: string
}>()

const emit = defineEmits<{
	select: [source: Source]
}>()
</script>

<template>
	<div class="space-y-4">
		<p
			v-if="title"
			class="text-sm font-medium"
		>
			{{ title }}
		</p>
		<div
			v-if="sources.length === 0"
			class="text-sm text-muted-foreground"
		>
			{{ emptyMessage || "No sources available" }}
		</div>
		<div
			v-else
			class="grid grid-cols-2 gap-2"
		>
			<UButton
				v-for="source in sources"
				:key="source.id"
				variant="outline"
				class="h-auto py-3 justify-start gap-3"
				@click="emit('select', source)"
			>
				<img
					v-if="source.icon"
					:src="source.icon"
					:alt="source.name"
					class="h-6 w-6 rounded"
					referrerpolicy="no-referrer"
				>
				<UIcon
					v-else
					name="i-lucide-book-open"
					class="h-6 w-6"
				/>
				<span>{{ source.name }}</span>
			</UButton>
		</div>
	</div>
</template>
