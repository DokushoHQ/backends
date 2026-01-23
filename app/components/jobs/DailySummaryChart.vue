<script setup lang="ts">
interface DailyData {
	date: string
	completed: number
	failed: number
}

interface Props {
	data: DailyData[]
}

const props = defineProps<Props>()

// Transform data for BarChart format - use index for x-axis, format with xFormatter
const chartData = computed(() => {
	return props.data.map((d, i) => ({
		index: i,
		date: d.date,
		completed: d.completed,
		failed: d.failed,
	}))
})

// Chart categories configuration - must use hex colors
const chartCategories = {
	completed: { name: "Completed", color: "#22c55e" },
	failed: { name: "Failed", color: "#ef4444" },
}

// X-axis formatter - converts index to date label
function xFormatter(index: number): string {
	const item = props.data[index]
	if (!item) return ""
	const date = new Date(item.date)
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Y-axis formatter
function yFormatter(value: number): string {
	return value.toLocaleString()
}
</script>

<template>
	<div class="daily-chart">
		<div
			v-if="chartData.length > 0"
			class="chart-container"
			:style="{ '--vis-legend-spacing': '1.5rem' }"
		>
			<BarChart
				:data="chartData"
				:height="180"
				:categories="chartCategories"
				:y-axis="['completed', 'failed']"
				:stacked="true"
				:x-formatter="xFormatter"
				:y-formatter="yFormatter"
				:x-grid-line="false"
				:y-grid-line="false"
			/>
		</div>

		<div
			v-else
			class="empty-state"
		>
			<span>No activity data yet</span>
		</div>
	</div>
</template>

<style scoped>
.daily-chart {
	padding: 1rem 1rem 0.5rem 1rem;
}

.empty-state {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 160px;
	color: var(--ui-text-muted);
	font-size: var(--font-size-sm);
}
</style>
