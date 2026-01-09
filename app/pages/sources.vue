<script setup lang="ts">
definePageMeta({
	title: "Sources",
})

const { isAdmin } = await useAuth()
const { formatRelativeTime } = useFormatters()

const { data, pending, refresh } = await useFetch("/api/sources/health")

const refreshingSource = ref<string | null>(null)

async function triggerSourceRefresh(sourceId: string) {
	refreshingSource.value = sourceId
	try {
		await $fetch(`/api/sources/${sourceId}/refresh`, { method: "POST" })
		await refresh()
	}
	catch (error) {
		console.error("Failed to trigger refresh:", error)
	}
	finally {
		refreshingSource.value = null
	}
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar
				title="Source Health"
				description="Monitor scraper health and failures"
			>
				<template #trailing>
					<UButton
						icon="i-lucide-refresh-cw"
						variant="ghost"
						:loading="pending"
						@click="refresh()"
					>
						Refresh
					</UButton>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<!-- Empty State -->
			<div
				v-if="data && data.sources.length === 0"
				class="flex flex-col items-center justify-center py-12"
			>
				<div class="rounded-full bg-muted p-4 mb-4">
					<UIcon
						name="i-lucide-server"
						class="h-8 w-8 text-muted-foreground"
					/>
				</div>
				<h3 class="text-lg font-semibold">
					No sources configured
				</h3>
				<p class="text-muted-foreground">
					Sources will appear here once they are set up.
				</p>
			</div>

			<div
				v-else-if="data"
				class="space-y-6"
			>
				<!-- Stats Cards -->
				<div class="grid gap-4 md:grid-cols-3">
					<UCard>
						<div class="flex items-center gap-4">
							<div class="p-2 rounded-lg bg-primary/10">
								<UIcon
									name="i-lucide-server"
									class="h-5 w-5 text-primary"
								/>
							</div>
							<div>
								<p class="text-sm text-muted-foreground">
									Active Sources
								</p>
								<p class="text-2xl font-bold">
									{{ data.stats.enabledCount }}
								</p>
								<p class="text-xs text-muted-foreground">
									{{ data.stats.totalCount }} total
								</p>
							</div>
						</div>
					</UCard>
					<UCard>
						<div class="flex items-center gap-4">
							<div class="p-2 rounded-lg bg-destructive/10">
								<UIcon
									name="i-lucide-alert-triangle"
									class="h-5 w-5 text-destructive"
								/>
							</div>
							<div>
								<p class="text-sm text-muted-foreground">
									Failing Series
								</p>
								<p class="text-2xl font-bold">
									{{ data.stats.totalFailingSeries }}
								</p>
								<p class="text-xs text-muted-foreground">
									Need attention
								</p>
							</div>
						</div>
					</UCard>
					<UCard>
						<div class="flex items-center gap-4">
							<div class="p-2 rounded-lg bg-muted">
								<UIcon
									name="i-lucide-clock"
									class="h-5 w-5 text-muted-foreground"
								/>
							</div>
							<div>
								<p class="text-sm text-muted-foreground">
									Last Series Update
								</p>
								<p class="text-2xl font-bold">
									{{ formatRelativeTime(data.stats.mostRecentActivity) }}
								</p>
								<p class="text-xs text-muted-foreground">
									Most recent
								</p>
							</div>
						</div>
					</UCard>
				</div>

				<!-- Source Cards -->
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					<SourceHealthCard
						v-for="{ source, health, queueStats } in data.sources"
						:key="source.id"
						:source="source"
						:health="health"
						:queue-stats="queueStats"
						:is-admin="isAdmin"
						:is-refreshing="refreshingSource === source.id"
						@refresh="triggerSourceRefresh"
					/>
				</div>
			</div>

			<!-- Loading State -->
			<div
				v-else-if="pending"
				class="flex justify-center py-12"
			>
				<UIcon
					name="i-lucide-loader-2"
					class="h-8 w-8 animate-spin text-muted-foreground"
				/>
			</div>
		</template>
	</UDashboardPanel>
</template>
