import updateSchedulerQueue from "../queues/update-scheduler"

export default defineNitroPlugin(async () => {
	const config = useRuntimeConfig()

	// Skip if disabled (useful for worker processes)
	if (config.skipSchedulerSetup) {
		console.log("Skipping scheduler setup (disabled via env)")
		return
	}

	console.log("Setting up scheduled jobs...")

	try {
		// Set up FETCH_LATEST repeatable job (check for updates)
		const fetchLatestCron = config.schedulerFetchLatestCron
		if (fetchLatestCron) {
			await updateSchedulerQueue.upsertJobScheduler(
				"fetch-latest-scheduler",
				{ pattern: fetchLatestCron },
				{
					name: "update-scheduler",
					data: { type: "FETCH_LATEST" },
				},
			)
			console.log(`Scheduled FETCH_LATEST with cron: ${fetchLatestCron}`)
		}

		// Set up REFRESH_ALL repeatable job (full refresh)
		const refreshAllCron = config.schedulerRefreshAllCron
		if (refreshAllCron) {
			await updateSchedulerQueue.upsertJobScheduler(
				"refresh-all-scheduler",
				{ pattern: refreshAllCron },
				{
					name: "update-scheduler",
					data: { type: "REFRESH_ALL" },
				},
			)
			console.log(`Scheduled REFRESH_ALL with cron: ${refreshAllCron}`)
		}

		// Set up RETRY_FAILED_PAGES repeatable job (retry failed page downloads)
		const retryFailedPagesCron = config.schedulerRetryFailedPagesCron
		if (retryFailedPagesCron) {
			await updateSchedulerQueue.upsertJobScheduler(
				"retry-failed-pages-scheduler",
				{ pattern: retryFailedPagesCron },
				{
					name: "update-scheduler",
					data: { type: "RETRY_FAILED_PAGES" },
				},
			)
			console.log(`Scheduled RETRY_FAILED_PAGES with cron: ${retryFailedPagesCron}`)
		}

		// Set up RECOMPUTE_ALL repeatable job (force Meilisearch re-indexing)
		const recomputeAllCron = config.schedulerReindexAllCron
		if (recomputeAllCron) {
			await updateSchedulerQueue.upsertJobScheduler(
				"recompute-all-scheduler",
				{ pattern: recomputeAllCron },
				{
					name: "update-scheduler",
					data: { type: "RECOMPUTE_ALL" },
				},
			)
			console.log(`Scheduled RECOMPUTE_ALL with cron: ${recomputeAllCron}`)
		}
	}
	catch (error) {
		console.error("Failed to set up scheduled jobs:", error)
	}
})
