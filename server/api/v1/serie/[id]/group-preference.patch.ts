import { z } from "zod"
import chapterDedupQueue, { JOB_PRIORITY } from "../../../../queues/chapter-dedup"
import { languageSchema } from "../../../../utils/schemas"

const bodySchema = z.object({
	group_id: z.string().uuid(),
	language: languageSchema,
	priority: z.number().int().min(0).max(100), // 0 = automatic, 1-100 = priority (higher wins)
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const body = await readBody(event)
	const parsed = bodySchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Invalid request body" })
	}

	const { group_id, language, priority } = parsed.data

	// Verify serie exists
	const serie = await db.serie.findUnique({
		where: { id },
		select: { id: true },
	})

	if (!serie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	// Verify group exists
	const group = await db.scanlationGroup.findUnique({
		where: { id: group_id },
		select: { id: true },
	})

	if (!group) {
		throw createError({ statusCode: 404, message: "Group not found" })
	}

	// Handle based on priority value:
	// 0 = automatic (delete preference record, use heuristic)
	// 1-100 = priority (higher wins in dedup selection)
	if (priority === 0) {
		// Delete the preference record to reset to neutral
		await db.serieGroupPreference.deleteMany({
			where: {
				serie_id: id,
				group_id,
				language,
			},
		})
	}
	else {
		// Upsert the preference
		await db.serieGroupPreference.upsert({
			where: {
				serie_id_group_id_language: {
					serie_id: id,
					group_id,
					language,
				},
			},
			create: {
				serie_id: id,
				group_id,
				language,
				priority,
			},
			update: {
				priority,
			},
		})
	}

	// Trigger re-deduplication to apply new preferences
	const job = await chapterDedupQueue.add(
		`chapter-dedup-group-pref-${id}-${language}`,
		{ serie_id: id, languages: [language] },
		{ priority: JOB_PRIORITY.NORMAL },
	)

	return {
		success: true,
		job_id: job.id,
	}
})
