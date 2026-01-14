<script setup lang="ts">
defineProps<{
	count: number
}>()

defineEmits<{
	click: []
}>()
</script>

<template>
	<button
		class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
		@click="$emit('click')"
	>
		<UIcon
			name="i-lucide-shopping-cart"
			class="w-4 h-4 text-primary"
		/>
		<span class="text-sm font-medium text-primary">{{ count }}</span>
	</button>
</template>
