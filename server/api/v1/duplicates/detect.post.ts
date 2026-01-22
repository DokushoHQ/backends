import duplicateDetectorQueue from "../../../queues/duplicate-detector"

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const body = await readBody(event)
	const threshold = Number.parseFloat(body?.threshold) || 0.7
	const forceRefresh = body?.forceRefresh ?? true

	// Check if there's already a detection job running
	const activeJobs = await duplicateDetectorQueue.getActive()
	const waitingJobs = await duplicateDetectorQueue.getWaiting()

	if (activeJobs.length > 0 || waitingJobs.length > 0) {
		throw createError({
			statusCode: 409,
			message: "A duplicate detection job is already running",
		})
	}

	const config = useRuntimeConfig()
	const job = await duplicateDetectorQueue.add("duplicate-detector", {
		threshold,
		batchSize: config.duplicateDetectionBatchSize,
		forceRefresh,
	})

	return {
		jobId: job.id,
		message: "Duplicate detection started",
	}
})
