<script setup lang="ts">
const props = defineProps<{
	serieId: string
	serieTitle: string
}>()

const emit = defineEmits<{
	deleted: []
}>()

const open = defineModel<boolean>("open", { default: false })
const loading = ref(false)

async function handleDelete() {
	loading.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/delete`, {
			method: "POST",
		})
		open.value = false
		emit("deleted")
	}
	catch (e: unknown) {
		console.error("Failed to delete series:", e)
	}
	finally {
		loading.value = false
	}
}
</script>

<template>
	<UModal v-model:open="open">
		<UButton
			color="error"
			variant="soft"
			size="sm"
			@click="open = true"
		>
			<UIcon
				name="i-lucide-trash-2"
				class="h-4 w-4"
			/>
			<span class="hidden sm:inline">Delete</span>
		</UButton>

		<template #content>
			<UCard>
				<template #header>
					<h3 class="text-lg font-semibold">
						Delete Series
					</h3>
				</template>

				<p class="text-muted-foreground">
					Are you sure you want to delete <strong>{{ serieTitle }}</strong>?
				</p>
				<p class="text-sm text-muted-foreground mt-2">
					This will schedule the series for deletion. You can restore it within 7 days.
				</p>

				<template #footer>
					<div class="flex justify-end gap-2">
						<UButton
							variant="outline"
							@click="open = false"
						>
							Cancel
						</UButton>
						<UButton
							color="error"
							:disabled="loading"
							@click="handleDelete"
						>
							<UIcon
								v-if="loading"
								name="i-lucide-loader-2"
								class="h-4 w-4 animate-spin"
							/>
							Delete
						</UButton>
					</div>
				</template>
			</UCard>
		</template>
	</UModal>
</template>
