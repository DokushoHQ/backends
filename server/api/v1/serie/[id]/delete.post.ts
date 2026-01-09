import deleteSerieQueue from "../../../../queues/delete-serie"

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const serie = await db.serie.findUnique({
		where: { id },
		select: { id: true, soft_deleted_at: true },
	})

	if (!serie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	if (serie.soft_deleted_at) {
		throw createError({ statusCode: 400, message: "Serie is already marked for deletion" })
	}

	await deleteSerieQueue.add("delete-serie", { serie_id: id, type: "SOFT_DELETE" })

	return { success: true }
})
