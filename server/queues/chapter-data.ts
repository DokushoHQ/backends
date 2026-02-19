import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "chapter-data" as const
export const DISPLAY_NAME = "Chapter Data"

// Job priorities (lower = higher priority)
// BullMQ 4.0+: Jobs WITHOUT priority get processed FIRST, so all jobs must have a priority set
export const CHAPTER_DATA_PRIORITY = {
	HIGH: 1, // Automatic updates from serie-inserter
	NORMAL: 5, // Manual retries
	LOW: 10, // Batch operations
} as const

export const chapterDataJobDataSchema = z.object({
	serie_id: z.string().uuid(),
	source_id: z.string().uuid(),
	chapter_id: z.string().uuid(),
	type: z.enum(["UPDATE"]),
	rate_limit_retry_attempt: z.number().optional(), // Track retry attempts for 429 rate limits
})

export type ChapterDataJobData = z.infer<typeof chapterDataJobDataSchema>

export default defineQueue<ChapterDataJobData, undefined, typeof QUEUE_NAME>({
	name: QUEUE_NAME,
	options: {
		defaultJobOptions: {
			removeOnComplete: { age: 60 * 60 * 24 * 7 },
			attempts: 3,
			backoff: { type: "exponential", delay: 1000 },
		},
	},
})
