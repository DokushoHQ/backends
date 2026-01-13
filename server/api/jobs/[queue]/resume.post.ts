export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const queueParam = getRouterParam(event, "queue")

	if (!queueParam || !isValidQueueName(queueParam)) {
		throw createError({ statusCode: 400, message: "Invalid queue name" })
	}

	const queueName = queueParam as QueueName
	await resumeQueue(queueName)

	return { success: true }
})
