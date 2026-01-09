import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "chapter-data" as const
export const DISPLAY_NAME = "Chapter Data"

export const chapterDataJobDataSchema = z.object({
	serie_id: z.string().uuid(),
	source_id: z.string().uuid(),
	chapter_id: z.string().uuid(),
	type: z.enum(["UPDATE"]),
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
