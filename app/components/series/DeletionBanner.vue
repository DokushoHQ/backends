<script setup lang="ts">
const props = defineProps<{
	serieId: string
	deletedAt: string | null
	scheduledDeleteAt: string | null
	isAdmin: boolean
}>()

const emit = defineEmits<{
	restored: []
}>()

const loading = ref(false)

const { formatRelativeTime } = useFormatters()

const formattedDeletedAt = computed(() =>
	props.deletedAt ? formatRelativeTime(props.deletedAt) : "",
)

const formattedScheduledAt = computed(() => {
	if (!props.scheduledDeleteAt) return ""
	const date = new Date(props.scheduledDeleteAt)
	return date.toLocaleDateString() + " at " + date.toLocaleTimeString()
})

async function handleRestore() {
	loading.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/restore`, {
			method: "POST",
		})
		emit("restored")
	}
	catch (e: unknown) {
		console.error("Failed to restore series:", e)
	}
	finally {
		loading.value = false
	}
}
</script>

<template>
	<UAlert
		icon="i-lucide-alert-triangle"
		color="warning"
		variant="subtle"
		title="This series is scheduled for deletion"
	>
		<template #description>
			<p>
				Deleted {{ formattedDeletedAt }}.
				<span v-if="formattedScheduledAt">
					Will be permanently removed on {{ formattedScheduledAt }}.
				</span>
			</p>
		</template>
		<template
			v-if="isAdmin"
			#actions
		>
			<UButton
				size="sm"
				variant="outline"
				:disabled="loading"
				@click="handleRestore"
			>
				<UIcon
					v-if="loading"
					name="i-lucide-loader-2"
					class="h-4 w-4 animate-spin"
				/>
				<UIcon
					v-else
					name="i-lucide-undo"
					class="h-4 w-4"
				/>
				Restore
			</UButton>
		</template>
	</UAlert>
</template>
