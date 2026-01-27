import type { Language } from "../../../../utils/db"

interface GroupWithChapterCount {
	group_id: string
	name: string
	chapter_count: number
	priority: number
}

export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	// Verify serie exists
	const serie = await db.serie.findUnique({
		where: { id },
		select: { id: true },
	})

	if (!serie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	// Get all chapters with their groups for this serie
	const chapters = await db.chapter.findMany({
		where: { serie_id: id },
		select: {
			language: true,
			groups: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	})

	// Get existing group preferences
	const preferences = await db.serieGroupPreference.findMany({
		where: { serie_id: id },
		select: {
			group_id: true,
			language: true,
			priority: true,
		},
	})

	// Build a lookup map for preferences: `${group_id}-${language}` -> priority
	const prefMap = new Map<string, number>()
	for (const pref of preferences) {
		prefMap.set(`${pref.group_id}-${pref.language}`, pref.priority)
	}

	// Aggregate groups by language with chapter counts
	const groupsByLanguage: Record<string, Map<string, { name: string, count: number }>> = {}

	for (const chapter of chapters) {
		const lang = chapter.language
		if (!groupsByLanguage[lang]) {
			groupsByLanguage[lang] = new Map()
		}

		for (const group of chapter.groups) {
			const existing = groupsByLanguage[lang].get(group.id)
			if (existing) {
				existing.count++
			}
			else {
				groupsByLanguage[lang].set(group.id, { name: group.name, count: 1 })
			}
		}
	}

	// Transform to response shape
	const groups_by_language: Record<string, GroupWithChapterCount[]> = {}

	for (const [lang, groupMap] of Object.entries(groupsByLanguage)) {
		const groups: GroupWithChapterCount[] = []

		for (const [groupId, { name, count }] of groupMap.entries()) {
			groups.push({
				group_id: groupId,
				name,
				chapter_count: count,
				priority: prefMap.get(`${groupId}-${lang}`) ?? 0,
			})
		}

		// Sort by priority descending (preferred first), then by chapter count descending
		groups.sort((a, b) => {
			if (a.priority !== b.priority) return b.priority - a.priority
			return b.chapter_count - a.chapter_count
		})

		groups_by_language[lang as Language] = groups
	}

	return { groups_by_language }
})
