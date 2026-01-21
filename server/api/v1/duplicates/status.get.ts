import duplicateDetectorQueue from "../../../queues/duplicate-detector"

// Returns the current active/waiting job ID and progress if any
export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	// Check for active job first
	const activeJobs = await duplicateDetectorQueue.getActive()
	if (activeJobs.length > 0) {
		const job = activeJobs[0]
		const progress = typeof job.progress === "number" ? job.progress : 0
		return { jobId: job.id, progress }
	}

	// Check for waiting jobs
	const waitingJobs = await duplicateDetectorQueue.getWaiting()
	if (waitingJobs.length > 0) {
		return { jobId: waitingJobs[0].id, progress: 0 }
	}

	return { jobId: null, progress: null }
})
