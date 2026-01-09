import { removeJob } from "../../../../utils/queue-stats"

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const serie = await db.serie.findUnique({
		where: { id },
		select: { id: true, soft_deleted_at: true, pending_delete_job_id: true },
	})

	if (!serie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	if (!serie.soft_deleted_at) {
		throw createError({ statusCode: 400, message: "Serie is not marked for deletion" })
	}

	// Cancel the pending hard delete job
	if (serie.pending_delete_job_id) {
		const removed = await removeJob("deleteSerie", serie.pending_delete_job_id)
		if (!removed) {
			console.warn(`Could not find job ${serie.pending_delete_job_id} to cancel`)
		}
	}

	// Clear soft delete fields
	await db.serie.update({
		where: { id },
		data: {
			soft_deleted_at: null,
			pending_delete_job_id: null,
		},
	})

	return { success: true }
})
