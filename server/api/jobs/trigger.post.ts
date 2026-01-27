import { z } from "zod"
import updateSchedulerQueue from "../../queues/update-scheduler"

const triggerSchema = z.object({
	type: z.enum(["FETCH_LATEST", "REFRESH_ALL", "RETRY_FAILED_PAGES", "RECOMPUTE_ALL"]),
	sourceId: z.string().optional(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const body = await readBody(event)
	const { type, sourceId } = triggerSchema.parse(body)

	const job = await updateSchedulerQueue.add(
		"update-scheduler",
		{ type, sourceId },
	)

	return {
		success: true,
		jobId: job.id,
		message: `${type} job queued`,
	}
})
