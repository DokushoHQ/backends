<script setup lang="ts">
definePageMeta({
	title: "Jobs",
	layout: "default",
})

const { data, error, refresh } = await useFetch("/api/jobs")
const { data: redisInfo } = await useFetch("/api/redis-info")

if (error.value) {
	console.error("Jobs fetch error:", error.value)
}

// Compute segments for a queue with pre-calculated percentages
function getQueueSegments(queue: {
	active?: number
	waiting?: number
	completed?: number
	failed?: number
	delayed?: number
	total?: number
}) {
	const total = queue.total ?? 0
	if (total === 0) return []

	return [
		{ key: "active", count: queue.active ?? 0 },
		{ key: "waiting", count: queue.waiting ?? 0 },
		{ key: "completed", count: queue.completed ?? 0 },
		{ key: "failed", count: queue.failed ?? 0 },
		{ key: "delayed", count: queue.delayed ?? 0 },
	]
		.filter(s => s.count > 0)
		.map(s => ({
			...s,
			percentage: Math.round((s.count / total) * 10000) / 100,
		}))
}

// Auto-refresh every 5 seconds
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
	refreshInterval = setInterval(() => {
		refresh()
	}, 5000)
})

onUnmounted(() => {
	if (refreshInterval) {
		clearInterval(refreshInterval)
	}
})
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar
				title="Job Queues"
				:description="`${data?.totalJobs.toLocaleString() ?? 0} total jobs`"
			/>
			<!-- Redis Info Bar -->
			<div
				v-if="redisInfo"
				class="flex items-center justify-center gap-8 py-2 px-4 bg-muted/50 border-t text-sm"
			>
				<div class="text-center">
					<div class="font-medium">
						{{ redisInfo.version }}
					</div>
					<div class="text-xs text-muted-foreground">
						Version
					</div>
				</div>
				<div class="text-center">
					<div class="font-medium">
						{{ redisInfo.uptimeDays }}
					</div>
					<div class="text-xs text-muted-foreground">
						Uptime (days)
					</div>
				</div>
				<div class="text-center">
					<div class="font-medium">
						{{ redisInfo.connectedClients }}
					</div>
					<div class="text-xs text-muted-foreground">
						Connections
					</div>
				</div>
				<div class="text-center">
					<div class="font-medium">
						{{ redisInfo.usedMemory }}
					</div>
					<div class="text-xs text-muted-foreground">
						Memory used
					</div>
				</div>
				<div
					v-if="redisInfo.maxMemory"
					class="text-center"
				>
					<div class="font-medium">
						{{ redisInfo.maxMemory }}
					</div>
					<div class="text-xs text-muted-foreground">
						Memory max
					</div>
				</div>
			</div>
		</template>

		<template #body>
			<!-- Error state -->
			<div
				v-if="error"
				class="py-12 text-center"
			>
				<div class="rounded-full bg-destructive/10 p-4 w-fit mx-auto mb-4">
					<UIcon
						name="i-lucide-alert-circle"
						class="size-8 text-destructive"
					/>
				</div>
				<h3 class="text-lg font-semibold">
					Failed to load jobs
				</h3>
				<p class="text-sm text-muted-foreground">
					{{ error.statusCode === 403 ? "You don't have permission to view this page" : error.message }}
				</p>
			</div>

			<div
				v-else-if="data"
				class="space-y-6"
			>
				<!-- Global Stats -->
				<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
					<div class="text-center p-4 rounded-lg bg-muted">
						<div class="text-2xl font-bold text-blue-500">
							{{ data.totalActive.toLocaleString() }}
						</div>
						<div class="text-sm text-muted-foreground">
							Active
						</div>
					</div>
					<div class="text-center p-4 rounded-lg bg-muted">
						<div class="text-2xl font-bold text-yellow-500">
							{{ data.totalWaiting.toLocaleString() }}
						</div>
						<div class="text-sm text-muted-foreground">
							Waiting
						</div>
					</div>
					<div class="text-center p-4 rounded-lg bg-muted">
						<div class="text-2xl font-bold text-green-500">
							{{ data.totalCompleted.toLocaleString() }}
						</div>
						<div class="text-sm text-muted-foreground">
							Completed
						</div>
					</div>
					<div class="text-center p-4 rounded-lg bg-muted">
						<div
							class="text-2xl font-bold"
							:class="data.totalFailed > 0 ? 'text-red-500' : 'text-muted-foreground'"
						>
							{{ data.totalFailed.toLocaleString() }}
						</div>
						<div class="text-sm text-muted-foreground">
							Failed
						</div>
					</div>
					<div class="text-center p-4 rounded-lg bg-muted">
						<div class="text-2xl font-bold text-cyan-500">
							{{ data.totalDelayed.toLocaleString() }}
						</div>
						<div class="text-sm text-muted-foreground">
							Delayed
						</div>
					</div>
				</div>

				<!-- Metrics Chart -->
				<UCard>
					<JobsActivityChart
						:height="200"
						show-queue-selector
					/>
				</UCard>

				<!-- Empty state -->
				<div
					v-if="data.stats.length === 0"
					class="py-12 text-center"
				>
					<div class="rounded-full bg-muted p-4 w-fit mx-auto mb-4">
						<UIcon
							name="i-lucide-briefcase"
							class="size-8 text-muted-foreground"
						/>
					</div>
					<h3 class="text-lg font-semibold">
						No job queues
					</h3>
					<p class="text-sm text-muted-foreground">
						Job queues will appear here once workers are running.
					</p>
				</div>

				<!-- Queue cards -->
				<div
					v-else
					class="grid gap-4 md:grid-cols-2"
				>
					<NuxtLink
						v-for="queue in data.stats"
						:key="queue.name"
						:to="`/jobs/${queue.name}`"
						class="block"
					>
						<UCard class="hover:shadow-md transition-shadow">
							<div class="space-y-3">
								<div class="flex items-center justify-between">
									<h3 class="font-medium">{{ queue.displayName }}</h3>
									<span
										v-if="queue.paused"
										class="text-xs text-muted-foreground"
									>[Paused]</span>
								</div>

								<div class="flex items-center gap-3">
									<div class="flex-1 h-6 bg-muted rounded-md overflow-hidden flex">
										<div
											v-for="segment in getQueueSegments(queue)"
											:key="segment.key"
											class="h-full flex items-center justify-center text-xs text-white font-medium"
											:class="{
												'bg-blue-500': segment.key === 'active',
												'bg-yellow-500': segment.key === 'waiting',
												'bg-green-500': segment.key === 'completed',
												'bg-red-500': segment.key === 'failed',
												'bg-cyan-500': segment.key === 'delayed',
											}"
											:style="{ width: `${segment.percentage}%` }"
										>
											<span v-if="segment.percentage > 8">{{ segment.count }}</span>
										</div>
									</div>
									<span class="text-sm text-muted-foreground whitespace-nowrap">
										{{ (queue.total ?? 0).toLocaleString() }} Jobs
									</span>
								</div>
							</div>
						</UCard>
					</NuxtLink>
				</div>
			</div>

			<!-- Loading state -->
			<div
				v-else
				class="flex items-center justify-center py-8"
			>
				<UIcon
					name="i-lucide-loader-2"
					class="size-6 animate-spin text-muted-foreground"
				/>
			</div>
		</template>
	</UDashboardPanel>
</template>
