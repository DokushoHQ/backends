import { defineQueue } from "#processor"
import { z } from "zod"
import { languageArraySchema } from "../utils/schemas"

export const QUEUE_NAME = "chapter-dedup" as const
export const DISPLAY_NAME = "Chapter Deduplication"

// Job priorities (lower = higher priority)
export const JOB_PRIORITY = {
	HIGH: 1, // From FETCH_LATEST updates
	NORMAL: 5, // Manual refreshes, serie-inserter
	LOW: 10, // Batch operations
} as const

export const chapterDedupJobDataSchema = z.object({
	serie_id: z.string().uuid(),
	// If specified, only process these languages. Otherwise process all.
	languages: languageArraySchema.optional(),
})

export type ChapterDedupJobData = z.infer<typeof chapterDedupJobDataSchema>

export type ChapterDedupJobResult = {
	serie_id: string
	languages_processed: string[]
	total_missing: number
	total_available: number
	total_ready: number
	chapters_enabled: number
	chapters_disabled: number
}

export default defineQueue<ChapterDedupJobData, ChapterDedupJobResult, typeof QUEUE_NAME>({
	name: QUEUE_NAME,
	options: {
		defaultJobOptions: {
			removeOnComplete: { age: 60 * 60 * 24 * 7 },
			attempts: 3,
			backoff: { type: "exponential", delay: 1000 },
		},
	},
})
