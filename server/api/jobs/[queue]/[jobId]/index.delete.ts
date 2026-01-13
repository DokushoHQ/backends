export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const queueParam = getRouterParam(event, "queue")
	const jobId = getRouterParam(event, "jobId")

	if (!queueParam || !isValidQueueName(queueParam)) {
		throw createError({ statusCode: 400, message: "Invalid queue name" })
	}

	if (!jobId) {
		throw createError({ statusCode: 400, message: "Job ID is required" })
	}

	const queueName = queueParam as QueueName

	// Job scheduler jobs (repeat:*) cannot be removed directly
	// They need to be removed via removeJobScheduler
	if (jobId.startsWith("repeat:")) {
		// Extract scheduler name from jobId (format: repeat:schedulerName:timestamp)
		const parts = jobId.split(":")
		if (parts.length >= 2 && parts[1]) {
			const schedulerName = parts[1]
			const queue = getQueue(queueName)
			await queue.removeJobScheduler(schedulerName)
			return { success: true, message: `Removed job scheduler: ${schedulerName}` }
		} else {
			throw createError({ statusCode: 400, message: "Invalid repeatable job ID format" })
		}
	}

	const job = await getJobById(queueName, jobId)

	if (!job) {
		throw createError({ statusCode: 404, message: "Job not found" })
	}

	await job.remove()

	return { success: true }
})
