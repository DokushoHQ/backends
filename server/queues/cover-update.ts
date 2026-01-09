import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "cover-update" as const
export const DISPLAY_NAME = "Cover Update"

export const coverUpdateJobDataSchema = z.object({
	type: z.enum(["SOURCE", "CUSTOM"]),
	// For SOURCE type: SerieSource ID to process cover for
	serie_source_id: z.string().uuid().optional(),
	// For CUSTOM type: Serie ID and image URL
	serie_id: z.string().uuid().optional(),
	image_url: z.string().url().optional(),
})

export type CoverUpdateJobData = z.infer<typeof coverUpdateJobDataSchema>

export default defineQueue<CoverUpdateJobData, undefined, typeof QUEUE_NAME>({
	name: QUEUE_NAME,
	options: {
		defaultJobOptions: {
			removeOnComplete: { age: 60 * 60 * 24 * 7 },
			attempts: 3,
			backoff: { type: "exponential", delay: 1000 },
		},
	},
})
