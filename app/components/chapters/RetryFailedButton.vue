<script setup lang="ts">
interface Props {
	scope: "global" | "serie"
	serieId?: string
	showModal?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	showModal: false,
})

const emit = defineEmits<{
	retried: [queued: number]
}>()

const toast = useToast()
const loading = ref(false)
const modalOpen = ref(false)

const queryParams = computed(() => props.serieId ? { serie_id: props.serieId } : {})

const { data: stats, refresh } = await useLazyFetch("/api/v1/chapters/failed-stats", {
	query: queryParams,
})

const hasFailures = computed(() =>
	stats.value && (stats.value.partialChapters > 0 || stats.value.failedChapters > 0),
)

function handleClick() {
	if (props.showModal) {
		modalOpen.value = true
	}
	else {
		handleRetry()
	}
}

async function handleRetry() {
	loading.value = true
	try {
		const result = await $fetch("/api/v1/chapters/retry-failed", {
			method: "POST",
			body: {
				scope: props.scope,
				serie_id: props.serieId,
			},
		})

		toast.add({
			title: "Retry Queued",
			description: `${result.queued} chapters queued for page retry`,
			color: "success",
		})

		emit("retried", result.queued)
		await refresh()
	}
	catch {
		toast.add({
			title: "Retry Failed",
			description: "Failed to queue page retry jobs",
			color: "error",
		})
	}
	finally {
		loading.value = false
	}
}

function handleModalCompleted() {
	emit("retried", 0)
	refresh()
}
</script>

<template>
	<div>
		<UButton
			v-if="hasFailures"
			variant="outline"
			size="sm"
			:title="`Retry failed (${stats?.failedPages ?? 0} pages)`"
			:loading="loading"
			@click="handleClick"
		>
			<UIcon
				name="i-lucide-refresh-cw"
				class="h-4 w-4"
			/>
			<span>Retry Failed ({{ stats?.failedPages ?? 0 }} pages)</span>
		</UButton>

		<ChaptersRetryProgressModal
			v-if="showModal"
			v-model:open="modalOpen"
			:scope="scope"
			:serie-id="serieId"
			@completed="handleModalCompleted"
		/>
	</div>
</template>
