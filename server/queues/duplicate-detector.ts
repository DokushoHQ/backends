import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "duplicate-detector" as const
export const DISPLAY_NAME = "Duplicate Detector"

export const duplicateDetectorJobDataSchema = z.object({
	threshold: z.number().min(0).max(1).default(0.7),
	batchSize: z.number().default(100),
	forceRefresh: z.boolean().default(false),
})

export type DuplicateDetectorJobData = z.infer<typeof duplicateDetectorJobDataSchema>

export default defineQueue<DuplicateDetectorJobData, undefined, typeof QUEUE_NAME>({
	name: QUEUE_NAME,
	options: {
		defaultJobOptions: {
			removeOnComplete: { age: 60 * 60 * 24 },
			attempts: 1, // Don't retry - long-running job
		},
	},
})
