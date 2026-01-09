import { getJobById } from "../../../../utils/queue-stats"

export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const serie = await db.serie.findUnique({
		where: { id },
		select: { soft_deleted_at: true, pending_delete_job_id: true },
	})

	if (!serie) {
		return { isDeleted: false, deletedAt: null, pendingJobId: null, scheduledDeleteAt: null }
	}

	let scheduledDeleteAt: Date | null = null
	if (serie.pending_delete_job_id) {
		const job = await getJobById("deleteSerie", serie.pending_delete_job_id)
		if (job?.opts?.delay && job.timestamp) {
			scheduledDeleteAt = new Date(job.timestamp + job.opts.delay)
		}
	}

	return {
		isDeleted: !!serie.soft_deleted_at,
		deletedAt: serie.soft_deleted_at,
		pendingJobId: serie.pending_delete_job_id,
		scheduledDeleteAt,
	}
})
