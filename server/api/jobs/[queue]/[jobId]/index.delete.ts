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
	const job = await getJobById(queueName, jobId)

	if (!job) {
		throw createError({ statusCode: 404, message: "Job not found" })
	}

	await job.remove()

	return { success: true }
})
