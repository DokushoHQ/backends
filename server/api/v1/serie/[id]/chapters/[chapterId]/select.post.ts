import { z } from "zod"

const paramsSchema = z.object({
	id: z.string().uuid("Serie ID must be a valid UUID"),
	chapterId: z.string().uuid("Chapter ID must be a valid UUID"),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const params = await getValidatedRouterParams(event, paramsSchema.parse)
	const { id: serieId, chapterId } = params

	// Get the selected chapter with its details
	const selectedChapter = await db.chapter.findFirst({
		where: { id: chapterId, serie_id: serieId },
		select: {
			id: true,
			chapter_number: true,
			language: true,
			source_id: true,
			groups: { select: { id: true, name: true } },
		},
	})

	if (!selectedChapter) {
		throw createError({ statusCode: 404, message: "Chapter not found" })
	}

	// Find all duplicate chapters (same source, number, language)
	const duplicates = await db.chapter.findMany({
		where: {
			serie_id: serieId,
			source_id: selectedChapter.source_id,
			chapter_number: selectedChapter.chapter_number,
			language: selectedChapter.language,
		},
		select: { id: true, enabled: true },
	})

	if (duplicates.length <= 1) {
		throw createError({ statusCode: 400, message: "No duplicate chapters exist for this chapter" })
	}

	// Update enabled status: enable selected, disable others
	const toDisable = duplicates.filter(c => c.id !== chapterId && c.enabled).map(c => c.id)

	await db.$transaction(async (tx) => {
		// Disable other duplicates with manual override marker
		if (toDisable.length > 0) {
			await tx.chapter.updateMany({
				where: { id: { in: toDisable } },
				data: { enabled: false, manual_override: false },
			})
		}

		// Enable selected chapter with manual override marker
		await tx.chapter.update({
			where: { id: chapterId },
			data: { enabled: true, manual_override: true },
		})

		// Store group preference for future chapters (if the chapter has groups)
		if (selectedChapter.groups.length > 0) {
			const groupId = selectedChapter.groups[0]!.id

			// Upsert preference - increase priority for selected group
			await tx.serieGroupPreference.upsert({
				where: {
					serie_id_group_id_language: {
						serie_id: serieId,
						group_id: groupId,
						language: selectedChapter.language,
					},
				},
				create: {
					serie_id: serieId,
					group_id: groupId,
					language: selectedChapter.language,
					priority: 1,
				},
				update: {
					priority: { increment: 1 },
				},
			})
		}
	})

	return {
		success: true,
		enabled: chapterId,
		disabled: toDisable,
		group_preference_updated: selectedChapter.groups.length > 0,
	}
})
