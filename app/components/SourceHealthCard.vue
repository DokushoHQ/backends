<script setup lang="ts">
interface Props {
	source: {
		id: string
		external_id: string
		name: string
		icon: string | null
		enabled: boolean
	}
	health: {
		totalSeries: number
		failingCount: number
		lastChecked: string | Date | null
	}
	queueStats: {
		waiting: number
		active: number
	}
	isAdmin: boolean
	isRefreshing: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
	refresh: [sourceId: string]
}>()

const { formatRelativeTime } = useFormatters()

const healthySeries = computed(() => props.health.totalSeries - props.health.failingCount)

const healthPercentage = computed(() => {
	if (props.health.totalSeries === 0) return 0
	return (healthySeries.value / props.health.totalSeries) * 100
})
</script>

<template>
	<UCard :class="{ 'opacity-60': !source.enabled }">
		<div class="space-y-4">
			<!-- Header -->
			<div class="flex items-start justify-between">
				<div class="flex items-center gap-3">
					<div :class="['rounded-md p-2', source.enabled ? 'bg-primary/10' : 'bg-muted']">
						<UIcon
							name="i-lucide-server"
							:class="['h-4 w-4', source.enabled ? 'text-primary' : 'text-muted-foreground']"
						/>
					</div>
					<div>
						<h3 class="font-semibold">
							{{ source.name }}
						</h3>
						<p class="text-xs text-muted-foreground">
							{{ source.external_id }}
						</p>
					</div>
				</div>
				<!-- Status Badge -->
				<UBadge
					v-if="!source.enabled"
					color="neutral"
					variant="outline"
					class="gap-1"
				>
					<UIcon
						name="i-lucide-power"
						class="h-3 w-3"
					/>
					Disabled
				</UBadge>
				<UBadge
					v-else-if="health.failingCount === 0"
					color="success"
					variant="subtle"
					class="gap-1"
				>
					<UIcon
						name="i-lucide-check-circle"
						class="h-3 w-3"
					/>
					Healthy
				</UBadge>
				<UBadge
					v-else
					color="error"
					variant="subtle"
					class="gap-1"
				>
					<UIcon
						name="i-lucide-alert-triangle"
						class="h-3 w-3"
					/>
					{{ health.failingCount }} failing
				</UBadge>
			</div>

			<!-- Series Progress -->
			<div class="space-y-2">
				<div class="flex items-center justify-between text-sm">
					<span class="text-muted-foreground flex items-center gap-1">
						<UIcon
							name="i-lucide-book-open"
							class="h-3 w-3"
						/>
						Series
					</span>
					<span class="font-medium">
						{{ healthySeries }} / {{ health.totalSeries }}
					</span>
				</div>
				<UProgress
					v-if="health.totalSeries > 0"
					:model-value="healthPercentage"
					size="sm"
				/>
			</div>

			<!-- Last Checked -->
			<div class="flex items-center justify-between text-sm">
				<span class="text-muted-foreground flex items-center gap-1">
					<UIcon
						name="i-lucide-clock"
						class="h-3 w-3"
					/>
					Last series update
				</span>
				<span class="font-medium">{{ formatRelativeTime(health.lastChecked) }}</span>
			</div>

			<!-- Queue Stats -->
			<div
				v-if="queueStats.waiting > 0 || queueStats.active > 0"
				class="flex items-center justify-between text-sm"
			>
				<span class="text-muted-foreground">Queue</span>
				<span class="font-medium">
					<template v-if="queueStats.active > 0">{{ queueStats.active }} active</template>
					<template v-if="queueStats.active > 0 && queueStats.waiting > 0">, </template>
					<template v-if="queueStats.waiting > 0">{{ queueStats.waiting }} waiting</template>
				</span>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-2 pt-2">
				<UButton
					v-if="health.failingCount > 0"
					variant="outline"
					size="sm"
					class="flex-1"
					:to="`/series?filter=failing&source=${source.id}`"
				>
					View Failing
				</UButton>
				<UButton
					v-if="isAdmin && source.enabled"
					variant="outline"
					size="sm"
					:loading="isRefreshing"
					@click="emit('refresh', source.id)"
				>
					<UIcon
						name="i-lucide-refresh-cw"
						:class="{ 'animate-spin': isRefreshing }"
					/>
					{{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
				</UButton>
			</div>
		</div>
	</UCard>
</template>
