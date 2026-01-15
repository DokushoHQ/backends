import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "page-retry" as const
export const DISPLAY_NAME = "Page Retry"

export const pageRetryJobDataSchema = z.object({
	chapter_id: z.string().uuid(),
})

export type PageRetryJobData = z.infer<typeof pageRetryJobDataSchema>

export default defineQueue<PageRetryJobData, undefined, typeof QUEUE_NAME | `scheduled-retry-${string}` | `retry-${string}`>({
	name: QUEUE_NAME,
	options: {
		defaultJobOptions: {
			removeOnComplete: { age: 60 * 60 * 24 * 7 },
			attempts: 3,
			backoff: { type: "exponential", delay: 2000 },
		},
	},
})
