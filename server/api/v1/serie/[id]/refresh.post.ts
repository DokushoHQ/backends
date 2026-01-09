import serieInserterQueue from "../../../../queues/serie-inserter"

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	// Get all sources for the serie
	const serieSources = await db.serieSource.findMany({
		where: { serie_id: id },
		select: { source_id: true, external_id: true },
	})

	if (serieSources.length === 0) {
		throw createError({ statusCode: 404, message: "No sources found for this serie" })
	}

	// Queue refresh jobs for all sources
	const jobIds: string[] = []
	for (const source of serieSources) {
		const job = await serieInserterQueue.add(
			"serie-inserter",
			{ source_id: source.source_id, source_serie_id: source.external_id },
		)
		if (job.id) jobIds.push(job.id)
	}

	return { success: true, jobIds }
})
