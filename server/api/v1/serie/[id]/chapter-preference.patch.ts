import { z } from "zod"
import chapterDedupQueue, { JOB_PRIORITY } from "../../../../queues/chapter-dedup"
import type { Language } from "../../../../utils/db"
import { languageSchema } from "../../../../utils/schemas"

const bodySchema = z.object({
	use_secondary_fallback: z.record(languageSchema, z.boolean()).optional(),
	use_secondary_fallback_default: z.boolean().optional(),
	prefer_unsplit: z.record(languageSchema, z.boolean()).optional(),
	prefer_unsplit_default: z.boolean().optional(),
	notify_on_new_gaps: z.boolean().optional(),
	notify_on_gap_filled: z.boolean().optional(),
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

	// Verify serie exists
	const serie = await db.serie.findUnique({
		where: { id },
		select: { id: true },
	})

	if (!serie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	// Build update data, merging with existing language preferences if partial update
	let updateData = parsed.data

	if (parsed.data.use_secondary_fallback || parsed.data.prefer_unsplit) {
		const existing = await db.serieChapterPreference.findUnique({
			where: { serie_id: id },
			select: { use_secondary_fallback: true, prefer_unsplit: true },
		})

		const existingFallbackMap = (existing?.use_secondary_fallback ?? {}) as Record<Language, boolean>
		const existingUnsplitMap = (existing?.prefer_unsplit ?? {}) as Record<Language, boolean>

		updateData = {
			...parsed.data,
			...(parsed.data.use_secondary_fallback && {
				use_secondary_fallback: { ...existingFallbackMap, ...parsed.data.use_secondary_fallback },
			}),
			...(parsed.data.prefer_unsplit && {
				prefer_unsplit: { ...existingUnsplitMap, ...parsed.data.prefer_unsplit },
			}),
		}
	}

	const preference = await db.serieChapterPreference.upsert({
		where: { serie_id: id },
		create: {
			serie_id: id,
			use_secondary_fallback: updateData.use_secondary_fallback ?? {},
			use_secondary_fallback_default: updateData.use_secondary_fallback_default ?? true,
			prefer_unsplit: updateData.prefer_unsplit ?? {},
			prefer_unsplit_default: updateData.prefer_unsplit_default ?? true,
			notify_on_new_gaps: updateData.notify_on_new_gaps ?? false,
			notify_on_gap_filled: updateData.notify_on_gap_filled ?? false,
		},
		update: updateData,
	})

	// Trigger re-deduplication to apply new preferences
	const job = await chapterDedupQueue.add(
		`chapter-dedup-preference-${id}`,
		{ serie_id: id },
		{ priority: JOB_PRIORITY.NORMAL },
	)

	return { preference, job_id: job.id }
})
