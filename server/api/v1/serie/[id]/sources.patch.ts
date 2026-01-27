import { z } from "zod"
import chapterDedupQueue, { JOB_PRIORITY } from "../../../../queues/chapter-dedup"

const bodySchema = z.object({
	priorities: z.record(z.string(), z.number().int().min(1).max(100)),
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

	// Verify serie exists and get all its sources
	const serie = await db.serie.findUnique({
		where: { id },
		select: {
			id: true,
			sources: { select: { id: true, is_primary: true } },
		},
	})

	if (!serie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	const sourceIds = serie.sources.map(s => s.id)
	const priorities = parsed.data.priorities

	// Validate all provided source IDs belong to this serie
	for (const sourceId of Object.keys(priorities)) {
		if (!sourceIds.includes(sourceId)) {
			throw createError({ statusCode: 400, message: `Source ${sourceId} does not belong to this serie` })
		}
	}

	// Primary source always has priority 1
	const primarySourceId = serie.sources.find(s => s.is_primary)?.id

	// Update priorities
	await Promise.all(
		Object.entries(priorities).map(([sourceId, priority]) => {
			// Don't allow changing primary source priority
			if (sourceId === primarySourceId) {
				return Promise.resolve()
			}
			return db.serieSource.update({
				where: { id: sourceId },
				data: { priority },
			})
		}),
	)

	// Trigger re-deduplication to apply new priority order
	const job = await chapterDedupQueue.add(
		`chapter-dedup-priority-${id}`,
		{ serie_id: id },
		{ priority: JOB_PRIORITY.NORMAL },
	)

	return { success: true, job_id: job.id }
})
