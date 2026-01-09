<script setup lang="ts">
const props = defineProps<{
	serieId: string
}>()

const emit = defineEmits<{
	refreshed: []
}>()

const loading = ref(false)

async function handleRefresh() {
	loading.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/refresh`, {
			method: "POST",
		})
		emit("refreshed")
	}
	catch (e: unknown) {
		console.error("Failed to refresh metadata:", e)
	}
	finally {
		loading.value = false
	}
}
</script>

<template>
	<UButton
		variant="outline"
		size="sm"
		:disabled="loading"
		@click="handleRefresh"
	>
		<UIcon
			name="i-lucide-refresh-cw"
			class="h-4 w-4"
			:class="{ 'animate-spin': loading }"
		/>
		Refresh
	</UButton>
</template>
