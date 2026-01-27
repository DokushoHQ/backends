import { z } from "zod"

const paramsSchema = z.object({
	id: z.string().min(1, "Serie ID required"),
})

const querySchema = z.object({
	includeDisabled: z
		.string()
		.optional()
		.transform(v => v === "true"),
	lang: z.enum(SourceLanguage).optional(),
})

/** Alternative chapter info for duplicate display */
type ChapterAlternative = {
	id: string
	enabled: boolean
	date_upload: Date
	page_fetch_status: string
	groups: { id: string, name: string, url: string | null }[]
}

export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
	const { includeDisabled, lang } = await getValidatedQuery(event, querySchema.parse)

	const chapters = await db.chapter.findMany({
		where: {
			serie_id: id,

			...(includeDisabled ? {} : { enabled: true }),
			...(lang ? { language: lang } : {}),
		},
		include: {
			groups: {
				select: { id: true, name: true, url: true },
			},
			source: {
				select: { id: true, external_id: true, name: true },
			},
		},
		orderBy: [{ chapter_number: "desc" }, { id: "asc" }],
	})

	// If includeDisabled is true, compute alternatives for each chapter
	// (chapters with same source_id, chapter_number, language)
	if (includeDisabled) {
		// Group all chapters by (source_id, chapter_number, language)
		const chapterGroups = new Map<string, typeof chapters>()
		for (const chapter of chapters) {
			const key = `${chapter.source_id}:${chapter.chapter_number}:${chapter.language}`
			const group = chapterGroups.get(key) || []
			group.push(chapter)
			chapterGroups.set(key, group)
		}

		// Build alternatives map
		const alternativesMap = new Map<string, ChapterAlternative[]>()
		for (const [, group] of chapterGroups) {
			if (group.length > 1) {
				// Multiple chapters for this (source, number, language)
				for (const chapter of group) {
					// Get alternatives (all others in the group)
					const alternatives: ChapterAlternative[] = group
						.filter(c => c.id !== chapter.id)
						.map(c => ({
							id: c.id,
							enabled: c.enabled,
							date_upload: c.date_upload,
							page_fetch_status: c.page_fetch_status,
							groups: c.groups,
						}))
					alternativesMap.set(chapter.id, alternatives)
				}
			}
		}

		// Return chapters with alternatives info
		const chaptersWithAlternatives = chapters.map(chapter => ({
			...chapter,
			has_alternatives: alternativesMap.has(chapter.id),
			alternatives: alternativesMap.get(chapter.id) || [],
		}))

		return { chapters: chaptersWithAlternatives }
	}

	return { chapters }
})
