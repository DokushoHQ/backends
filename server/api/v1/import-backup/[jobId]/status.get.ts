import backupParserQueue, {
	type BackupParserJobResult,
	type BackupParserProgress,
} from "../../../../queues/backup-parser"

interface BackupStatusResponse {
	id: string
	state: string
	progress: BackupParserProgress | null
	result: BackupParserJobResult | null
	failedReason: string | null
}

export default defineEventHandler(async (event): Promise<BackupStatusResponse> => {
	await requireAdmin(event)

	const jobId = getRouterParam(event, "jobId")
	if (!jobId) {
		throw createError({ statusCode: 400, message: "Job ID is required" })
	}

	const job = await backupParserQueue.getJob(jobId)
	if (!job) {
		throw createError({ statusCode: 404, message: "Job not found" })
	}

	const state = await job.getState()

	return {
		id: job.id!,
		state,
		progress: (job.progress as BackupParserProgress) || null,
		result: state === "completed" ? (job.returnvalue as BackupParserJobResult) : null,
		failedReason: job.failedReason ?? null,
	}
})
