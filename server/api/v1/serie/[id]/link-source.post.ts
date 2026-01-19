import { z } from "zod"
import serieInserterQueue, { JOB_PRIORITY } from "../../../../queues/serie-inserter"

const linkSchema = z.object({
	sourceId: z.string(),
	externalId: z.string(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const body = await readBody(event)
	const parsed = linkSchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Invalid request body" })
	}

	const { sourceId, externalId } = parsed.data

	// 1. Validate target serie exists
	const targetSerie = await db.serie.findUnique({
		where: { id },
		select: { id: true },
	})
	if (!targetSerie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	// 2. Validate source exists and is enabled
	const dbSource = await db.source.findUnique({
		where: { id: sourceId, enabled: true },
	})
	if (!dbSource) {
		throw createError({ statusCode: 404, message: "Source not found or disabled" })
	}

	// 3. Check if this source+external_id is already linked
	const existingSerieSource = await db.serieSource.findUnique({
		where: {
			source_id_external_id: { source_id: sourceId, external_id: externalId },
		},
		select: { serie_id: true },
	})

	if (existingSerieSource) {
		if (existingSerieSource.serie_id === id) {
			return { success: true, status: "already_linked" }
		}
		throw createError({ statusCode: 400, message: "This source entry is already linked to a different serie" })
	}

	// 4. Queue serie_inserter job with target_serie_id (will run in LINK mode)
	const job = await serieInserterQueue.add(
		"serie-inserter",
		{
			source_id: sourceId,
			source_serie_id: externalId,
			target_serie_id: id,
			is_primary: false,
		},
		{ priority: JOB_PRIORITY.NORMAL },
	)

	return { success: true, status: "queued", jobId: job.id ?? "" }
})
