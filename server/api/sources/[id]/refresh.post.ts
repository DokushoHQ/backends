import updateSchedulerQueue from "../../../queues/update-scheduler"

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const sourceId = getRouterParam(event, "id")
	if (!sourceId) {
		throw createError({ statusCode: 400, message: "Source ID is required" })
	}

	// Verify source exists and is enabled
	const source = await db.source.findUnique({
		where: { id: sourceId, enabled: true },
		select: { id: true, external_id: true },
	})

	if (!source) {
		throw createError({ statusCode: 404, message: "Source not found or disabled" })
	}

	// Queue the refresh job
	await updateSchedulerQueue.add(
		"update-scheduler",
		{ type: "FETCH_LATEST", sourceId: source.id },
	)

	return { success: true, message: `Refresh queued for ${source.external_id}` }
})
