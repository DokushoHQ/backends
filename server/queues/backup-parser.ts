import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "backup-parser" as const
export const DISPLAY_NAME = "Backup Parser"

export const backupParserJobDataSchema = z.object({
	s3Key: z.string(), // S3 object key for the uploaded backup file
	backupType: z.string(), // Type of backup (e.g., "tmb")
	userId: z.string(), // User who initiated the import
})

export type BackupParserJobData = z.infer<typeof backupParserJobDataSchema>

export const parsedMangaSchema = z.object({
	id: z.union([z.number(), z.string()]),
	title: z.string(),
	backupSourceId: z.string(),
	backupSourceName: z.string(),
	relativeUrl: z.string(),
	categories: z.array(z.string()),
	mapped: z.boolean(),
	sourceId: z.string().optional(),
	sourceName: z.string().optional(),
	serieId: z.string().optional(),
	alreadyImported: z.boolean(),
	existingSerieId: z.string().optional(),
})

export type ParsedManga = z.infer<typeof parsedMangaSchema>

export const parsedCategorySchema = z.object({
	id: z.union([z.number(), z.string()]),
	name: z.string(),
	count: z.number(),
})

export type ParsedCategory = z.infer<typeof parsedCategorySchema>

export const backupParserJobResultSchema = z.object({
	backupType: z.string(),
	manga: z.array(parsedMangaSchema),
	categories: z.array(parsedCategorySchema),
	stats: z.object({
		total: z.number(),
		mapped: z.number(),
		unmapped: z.number(),
		alreadyImported: z.number(),
	}),
})

export type BackupParserJobResult = z.infer<typeof backupParserJobResultSchema>

export type BackupParserProgress = {
	stage: "downloading" | "extracting" | "parsing" | "mapping" | "checking" | "complete"
	percent: number
	current?: number
	total?: number
}

export default defineQueue<BackupParserJobData, BackupParserJobResult, typeof QUEUE_NAME>({
	name: QUEUE_NAME,
	options: {
		defaultJobOptions: {
			// Auto-remove completed jobs after 1 hour
			removeOnComplete: { age: 60 * 60 },
			// Auto-remove failed jobs after 24 hours
			removeOnFail: { age: 60 * 60 * 24 },
			attempts: 1, // No retries for parsing jobs
		},
	},
})
