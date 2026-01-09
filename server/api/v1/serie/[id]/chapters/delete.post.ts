import { z } from "zod"
import { deleteByPrefix } from "../../../../../utils/s3"

const deleteSchema = z.object({
	chapterIds: z.array(z.string()).min(1),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const serieId = getRouterParam(event, "id")
	if (!serieId) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const body = await readBody(event)
	const parsed = deleteSchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Invalid request body" })
	}

	const { chapterIds } = parsed.data

	// Verify chapters belong to this serie AND are marked as removed from source
	const chapters = await db.chapter.findMany({
		where: {
			id: { in: chapterIds },
			serie_id: serieId,
			source_removed_at: { not: null },
		},
		select: { id: true },
	})

	if (chapters.length !== chapterIds.length) {
		throw createError({
			statusCode: 400,
			message: "Some chapters not found, don't belong to this serie, or are not marked as removed from source",
		})
	}

	// Delete S3 files for each chapter
	let totalS3Deleted = 0
	for (const chapter of chapters) {
		const chapterPrefix = `${serieId}/chapters/${chapter.id}/`
		const deleted = await deleteByPrefix(chapterPrefix)
		totalS3Deleted += deleted
	}

	// Delete from database (ChapterData cascades automatically)
	const result = await db.chapter.deleteMany({
		where: { id: { in: chapterIds } },
	})

	return {
		success: true,
		count: result.count,
		s3FilesDeleted: totalS3Deleted,
	}
})
