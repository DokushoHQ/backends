import type { Prisma } from "../../../utils/db"

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const query = getQuery(event)
	const serieId = query.serie_id as string | undefined

	// Build where clause
	const where: Prisma.ChapterWhereInput = {
		page_fetch_status: { in: ["Partial", "Failed"] },
		...(serieId && { serie_id: serieId }),
	}

	const [partialCount, failedCount, failedPages] = await Promise.all([
		db.chapter.count({ where: { ...where, page_fetch_status: "Partial" } }),
		db.chapter.count({ where: { ...where, page_fetch_status: "Failed" } }),
		db.chapterData.count({
			where: {
				url: null,
				source_url: { not: null },
				chapter: where,
			},
		}),
	])

	return {
		partialChapters: partialCount,
		failedChapters: failedCount,
		failedPages,
	}
})
