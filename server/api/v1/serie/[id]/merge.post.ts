import { z } from "zod"
import duplicateMergeQueue from "../../../../queues/duplicate-merge"

const bodySchema = z.object({
	sourceSerieIds: z.array(z.string().uuid()).min(1),
	duplicateGroupId: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const primarySerieId = getRouterParam(event, "id")
	if (!primarySerieId) {
		throw createError({
			statusCode: 400,
			message: "Missing primary serie ID",
		})
	}

	const body = await readBody(event)
	const parsed = bodySchema.safeParse(body)
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			message: `Invalid request body: ${parsed.error.message}`,
		})
	}

	const { sourceSerieIds, duplicateGroupId } = parsed.data

	// Validate primary serie exists
	const primarySerie = await db.serie.findUnique({
		where: { id: primarySerieId },
		select: { id: true, soft_deleted_at: true },
	})

	if (!primarySerie) {
		throw createError({
			statusCode: 404,
			message: "Primary serie not found",
		})
	}

	if (primarySerie.soft_deleted_at) {
		throw createError({
			statusCode: 400,
			message: "Primary serie is soft deleted",
		})
	}

	// Ensure primary is not in source list
	if (sourceSerieIds.includes(primarySerieId)) {
		throw createError({
			statusCode: 400,
			message: "Primary serie cannot be in source series list",
		})
	}

	// Queue the merge job with a unique ID to prevent duplicates
	const sortedSourceIds = [...sourceSerieIds].sort().join(",")
	const jobId = `merge:${primarySerieId}:${sortedSourceIds}`

	// Check if merge is already in progress or completed
	const existingJob = await duplicateMergeQueue.getJob(jobId)
	if (existingJob) {
		const state = await existingJob.getState()
		if (state === "completed") {
			throw createError({
				statusCode: 409,
				message: "These series were already merged",
			})
		}
		if (state === "active" || state === "waiting" || state === "delayed") {
			throw createError({
				statusCode: 409,
				message: "A merge job for these series is already in progress",
			})
		}
		// Job exists but failed - remove it to allow retry
		await existingJob.remove()
	}

	const job = await duplicateMergeQueue.add("duplicate-merge", {
		primarySerieId,
		sourceSerieIds,
		duplicateGroupId,
	}, {
		jobId,
	})

	return {
		jobId: job.id,
		message: `Merge job queued: merging ${sourceSerieIds.length} series into ${primarySerieId}`,
	}
})
