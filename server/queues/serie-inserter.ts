import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "serie-inserter" as const
export const DISPLAY_NAME = "Serie Inserter"

// Job priorities (lower = higher priority)
// BullMQ 4.0+: Jobs WITHOUT priority get processed FIRST, so all jobs must have a priority set
export const JOB_PRIORITY = {
	HIGH: 1, // FETCH_LATEST scheduled updates
	NORMAL: 5, // Manual imports, refresh, link-source
	LOW: 10, // Backup imports
} as const

export const serieInserterJobDataSchema = z.object({
	source_serie_id: z.string(),
	source_id: z.string(),
	target_serie_id: z.string().optional(), // If provided, link to existing serie instead of creating new
	is_primary: z.boolean().optional(), // For linking, whether this should be the primary source
})

export type SerieInserterJobData = z.infer<typeof serieInserterJobDataSchema>

export type SerieInserterJobResult = {
	serie_id: string
	chapters_queued: number
}

export default defineQueue<SerieInserterJobData, SerieInserterJobResult, typeof QUEUE_NAME>({
	name: QUEUE_NAME,
	options: {
		defaultJobOptions: {
			removeOnComplete: { age: 60 * 60 * 24 * 7 },
			attempts: 3,
			backoff: { type: "exponential", delay: 1000 },
		},
	},
})
