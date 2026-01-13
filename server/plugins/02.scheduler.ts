import updateSchedulerQueue from "../queues/update-scheduler"

export default defineNitroPlugin(async () => {
	const config = useRuntimeConfig()

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
	}
	catch (error) {
		console.error("Failed to set up scheduled jobs:", error)
	}
})
