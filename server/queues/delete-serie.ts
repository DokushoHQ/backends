import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "delete-serie" as const
export const DISPLAY_NAME = "Delete Serie"

export const deleteSerieJobDataSchema = z.object({
	serie_id: z.string().uuid(),
	type: z.enum(["SOFT_DELETE", "HARD_DELETE"]),
})

export type DeleteSerieJobData = z.infer<typeof deleteSerieJobDataSchema>

export default defineQueue<DeleteSerieJobData, undefined, typeof QUEUE_NAME>({
	name: QUEUE_NAME,
	options: {
		defaultJobOptions: {
			removeOnComplete: { age: 60 * 60 * 24 * 7 },
			attempts: 3,
			backoff: { type: "exponential", delay: 1000 },
		},
	},
})
