export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const queueParam = getRouterParam(event, "queue")
	const query = getQuery(event)

	if (!queueParam || !isValidQueueName(queueParam)) {
		throw createError({ statusCode: 400, message: "Invalid queue name" })
	}

	const queueName = queueParam as QueueName
	const status = (query.status as JobStatus | "latest") || "latest"
	const page = Math.max(1, Number.parseInt(String(query.page || "1"), 10))
	const pageSize = 20

	const start = (page - 1) * pageSize
	const end = start + pageSize - 1

	const [stats, jobs] = await Promise.all([
		getQueueStats(queueName),
		getJobs(queueName, status, start, end),
	])

	// Calculate total based on status
	const total
		= status === "latest"
			? stats.waiting + stats.active + stats.completed + stats.failed + stats.delayed
			: stats[status as keyof typeof stats]
	const totalCount = typeof total === "number" ? total : 0
	const totalPages = Math.ceil(totalCount / pageSize)

	const serializedJobs = await Promise.all(jobs.map(job => serializeJobWithLogs(queueName, job)))

	return {
		queue: {
			name: queueName,
			displayName: queueConfig[queueName].displayName,
		},
		stats,
		jobs: serializedJobs,
		pagination: {
			page,
			pageSize,
			totalCount,
			totalPages,
		},
	}
})
