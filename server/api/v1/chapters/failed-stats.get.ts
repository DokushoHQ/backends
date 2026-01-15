import { z } from "zod"
import type { Prisma } from "../../../utils/db"

const querySchema = z.object({
	serie_id: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const query = await getValidatedQuery(event, querySchema.parse)
	const serieId = query.serie_id

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
