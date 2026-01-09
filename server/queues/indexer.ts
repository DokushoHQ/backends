import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "indexer" as const
export const DISPLAY_NAME = "Indexer"

export const indexerJobDataSchema = z.object({
	serie_id: z.string().uuid(),
	type: z.enum(["UPDATE", "DELETE"]),
})

export type IndexerJobData = z.infer<typeof indexerJobDataSchema>

export default defineQueue<IndexerJobData, undefined, typeof QUEUE_NAME>({
	name: QUEUE_NAME,
	options: {
		defaultJobOptions: {
			removeOnComplete: { age: 60 * 60 * 24 * 7 },
			attempts: 3,
			backoff: { type: "exponential", delay: 1000 },
		},
	},
})
