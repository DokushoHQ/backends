import { z } from "zod"
import coverUpdateQueue from "../../../../queues/cover-update"
import { getJobById } from "../../../../utils/queue-stats"
import type { SerieField } from "../../../../utils/serie"

const uploadSchema = z.object({
	coverUrl: z.string().url(),
})

const statusSchema = z.object({
	jobId: z.string(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const query = getQuery(event)

	// Check status of existing job
	if (query.status === "true") {
		const body = await readBody(event)
		const parsed = statusSchema.safeParse(body)
		if (!parsed.success) {
			throw createError({ statusCode: 400, message: "Job ID required" })
		}

		const job = await getJobById("coverUpdate", parsed.data.jobId)
		if (!job) {
			return { status: "failed", error: "Job not found" }
		}

		const state = await job.getState()

		if (state === "completed") {
			return { status: "completed" }
		}
		if (state === "failed") {
			return { status: "failed", error: job.failedReason ?? "Unknown error" }
		}
		if (state === "active") {
			return { status: "active" }
		}
		return { status: "waiting" }
	}

	// Upload new cover
	const body = await readBody(event)
	const parsed = uploadSchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Cover URL required" })
	}

	const serie = await db.serie.findUnique({
		where: { id },
		select: { locked_fields: true },
	})

	if (!serie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	const lockedFields = (serie.locked_fields as SerieField[]) ?? []
	if (!lockedFields.includes("cover")) {
		throw createError({ statusCode: 400, message: "Cover field is not locked. Lock it first before uploading." })
	}

	const job = await coverUpdateQueue.add(
		"cover-update",
		{ type: "CUSTOM", serie_id: id, image_url: parsed.data.coverUrl },
	)

	return { success: true, jobId: job.id ?? "" }
})
