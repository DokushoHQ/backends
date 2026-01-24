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
	<div class="sources-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UDashboardNavbar
					title="Sources"
					description="Monitor scraper health and manage data sources"
				>
					<template #right>
						<UButton
							icon="i-lucide-refresh-cw"
							variant="ghost"
							:loading="pending"
							@click="refresh()"
						>
							<span class="hidden sm:inline">Refresh</span>
						</UButton>
					</template>
				</UDashboardNavbar>
			</template>

			<template #body>
				<!-- Loading State -->
				<div
					v-if="pending && !data"
					class="loading-state"
				>
					<UIcon
						name="i-lucide-loader-2"
						class="loading-spinner"
					/>
				</div>

				<!-- Empty State -->
				<div
					v-else-if="data && data.sources.length === 0"
					class="empty-state"
				>
					<div class="empty-icon">
						<UIcon
							name="i-lucide-database"
							class="h-10 w-10"
						/>
					</div>
					<h2>No sources configured</h2>
					<p>Data sources will appear here once they are set up in the system.</p>
				</div>

				<!-- Main Content -->
				<div
					v-else-if="data"
					class="sources-content"
				>
					<!-- Stats Overview -->
					<div class="stats-section">
						<UiStatCardGrid :cols="3">
							<UiStatCard
								:value="data.stats.enabledCount"
								label="Active Sources"
								icon="i-lucide-database"
								color="blue"
							/>
							<UiStatCard
								:value="data.stats.totalFailingSeries"
								label="Failing Series"
								icon="i-lucide-alert-triangle"
								color="red"
							/>
							<UiStatCard
								:value="formatRelativeTime(data.stats.mostRecentActivity)"
								label="Last Activity"
								icon="i-lucide-clock"
								color="gray"
							/>
						</UiStatCardGrid>
					</div>

					<!-- Source Cards Grid -->
					<div class="sources-grid">
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
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
/* Stats section */
.stats-section {
	margin-bottom: 1.5rem;
}

/* Sources grid */
.sources-grid {
	display: grid;
	gap: 1rem;
	grid-template-columns: 1fr;
}

@media (min-width: 640px) {
	.sources-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (min-width: 1024px) {
	.sources-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

/* Loading state */
.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
}

.loading-spinner {
	width: 2.5rem;
	height: 2.5rem;
	color: var(--ui-text-muted);
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Empty state */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	text-align: center;
}

.empty-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 4.5rem;
	height: 4.5rem;
	margin-bottom: 1.5rem;
	border-radius: 50%;
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}

.empty-state h2 {
	font-size: var(--font-size-xl);
	font-weight: 600;
	color: var(--ui-text);
	margin-bottom: 0.5rem;
}

.empty-state p {
	font-size: var(--font-size-base);
	color: var(--ui-text-muted);
	max-width: 24rem;
}
</style>
