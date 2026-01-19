import { z } from "zod"
import serieInserterQueue, { JOB_PRIORITY } from "../../../../queues/serie-inserter"

const importSchema = z.object({
	serieId: z.string(),
	priority: z.number().optional(), // Allow caller to set priority (e.g., LOW for backup imports)
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const sourceId = getRouterParam(event, "id")
	if (!sourceId) {
		throw createError({ statusCode: 400, message: "Source ID required" })
	}

	const body = await readBody(event)
	const parsed = importSchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const { serieId, priority } = parsed.data

	const dbSource = await db.source.findUnique({
		where: { id: sourceId, enabled: true },
	})

	if (!dbSource) {
		throw createError({ statusCode: 404, message: "Source not found or disabled" })
	}

	// Check if already exists via SerieSource
	const existingSerieSource = await db.serieSource.findFirst({
		where: {
			source_id: dbSource.id,
			external_id: serieId,
		},
		select: { serie_id: true },
	})

	if (existingSerieSource) {
		return { status: "exists", serieId: existingSerieSource.serie_id }
	}

	// Queue the import job
	const job = await serieInserterQueue.add(
		"serie-inserter",
		{ source_id: dbSource.id, source_serie_id: serieId },
		{ priority: priority ?? JOB_PRIORITY.NORMAL },
	)

	return { status: "queued", jobId: job.id ?? "" }
})
