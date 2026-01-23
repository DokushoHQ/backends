import { defineWorker } from "#processor"
import { MetricsTime } from "bullmq"
import { join } from "node:path"
import deleteSerieQueue from "../queues/delete-serie"
import type { DuplicateMergeJobData } from "../queues/duplicate-merge"
import { duplicateMergeJobDataSchema, QUEUE_NAME } from "../queues/duplicate-merge"
import indexerQueue from "../queues/indexer"
import { db } from "../utils/db"
import { moveByPrefix } from "../utils/s3"

export default defineWorker<typeof QUEUE_NAME, DuplicateMergeJobData, undefined>({
	name: QUEUE_NAME,
	options: {
		concurrency: 1, // Serialize merges to avoid conflicts
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job) {
		const { primarySerieId, sourceSerieIds, duplicateGroupId } = duplicateMergeJobDataSchema.parse(job.data)

		job.log(`Merging ${sourceSerieIds.length} series into ${primarySerieId}`)
		await job.updateProgress(5)

		// 1. Validate primary serie exists
		const primarySerie = await db.serie.findUnique({
			where: { id: primarySerieId },
			include: {
				genres: { select: { id: true } },
				authors: { select: { id: true } },
				artists: { select: { id: true } },
			},
		})

		if (!primarySerie) {
			throw new Error(`Primary serie not found: ${primarySerieId}`)
		}

		if (primarySerie.soft_deleted_at) {
			throw new Error(`Primary serie is soft deleted: ${primarySerieId}`)
		}

		// 2. Validate source series exist
		const sourceSeries = await db.serie.findMany({
			where: {
				id: { in: sourceSerieIds },
				soft_deleted_at: null,
			},
			include: {
				sources: { select: { id: true } },
				chapters: { select: { id: true } },
				genres: { select: { id: true } },
				authors: { select: { id: true } },
				artists: { select: { id: true } },
			},
		})

		if (sourceSeries.length !== sourceSerieIds.length) {
			const foundIds = new Set(sourceSeries.map(s => s.id))
			const missing = sourceSerieIds.filter(id => !foundIds.has(id))
			throw new Error(`Some source series not found or soft deleted: ${missing.join(", ")}`)
		}

		await job.updateProgress(10)

		// 3. Move SerieSource records
		const sourceSourceIds = sourceSeries.flatMap(s => s.sources.map(src => src.id))
		if (sourceSourceIds.length > 0) {
			await db.serieSource.updateMany({
				where: { id: { in: sourceSourceIds } },
				data: {
					serie_id: primarySerieId,
					is_primary: false, // Primary's existing source remains primary
				},
			})
			job.log(`Moved ${sourceSourceIds.length} SerieSource records`)
		}

		await job.updateProgress(20)

		// 4. Get chapters to move and relocate S3 files
		const chaptersToMove: Array<{ id: string, serie_id: string }> = []
		for (const source of sourceSeries) {
			chaptersToMove.push(...source.chapters.map(c => ({ id: c.id, serie_id: source.id })))
		}

		job.log(`Moving ${chaptersToMove.length} chapters and relocating S3 files`)

		let movedChapters = 0
		for (const chapter of chaptersToMove) {
			// Move S3 files for this chapter
			const oldPrefix = join(chapter.serie_id, "chapters", chapter.id)
			const newPrefix = join(primarySerieId, "chapters", chapter.id)

			const movedFiles = await moveByPrefix(`${oldPrefix}/`, `${newPrefix}/`)

			if (movedFiles.length > 0) {
				// Update ChapterData URLs
				for (const file of movedFiles) {
					await db.chapterData.updateMany({
						where: {
							chapter_id: chapter.id,
							url: { contains: file.oldKey },
						},
						data: { url: file.newUrl },
					})
				}
				job.log(`Relocated ${movedFiles.length} files for chapter ${chapter.id}`)
			}

			// Update chapter's serie_id
			await db.chapter.update({
				where: { id: chapter.id },
				data: { serie_id: primarySerieId },
			})

			movedChapters++
			const progress = 20 + Math.floor((movedChapters / chaptersToMove.length) * 40)
			await job.updateProgress(progress)
		}

		await job.updateProgress(60)

		// 5. Merge genres, authors, artists (union)
		const allGenreIds = [
			...new Set([
				...primarySerie.genres.map(g => g.id),
				...sourceSeries.flatMap(s => s.genres.map(g => g.id)),
			]),
		]

		const allAuthorIds = [
			...new Set([
				...primarySerie.authors.map(a => a.id),
				...sourceSeries.flatMap(s => s.authors.map(a => a.id)),
			]),
		]

		const allArtistIds = [
			...new Set([
				...primarySerie.artists.map(a => a.id),
				...sourceSeries.flatMap(s => s.artists.map(a => a.id)),
			]),
		]

		await db.serie.update({
			where: { id: primarySerieId },
			data: {
				genres: { set: allGenreIds.map(id => ({ id })) },
				authors: { set: allAuthorIds.map(id => ({ id })) },
				artists: { set: allArtistIds.map(id => ({ id })) },
				updated_at: new Date(),
			},
		})

		job.log(`Merged metadata: ${allGenreIds.length} genres, ${allAuthorIds.length} authors, ${allArtistIds.length} artists`)
		await job.updateProgress(70)

		// 6. Queue soft-delete for source series
		for (const source of sourceSeries) {
			await deleteSerieQueue.add("delete-serie", {
				serie_id: source.id,
				type: "SOFT_DELETE",
			})
		}
		job.log(`Queued soft-delete for ${sourceSeries.length} source series`)

		await job.updateProgress(80)

		// 7. Update DuplicateGroup status if provided
		if (duplicateGroupId) {
			await db.duplicateGroup.update({
				where: { id: duplicateGroupId },
				data: {
					status: "Merged",
					merged_into_id: primarySerieId,
					merged_at: new Date(),
				},
			})
			job.log(`Updated duplicate group ${duplicateGroupId} status to Merged`)
		}

		await job.updateProgress(90)

		// 8. Trigger re-indexing for primary serie
		await indexerQueue.add("indexer", { serie_id: primarySerieId, type: "UPDATE" })
		job.log("Queued re-indexing for primary serie")

		// 9. Trigger index deletion for source series
		for (const source of sourceSeries) {
			await indexerQueue.add("indexer", { serie_id: source.id, type: "DELETE" })
		}
		job.log(`Queued index deletion for ${sourceSeries.length} source series`)

		await job.updateProgress(100)
		job.log(`Merge completed: ${movedChapters} chapters, ${sourceSourceIds.length} sources`)
	},
})
