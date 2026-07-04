import { z } from "zod"
import type { Language } from "../../../../../utils/db"

const paramsSchema = z.object({
	id: z.string().uuid("Serie ID must be a valid UUID"),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const params = await getValidatedRouterParams(event, paramsSchema.parse)
	const { id: serieId } = params

	// Verify serie exists
	const serie = await db.serie.findUnique({
		where: { id: serieId },
		select: { id: true },
	})

	if (!serie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	// Get all chapters with manual overrides
	const overrides = await db.chapter.findMany({
		where: {
			serie_id: serieId,
			manual_override: { not: null },
		},
		select: {
			id: true,
			chapter_number: true,
			language: true,
			manual_override: true,
			title: true,
			source: {
				select: {
					name: true,
				},
			},
			groups: {
				select: { group: { select: { name: true } } },
			},
		},
		orderBy: [
			{ language: "asc" },
			{ chapter_number: "asc" },
		],
	})

	// Count by language
	const countByLanguage = overrides.reduce((acc, chapter) => {
		const lang = chapter.language
		acc[lang] = (acc[lang] || 0) + 1
		return acc
	}, {} as Partial<Record<Language, number>>)

	return {
		overrides: overrides.map(chapter => ({
			id: chapter.id,
			chapter_number: chapter.chapter_number,
			language: chapter.language,
			manual_override: chapter.manual_override!,
			title: chapter.title,
			source_name: chapter.source.name,
			groups: chapter.groups.map(g => g.group.name),
		})),
		count_by_language: countByLanguage,
		total_count: overrides.length,
	}
})
