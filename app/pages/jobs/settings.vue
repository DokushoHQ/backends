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
		type: "RECOMPUTE_ALL" as const,
		title: "Recompute All Series",
		description: "Run chapter deduplication then reindex all series in search engine",
		icon: "i-lucide-calculator",
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
	<div class="settings-page">
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
				<div class="page-content">
					<!-- Manual Job Triggers Section -->
					<UiContentCard
						title="Manual Job Triggers"
						description="Queue background jobs to run immediately"
						icon="i-lucide-play"
						color="blue"
					>
						<div class="job-triggers-grid">
							<div
								v-for="job in jobs"
								:key="job.type"
								class="job-trigger-card"
							>
								<div class="job-icon-wrapper">
									<UIcon
										:name="job.icon"
										class="job-icon"
									/>
								</div>
								<div class="job-info">
									<h3 class="job-title">
										{{ job.title }}
									</h3>
									<p class="job-description">
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
						</div>
					</UiContentCard>

					<!-- Danger Zone Section -->
					<UiContentCard
						title="Danger Zone"
						description="Destructive operations that cannot be undone"
						icon="i-lucide-triangle-alert"
						color="red"
						danger
					>
						<div class="danger-content">
							<div class="danger-item">
								<div class="danger-icon-wrapper">
									<UIcon
										name="i-lucide-trash-2"
										class="danger-icon"
									/>
								</div>
								<div class="danger-info">
									<h3 class="danger-title">
										Purge All Queues
									</h3>
									<p class="danger-description">
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
						</div>
					</UiContentCard>
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
.settings-page {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
}

.page-content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

/* Job triggers grid */
.job-triggers-grid {
	display: grid;
	gap: 1rem;
	padding: 1rem;
}

@media (min-width: 768px) {
	.job-triggers-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}

.job-trigger-card {
	display: flex;
	gap: 1rem;
	padding: 1rem;
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
}

.job-icon-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.75rem;
	height: 2.75rem;
	border-radius: 50%;
	background: var(--ui-primary-soft);
	flex-shrink: 0;
}

.job-icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-primary);
}

.job-info {
	flex: 1;
	min-width: 0;
}

.job-title {
	font-size: var(--font-size-base);
	font-weight: 500;
	color: var(--ui-text);
}

.job-description {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin-top: 0.25rem;
}

/* Danger content */
.danger-content {
	padding: 1rem;
}

.danger-item {
	display: flex;
	gap: 1rem;
	padding: 1rem;
	background: var(--ui-error-soft);
	border: 1px solid color-mix(in oklch, var(--ui-error) 25%, transparent);
	border-radius: 0.5rem;
}

.danger-icon-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.75rem;
	height: 2.75rem;
	border-radius: 50%;
	background: color-mix(in oklch, var(--ui-error) 15%, var(--ui-bg-elevated));
	flex-shrink: 0;
}

.danger-icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-error);
}

.danger-info {
	flex: 1;
	min-width: 0;
}

.danger-title {
	font-size: var(--font-size-base);
	font-weight: 500;
	color: var(--ui-text);
}

.danger-description {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin-top: 0.25rem;
}

/* Purge modal */
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
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

.modal-title {
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--ui-text);
}

.modal-body {
	margin-bottom: 1.5rem;
}

.warning-text {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin-bottom: 0.75rem;
}

.warning-text strong {
	color: var(--ui-text);
}

.warning-text.danger {
	color: var(--ui-error);
	font-weight: 500;
}

.warning-list {
	list-style: disc;
	padding-left: 1.25rem;
	margin-bottom: 1rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

.warning-list li {
	margin-bottom: 0.25rem;
}

.confirm-input {
	margin-top: 1.25rem;
	padding-top: 1rem;
	border-top: 1px solid var(--ui-border);
}

.confirm-input label {
	font-size: var(--font-size-sm);
	color: var(--ui-text);
}

.confirm-input code {
	padding: 0.125rem 0.375rem;
	background: var(--ui-bg-muted);
	border-radius: 0.25rem;
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-error);
}

.modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 0.75rem;
}
</style>
