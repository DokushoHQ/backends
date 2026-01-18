import { defineWorker } from "#processor"
import { MetricsTime, type Job } from "bullmq"
import {
	QUEUE_NAME,
	backupParserJobDataSchema,
	type BackupParserJobData,
	type BackupParserJobResult,
	type ParsedManga,
	type ParsedCategory,
	type BackupParserProgress,
} from "../queues/backup-parser"
import { getParser } from "../utils/backup-parsers"
import { getSourceById, getSources } from "../utils/sources"
import { db } from "../utils/db"
import { downloadRawFile, deleteFile } from "../utils/s3"

export default defineWorker<typeof QUEUE_NAME, BackupParserJobData, BackupParserJobResult>({
	name: QUEUE_NAME,
	options: {
		concurrency: 1, // Only process one backup file at a time
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK },
	},
	async processor(job) {
		const { s3Key, backupType } = backupParserJobDataSchema.parse(job.data)

		try {
			return await processBackupFile(job, s3Key, backupType)
		}
		finally {
			// Cleanup S3 file
			try {
				await deleteFile(s3Key)
				job.log(`Cleaned up S3 file: ${s3Key}`)
			}
			catch (error) {
				job.log(`Failed to cleanup S3 file: ${error}`)
			}
		}
	},
})

async function processBackupFile(
	job: Job<BackupParserJobData>,
	s3Key: string,
	backupType: string,
): Promise<BackupParserJobResult> {
	// Get the parser for this backup type
	const parser = getParser(backupType)
	if (!parser) {
		throw new Error(`Unknown backup type: ${backupType}`)
	}

	job.log(`Using parser: ${parser.displayName}`)

	// Stage 1: Downloading from S3
	await updateProgress(job, { stage: "downloading", percent: 10 })
	job.log(`Downloading backup file from S3: ${s3Key}`)

	const fileBuffer = await downloadRawFile(s3Key)

	// Stage 2: Parsing
	await updateProgress(job, { stage: "parsing", percent: 30 })
	job.log("Parsing backup file...")

	const parseResult = await parser.parse(fileBuffer)
	job.log(`Found ${parseResult.manga.length} manga in backup`)
	job.log(`Found ${parseResult.categories.length} categories`)

	// Stage 3: Mapping sources
	await updateProgress(job, { stage: "mapping", percent: 50, current: 0, total: parseResult.manga.length })
	job.log("Mapping sources...")

	const sources = await getSources()
	const mappedManga: ParsedManga[] = []

	for (let i = 0; i < parseResult.manga.length; i++) {
		const manga = parseResult.manga[i]!
		const mapping = parser.mapSource(manga.backupSourceId, sources)

		if (!mapping) {
			// Unmapped source
			mappedManga.push({
				id: manga.id,
				title: manga.title,
				backupSourceId: manga.backupSourceId,
				backupSourceName: manga.backupSourceName,
				relativeUrl: manga.relativeUrl,
				categories: manga.categories,
				mapped: false,
				alreadyImported: false,
			})
		}
		else {
			// Mapped source - use the parser to extract serie ID
			const source = getSourceById(sources, mapping.sourceId)
			const serieId = source
				? parser.extractSerieId(source, manga.backupSourceId, manga.relativeUrl)
				: null

			mappedManga.push({
				id: manga.id,
				title: manga.title,
				backupSourceId: manga.backupSourceId,
				backupSourceName: manga.backupSourceName,
				relativeUrl: manga.relativeUrl,
				categories: manga.categories,
				mapped: true,
				sourceId: mapping.sourceId,
				sourceName: parser.getSourceName(mapping.sourceId, sources) ?? mapping.sourceId,
				serieId: serieId ?? undefined,
				alreadyImported: false, // Will be checked in next stage
			})
		}

		// Update progress every 50 items
		if (i % 50 === 0) {
			await updateProgress(job, {
				stage: "mapping",
				percent: 50 + Math.floor((i / parseResult.manga.length) * 20),
				current: i,
				total: parseResult.manga.length,
			})
		}
	}

	// Stage 4: Check existing imports
	await updateProgress(job, { stage: "checking", percent: 80 })
	job.log("Checking existing imports...")

	// Get all unique source IDs that were successfully mapped
	const mappedItems = mappedManga.filter(m => m.mapped && m.sourceId && m.serieId)
	const uniqueSourceIds = [...new Set(mappedItems.map(m => m.sourceId!))]

	// Fetch all sources from DB
	const dbSources = await db.source.findMany({
		where: { external_id: { in: uniqueSourceIds } },
		select: { id: true, external_id: true },
	})
	const sourceIdMap = new Map(dbSources.map(s => [s.external_id, s.id]))

	// Build list of serie sources to check
	const serieSourceChecks = mappedItems
		.filter(m => sourceIdMap.has(m.sourceId!))
		.map(m => ({
			source_id: sourceIdMap.get(m.sourceId!)!,
			external_id: m.serieId!,
		}))

	// Check all existing serie sources in one query
	const existingSerieSources = serieSourceChecks.length > 0
		? await db.serieSource.findMany({
				where: {
					OR: serieSourceChecks.map(check => ({
						source_id: check.source_id,
						external_id: check.external_id,
					})),
				},
				select: {
					source_id: true,
					external_id: true,
					serie_id: true,
				},
			})
		: []

	// Create lookup map for existing imports
	const existingMap = new Map(
		existingSerieSources.map(s => [`${s.source_id}:${s.external_id}`, s.serie_id]),
	)

	// Update mapped manga with import status
	for (const manga of mappedManga) {
		if (manga.mapped && manga.sourceId && manga.serieId) {
			const dbSourceId = sourceIdMap.get(manga.sourceId)
			if (dbSourceId) {
				const existingSerieId = existingMap.get(`${dbSourceId}:${manga.serieId}`)
				if (existingSerieId) {
					manga.alreadyImported = true
					manga.existingSerieId = existingSerieId
				}
			}
		}
	}

	// Stage 5: Complete
	await updateProgress(job, { stage: "complete", percent: 100 })

	// Calculate category counts
	const categoryCountMap = new Map<number | string, number>()
	for (const manga of mappedManga) {
		const categoryIds = parseResult.mangaCategories.get(manga.id) || []
		for (const categoryId of categoryIds) {
			categoryCountMap.set(categoryId, (categoryCountMap.get(categoryId) || 0) + 1)
		}
	}

	const categories: ParsedCategory[] = parseResult.categories.map(c => ({
		id: c.id,
		name: c.name,
		count: categoryCountMap.get(c.id) || 0,
	}))

	// Calculate stats
	const stats = {
		total: mappedManga.length,
		mapped: mappedManga.filter(m => m.mapped).length,
		unmapped: mappedManga.filter(m => !m.mapped).length,
		alreadyImported: mappedManga.filter(m => m.alreadyImported).length,
	}

	job.log(`Parsing complete: ${stats.total} total, ${stats.mapped} mapped, ${stats.unmapped} unmapped, ${stats.alreadyImported} already imported`)

	return {
		backupType,
		manga: mappedManga,
		categories,
		stats,
	}
}

async function updateProgress(job: Job<BackupParserJobData>, progress: BackupParserProgress) {
	await job.updateProgress(progress)
}
