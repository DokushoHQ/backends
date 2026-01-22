import { z } from "zod"
import type { Prisma } from "../../../utils/db"

const querySchema = z.object({
	serie_id: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const query = await getValidatedQuery(event, querySchema.parse)
	const serieId = query.serie_id

	// Build where clause - include Pending, Partial, and Failed
	const baseWhere: Prisma.ChapterWhereInput = {
		page_fetch_status: { in: ["Pending", "Partial", "Failed"] },
		...(serieId && { serie_id: serieId }),
	}

	const [pendingCount, partialCount, failedCount, failedPages] = await Promise.all([
		db.chapter.count({ where: { ...baseWhere, page_fetch_status: "Pending" } }),
		db.chapter.count({ where: { ...baseWhere, page_fetch_status: "Partial" } }),
		db.chapter.count({ where: { ...baseWhere, page_fetch_status: "Failed" } }),
		db.chapterData.count({
			where: {
				url: null,
				source_url: { not: null },
				chapter: baseWhere,
			},
		}),
	])

	return {
		pendingChapters: pendingCount,
		partialChapters: partialCount,
		failedChapters: failedCount,
		failedPages,
	}
})
