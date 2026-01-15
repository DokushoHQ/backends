import { z } from "zod"

const bodySchema = z.object({
	permanently_failed: z.boolean(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const serieId = getRouterParam(event, "id")
	const chapterId = getRouterParam(event, "chapterId")
	const pageIndex = getRouterParam(event, "pageIndex")

	if (!serieId || !chapterId || pageIndex === undefined) {
		throw createError({ statusCode: 400, message: "Serie ID, Chapter ID, and Page Index required" })
	}

	const body = await readValidatedBody(event, bodySchema.parse)

	// Verify chapter belongs to serie
	const chapter = await db.chapter.findUnique({
		where: { id: chapterId, serie_id: serieId },
		select: { id: true },
	})

	if (!chapter) {
		throw createError({ statusCode: 404, message: "Chapter not found" })
	}

	// Update the page
	const page = await db.chapterData.updateMany({
		where: {
			chapter_id: chapterId,
			index: parseInt(pageIndex, 10),
		},
		data: {
			permanently_failed: body.permanently_failed,
		},
	})

	if (page.count === 0) {
		throw createError({ statusCode: 404, message: "Page not found" })
	}

	// Recalculate chapter status (only count pages without URL as failed)
	// Use NOT/OR to handle both null and empty string URLs
	const [
		successfulPages,
		retryableFailedPages,
		permanentlyFailedPages,
	] = await Promise.all([
		db.chapterData.count({ where: { chapter_id: chapterId, NOT: { OR: [{ url: null }, { url: "" }] } } }),
		db.chapterData.count({ where: { chapter_id: chapterId, OR: [{ url: null }, { url: "" }], permanently_failed: false } }),
		db.chapterData.count({ where: { chapter_id: chapterId, OR: [{ url: null }, { url: "" }], permanently_failed: true } }),
	])

	let status: "Success" | "Failed" | "PermanentlyFailed" | "Partial" | "Incomplete"
	if (retryableFailedPages === 0 && permanentlyFailedPages === 0) {
		status = "Success"
	}
	else if (successfulPages === 0 && permanentlyFailedPages === 0) {
		status = "Failed"
	}
	else if (successfulPages === 0 && retryableFailedPages === 0) {
		status = "PermanentlyFailed"
	}
	else if (permanentlyFailedPages > 0) {
		status = "Incomplete"
	}
	else {
		status = "Partial"
	}

	await db.chapter.update({
		where: { id: chapterId },
		data: { page_fetch_status: status },
	})

	return { success: true, newStatus: status }
})
