<script setup lang="ts">
definePageMeta({
	title: "Job Settings",
	layout: "default",
})

const toast = useToast()

// Purge all queues
const purgeDialogOpen = ref(false)
const purgeConfirmText = ref("")
const purgePending = ref(false)

const canPurge = computed(() => purgeConfirmText.value === "PURGE ALL")

async function purgeAllQueues() {
	if (!canPurge.value) return

	purgePending.value = true
	try {
		const result = await $fetch("/api/jobs/purge-all", { method: "POST" })

		if (result.success) {
			toast.add({
				title: "Queues Purged",
				description: result.message,
				color: "success",
			})
		}
		else {
			toast.add({
				title: "Partial Purge",
				description: result.message,
				color: "warning",
			})
		}

		purgeDialogOpen.value = false
		purgeConfirmText.value = ""
	}
	catch (err) {
		toast.add({
			title: "Purge Failed",
			description: err instanceof Error ? err.message : "Failed to purge queues",
			color: "error",
		})
	}
	finally {
		purgePending.value = false
	}
}

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
	<div class="job-settings-page">
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

					<!-- Danger Zone Section -->
					<div class="danger-zone">
						<h2 class="text-lg font-semibold mb-4 text-red-500">
							Danger Zone
						</h2>
						<UCard class="border-red-500/30">
							<div class="flex items-start gap-4">
								<div class="size-11 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
									<UIcon
										name="i-lucide-trash-2"
										class="size-5 text-red-500"
									/>
								</div>
								<div class="flex-1 min-w-0">
									<h3 class="font-medium">
										Purge All Queues
									</h3>
									<p class="text-sm text-muted-foreground mt-1">
										Permanently delete all jobs from all queues. This includes active, waiting, completed, and failed jobs.
									</p>
									<UButton
										class="mt-3"
										size="sm"
										color="error"
										variant="outline"
										@click="purgeDialogOpen = true"
									>
										<UIcon
											name="i-lucide-trash-2"
											class="size-4 mr-2"
										/>
										Purge All Data
									</UButton>
								</div>
							</div>
						</UCard>
					</div>
				</div>
			</template>
		</UDashboardPanel>

		<!-- Purge All Confirmation Modal -->
		<UModal v-model:open="purgeDialogOpen">
			<template #content>
				<div class="purge-modal">
					<div class="modal-header">
						<div class="warning-icon">
							<UIcon
								name="i-lucide-alert-triangle"
								class="size-6"
							/>
						</div>
						<h2 class="modal-title">
							Purge All Queues
						</h2>
					</div>

					<div class="modal-body">
						<p class="warning-text">
							This will <strong>permanently delete all jobs</strong> from all queues, including:
						</p>
						<ul class="warning-list">
							<li>Active jobs (will be terminated)</li>
							<li>Waiting and delayed jobs</li>
							<li>Completed job history</li>
							<li>Failed job history</li>
						</ul>
						<p class="warning-text danger">
							This action cannot be undone.
						</p>

						<div class="confirm-input">
							<label for="purge-confirm">
								Type <code>PURGE ALL</code> to confirm:
							</label>
							<UInput
								id="purge-confirm"
								v-model="purgeConfirmText"
								placeholder="PURGE ALL"
								class="mt-2"
							/>
						</div>
					</div>

					<div class="modal-actions">
						<UButton
							variant="outline"
							@click="purgeDialogOpen = false"
						>
							Cancel
						</UButton>
						<UButton
							color="error"
							:disabled="!canPurge"
							:loading="purgePending"
							@click="purgeAllQueues"
						>
							<UIcon
								name="i-lucide-trash-2"
								class="size-4 mr-2"
							/>
							Purge All Queues
						</UButton>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<style scoped>
.danger-zone {
	margin-top: 2rem;
	padding-top: 2rem;
	border-top: 1px solid var(--color-border);
}

.purge-modal {
	padding: 1.5rem;
}

.modal-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	margin-bottom: 1.25rem;
}

.warning-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 0.625rem;
	background: oklch(0.65 0.2 25 / 0.12);
	color: oklch(0.65 0.2 25);
}

.modal-title {
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--color-text);
}

.modal-body {
	margin-bottom: 1.5rem;
}

.warning-text {
	font-size: 0.875rem;
	color: var(--color-text-muted);
	margin-bottom: 0.75rem;
}

.warning-text strong {
	color: var(--color-text);
}

.warning-text.danger {
	color: oklch(0.65 0.2 25);
	font-weight: 500;
}

.warning-list {
	list-style: disc;
	padding-left: 1.25rem;
	margin-bottom: 1rem;
	font-size: 0.8125rem;
	color: var(--color-text-muted);
}

.warning-list li {
	margin-bottom: 0.25rem;
}

.confirm-input {
	margin-top: 1.25rem;
	padding-top: 1rem;
	border-top: 1px solid var(--color-border);
}

.confirm-input label {
	font-size: 0.8125rem;
	color: var(--color-text);
}

.confirm-input code {
	padding: 0.125rem 0.375rem;
	background: var(--color-muted);
	border-radius: 0.25rem;
	font-size: 0.8125rem;
	font-weight: 600;
	color: oklch(0.65 0.2 25);
}

.modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 0.75rem;
}
</style>
