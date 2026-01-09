import updateSchedulerQueue from "../queues/update-scheduler"

export default defineNitroPlugin(async () => {
	const config = useRuntimeConfig()

	console.log("Setting up scheduled jobs...")

	try {
		// Remove all existing repeatable jobs first
		const existingJobs = await updateSchedulerQueue.getRepeatableJobs()
		for (const job of existingJobs) {
			await updateSchedulerQueue.removeRepeatableByKey(job.key)
		}
		if (existingJobs.length > 0) {
			console.log(`Removed ${existingJobs.length} existing repeatable job(s)`)
		}

		// Set up FETCH_LATEST repeatable job (check for updates)
		const fetchLatestCron = config.schedulerFetchLatestCron
		if (fetchLatestCron) {
			await updateSchedulerQueue.add(
				"update-scheduler",
				{ type: "FETCH_LATEST" },
				{
					repeat: {
						pattern: fetchLatestCron,
						jobId: "fetch-latest-scheduler",
					},
				},
			)
			console.log(`Scheduled FETCH_LATEST with cron: ${fetchLatestCron}`)
		}

		// Set up REFRESH_ALL repeatable job (full refresh)
		const refreshAllCron = config.schedulerRefreshAllCron
		if (refreshAllCron) {
			await updateSchedulerQueue.add(
				"update-scheduler",
				{ type: "REFRESH_ALL" },
				{
					repeat: {
						pattern: refreshAllCron,
						jobId: "refresh-all-scheduler",
					},
				},
			)
			console.log(`Scheduled REFRESH_ALL with cron: ${refreshAllCron}`)
		}
	}
	catch (error) {
		console.error("Failed to set up scheduled jobs:", error)
	}
})
