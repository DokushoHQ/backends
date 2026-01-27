import { z } from "zod"
import { languageSchema } from "../../../../utils/schemas"

const querySchema = z.object({
	language: languageSchema.optional(),
})

export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const query = await getValidatedQuery(event, querySchema.parse)

	const where = query.language
		? { serie_id: id, language: query.language }
		: { serie_id: id }

	const availability = await db.chapterAvailability.findMany({
		where,
		select: {
			language: true,
			missing_chapters: true,
			missing_count: true,
			available_count: true,
			ready_count: true,
			auto_enabled_count: true,
			updated_at: true,
			fillable_chapters: {
				select: {
					chapter_number: true,
					chapter_id: true,
					source_id: true,
				},
				orderBy: { chapter_number: "asc" },
			},
		},
	})

	return { availability }
})
