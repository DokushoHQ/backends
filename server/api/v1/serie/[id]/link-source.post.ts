import { z } from "zod"
import serieInserterQueue from "../../../../queues/serie-inserter"
import { getSource } from "../../../../utils/sources"
import type { Prisma } from "../../../../utils/db"

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

	// 4. Fetch source data
	const source = await getSource(dbSource.external_id)
	let serieData: Awaited<ReturnType<typeof source.fetchSerieDetail>>
	try {
		serieData = await source.fetchSerieDetail(externalId)
	}
	catch (e) {
		console.error("Failed to fetch source data:", e)
		throw createError({ statusCode: 500, message: "Failed to fetch source data" })
	}

	// 5. Create SerieSource with is_primary=false
	await db.serieSource.create({
		data: {
			serie_id: id,
			source_id: sourceId,
			external_id: externalId,
			title: serieData.title as Prisma.InputJsonValue,
			alternates_titles: serieData.alternatesTitles as Prisma.InputJsonValue,
			synopsis: serieData.synopsis as Prisma.InputJsonValue,
			cover_source_url: serieData.cover.toString(),
			status: serieData.status,
			type: serieData.type,
			is_primary: false,
		},
	})

	// 6. Queue serie_inserter job (will run in UPDATE mode, importing chapters)
	const job = await serieInserterQueue.add(
		"serie-inserter",
		{ source_id: sourceId, source_serie_id: externalId },
	)

	return { success: true, status: "queued", jobId: job.id ?? "" }
})
