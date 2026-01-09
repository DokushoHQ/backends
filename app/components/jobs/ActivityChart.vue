<script setup lang="ts">
withDefaults(defineProps<{
	height?: number
	showQueueSelector?: boolean
}>(), {
	height: 200,
	showQueueSelector: false,
})

const { formatDuration } = useFormatters()
const { data: metrics, refresh } = await useFetch("/api/queue-metrics")

// Auto-refresh every minute
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
	refreshInterval = setInterval(() => refresh(), 60000)
})

onUnmounted(() => {
	if (refreshInterval) clearInterval(refreshInterval)
})

// View mode (only used when showQueueSelector is true)
const viewMode = ref<"aggregated" | "perQueue">("aggregated")
const selectedQueue = ref<string | undefined>(undefined)

// Current selection label for dropdown button
const currentSelectionLabel = computed(() => {
	if (viewMode.value === "aggregated") return "All Queues"
	const queueData = selectedQueue.value && metrics.value?.perQueue[selectedQueue.value]
	if (queueData) {
		return queueData.displayName
	}
	return "Select Queue"
})

// Dropdown menu items
const metricsMenuItems = computed(() => {
	const queueChildren = metrics.value?.perQueue
		? Object.entries(metrics.value.perQueue).map(([key, value]) => ({
				label: value.displayName,
				onSelect: () => {
					viewMode.value = "perQueue"
					selectedQueue.value = key
				},
			}))
		: []

	return [
		{
			label: "All Queues",
			icon: "i-lucide-layers",
			onSelect: () => {
				viewMode.value = "aggregated"
			},
		},
		{
			label: "Per Queue",
			icon: "i-lucide-list",
			children: queueChildren,
		},
	]
})

// Chart data with corrected x-axis
const chartData = computed(() => {
	if (!metrics.value) return []

	const source = viewMode.value === "aggregated"
		? metrics.value.aggregated
		: selectedQueue.value
			? metrics.value.perQueue[selectedQueue.value]
			: null

	if (!source) return []

	// API returns chronological data: index 0 = oldest, index N-1 = newest
	// Chart: low minute values on LEFT, high on RIGHT
	// xFormatter converts minute to "time ago" label
	return source.completed.map((completed, i) => ({
		minute: i,
		completed,
		failed: source.failed[i] || 0,
	}))
})

// Formatter inverts minute to "time ago": minute=0 (left) → "3h", minute=max (right) → "0m"
const xFormatter = computed(() => {
	const max = chartData.value.length - 1
	return (minute: number) => formatDuration(max - minute)
})

const chartCategories = {
	completed: { name: "Completed", color: "#22c55e" },
	failed: { name: "Failed", color: "#ef4444" },
}
</script>

<template>
	<div class="space-y-4">
		<div
			v-if="showQueueSelector"
			class="flex items-center justify-between"
		>
			<h3 class="font-medium">
				Job Activity
			</h3>
			<UDropdownMenu :items="metricsMenuItems">
				<UButton
					:label="currentSelectionLabel"
					color="neutral"
					variant="outline"
					size="xs"
					trailing-icon="i-lucide-chevron-down"
				/>
			</UDropdownMenu>
		</div>
		<div
			v-if="chartData.length > 0"
			:style="{ height: `${height}px` }"
		>
			<LineChart
				:data="chartData"
				:height="height"
				:categories="chartCategories"
				y-label="Jobs"
				:x-formatter="xFormatter"
				:y-formatter="(value: number) => value.toLocaleString()"
				:tooltip-title-formatter="(d: { minute: number }) => formatDuration(chartData.length - 1 - d.minute) + ' ago'"
			/>
		</div>
		<div
			v-else
			class="flex items-center justify-center text-muted-foreground"
			:style="{ height: `${height}px` }"
		>
			<span v-if="showQueueSelector">No metrics data yet. Metrics are collected per minute when jobs are processed.</span>
			<span v-else>No activity data yet</span>
		</div>
	</div>
</template>
