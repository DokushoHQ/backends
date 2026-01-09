import { z } from "zod"
import indexerQueue from "../../../../queues/indexer"

const primarySourceSchema = z.object({
	serieSourceId: z.string(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const body = await readBody(event)
	const parsed = primarySourceSchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "SerieSource ID required" })
	}

	const { serieSourceId } = parsed.data

	// Verify the SerieSource belongs to this Serie
	const serieSource = await db.serieSource.findFirst({
		where: { id: serieSourceId, serie_id: id },
	})

	if (!serieSource) {
		throw createError({ statusCode: 404, message: "SerieSource not found or doesn't belong to this serie" })
	}

	// Unset current primary
	await db.serieSource.updateMany({
		where: { serie_id: id },
		data: { is_primary: false },
	})

	// Set new primary
	await db.serieSource.update({
		where: { id: serieSourceId },
		data: { is_primary: true },
	})

	// Trigger indexer to recalculate display values
	await indexerQueue.add("indexer", { serie_id: id, type: "UPDATE" })

	return { success: true }
})
