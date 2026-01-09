import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "update-scheduler" as const
export const DISPLAY_NAME = "Update Scheduler"

export const updateSchedulerJobDataSchema = z.object({
	type: z.enum(["FETCH_LATEST", "REFRESH_ALL"]),
	sourceId: z.string().optional(),
})

export type UpdateSchedulerJobData = z.infer<typeof updateSchedulerJobDataSchema>

export default defineQueue<UpdateSchedulerJobData, undefined, typeof QUEUE_NAME>({
	name: QUEUE_NAME,
	options: {
		defaultJobOptions: {
			removeOnComplete: { age: 60 * 60 * 24 * 7 },
			removeOnFail: { age: 60 * 60 * 24 * 7 },
			attempts: 1,
		},
	},
})
