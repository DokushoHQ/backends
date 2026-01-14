<script setup lang="ts">
defineProps<{
	title: string
	cover: string | null
	imported: boolean
	selected: boolean
}>()

const emit = defineEmits<{
	click: []
	toggle: []
}>()

function handleCheckboxClick(e: Event) {
	e.stopPropagation()
	emit("toggle")
}
</script>

<template>
	<div
		class="flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer"
		:class="[
			imported ? 'border-border bg-muted/50 cursor-not-allowed' : 'border-border hover:border-primary hover:bg-muted/30',
			selected && !imported ? 'border-primary bg-primary/5' : '',
		]"
		@click="$emit('click')"
	>
		<!-- Checkbox or Lock -->
		<div
			class="flex-shrink-0"
			@click="handleCheckboxClick"
		>
			<UIcon
				v-if="imported"
				name="i-lucide-lock"
				class="w-5 h-5 text-muted-foreground"
			/>
			<UCheckbox
				v-else
				:model-value="selected"
				@click.stop
				@update:model-value="$emit('toggle')"
			/>
		</div>

		<!-- Cover -->
		<div class="flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-muted">
			<img
				v-if="cover"
				:src="cover"
				:alt="title"
				class="w-full h-full object-cover"
				referrerpolicy="no-referrer"
			>
			<div
				v-else
				class="w-full h-full flex items-center justify-center"
			>
				<UIcon
					name="i-lucide-image"
					class="w-5 h-5 text-muted-foreground"
				/>
			</div>
		</div>

		<!-- Info -->
		<div class="flex-1 min-w-0">
			<div
				class="font-medium truncate"
				:class="imported ? 'text-muted-foreground' : ''"
			>
				{{ title }}
			</div>
			<div
				v-if="imported"
				class="text-xs text-muted-foreground"
			>
				Already in Library
			</div>
		</div>

		<!-- Arrow -->
		<UIcon
			v-if="!imported"
			name="i-lucide-chevron-right"
			class="w-5 h-5 text-muted-foreground flex-shrink-0"
		/>
	</div>
</template>
