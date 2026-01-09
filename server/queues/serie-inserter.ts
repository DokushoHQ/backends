import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "serie-inserter" as const
export const DISPLAY_NAME = "Serie Inserter"

export const serieInserterJobDataSchema = z.object({
	source_serie_id: z.string(),
	source_id: z.string(),
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
