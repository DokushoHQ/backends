import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "duplicate-merge" as const
export const DISPLAY_NAME = "Duplicate Merge"

export const duplicateMergeJobDataSchema = z.object({
	primarySerieId: z.string().uuid(),
	sourceSerieIds: z.array(z.string().uuid()).min(1),
	duplicateGroupId: z.string().uuid().optional(),
})

export type DuplicateMergeJobData = z.infer<typeof duplicateMergeJobDataSchema>

export default defineQueue<DuplicateMergeJobData, undefined, typeof QUEUE_NAME>({
	name: QUEUE_NAME,
	options: {
		defaultJobOptions: {
			removeOnComplete: { age: 60 * 60 * 24 * 7 },
			attempts: 3,
			backoff: { type: "exponential", delay: 5000 },
		},
	},
})
