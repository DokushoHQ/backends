import { z } from "zod"
import chapterDedupQueue from "../../../../../queues/chapter-dedup"

const paramsSchema = z.object({
	id: z.string().uuid("Serie ID must be a valid UUID"),
})

const bodySchema = z.object({
	language: z.enum(["En", "Jp", "JpRo", "Fr", "Ko", "KoRo", "ZhHk", "Zh"]).optional(),
	chapterIds: z.array(z.string().uuid()).optional(),
}).optional()

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const params = await getValidatedRouterParams(event, paramsSchema.parse)
	const body = await readValidatedBody(event, bodySchema.parse)

	const { id: serieId } = params
	const language = body?.language
	const chapterIds = body?.chapterIds

	// Verify serie exists
	const serie = await db.serie.findUnique({
		where: { id: serieId },
		select: { id: true },
	})

	if (!serie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	// Build where clause
	const where: {
		serie_id: string
		manual_override: { not: null }
		language?: typeof language
		id?: { in: string[] }
	} = {
		serie_id: serieId,
		manual_override: { not: null },
	}

	if (language) {
		where.language = language
	}

	if (chapterIds && chapterIds.length > 0) {
		where.id = { in: chapterIds }
	}

	// Get count of overrides being reset
	const overrideCount = await db.chapter.count({ where })

	if (overrideCount === 0) {
		return {
			success: true,
			overrides_reset: 0,
			dedup_triggered: false,
		}
	}

	// Get languages of chapters being reset (for targeted dedup)
	const chaptersToReset = await db.chapter.findMany({
		where,
		select: { language: true },
	})
	const affectedLanguages = [...new Set(chaptersToReset.map(c => c.language))]

	// Reset manual overrides
	await db.chapter.updateMany({
		where,
		data: { manual_override: null },
	})

	// Trigger dedup to apply auto-rules for affected languages
	await chapterDedupQueue.add(
		`reset-overrides-${serieId}`,
		{
			serie_id: serieId,
			languages: affectedLanguages.length > 0 ? affectedLanguages : undefined,
		},
		{ priority: 5 },
	)

	return {
		success: true,
		overrides_reset: overrideCount,
		dedup_triggered: true,
	}
})
