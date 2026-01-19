<script setup lang="ts">
definePageMeta({
	title: "Job Settings",
	layout: "default",
})

const toast = useToast()

// Job definitions
const jobs = ref([
	{
		type: "FETCH_LATEST" as const,
		title: "Fetch Latest Updates",
		description: "Check all sources for new chapters on tracked series",
		icon: "i-lucide-refresh-cw",
		loading: false,
	},
	{
		type: "REFRESH_ALL" as const,
		title: "Refresh All Series",
		description: "Queue full refresh for all tracked series with staggered delays",
		icon: "i-lucide-database",
		loading: false,
	},
	{
		type: "RETRY_FAILED_PAGES" as const,
		title: "Retry Failed Pages",
		description: "Retry downloading pages that failed previously",
		icon: "i-lucide-image-off",
		loading: false,
	},
	{
		type: "REINDEX_ALL" as const,
		title: "Reindex All Series",
		description: "Force re-index all series in Meilisearch",
		icon: "i-lucide-search",
		loading: false,
	},
])

async function triggerJob(job: (typeof jobs.value)[number]) {
	job.loading = true
	try {
		const result = await $fetch("/api/jobs/trigger", {
			method: "POST",
			body: { type: job.type },
		})

		toast.add({
			title: "Job Queued",
			description: `${job.title} job has been queued (ID: ${result.jobId})`,
			color: "success",
		})
	}
	catch {
		toast.add({
			title: "Failed to Queue Job",
			description: `Could not queue ${job.title} job`,
			color: "error",
		})
	}
	finally {
		job.loading = false
	}
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar
				title="Job Settings"
				description="Manually trigger background jobs"
			>
				<template #left>
					<UButton
						variant="ghost"
						icon="i-lucide-arrow-left"
						to="/jobs"
					/>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="space-y-6">
				<!-- Manual Job Triggers Section -->
				<div>
					<h2 class="text-lg font-semibold mb-4">
						Manual Job Triggers
					</h2>
					<div class="grid gap-4 md:grid-cols-2">
						<UCard
							v-for="job in jobs"
							:key="job.type"
						>
							<div class="flex items-start gap-4">
								<div class="size-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
									<UIcon
										:name="job.icon"
										class="size-5 text-primary"
									/>
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="font-medium">
										{{ job.title }}
									</h3>
									<p class="text-sm text-muted-foreground mt-1">
										{{ job.description }}
									</p>
									<UButton
										class="mt-3"
										size="sm"
										:loading="job.loading"
										@click="triggerJob(job)"
									>
										Run Now
									</UButton>
								</div>
							</div>
						</UCard>
					</div>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
