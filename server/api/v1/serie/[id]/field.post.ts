import { z } from "zod"
import indexerQueue from "../../../../queues/indexer"
import type { SerieField } from "../../../../utils/serie"

const fieldSchema = z.object({
	action: z.enum(["lock", "unlock", "update"]),
	field: z.enum(["title", "synopsis", "status", "type", "cover"]),
	value: z.unknown().optional(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const body = await readBody(event)
	const parsed = fieldSchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Invalid request body" })
	}

	const { action, field, value } = parsed.data

	const serie = await db.serie.findUnique({
		where: { id },
		select: { locked_fields: true },
	})

	if (!serie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	const existingLockedFields = (serie.locked_fields as SerieField[]) ?? []

	if (action === "lock") {
		const newLockedFields = [...new Set([...existingLockedFields, field])]
		await db.serie.update({
			where: { id },
			data: { locked_fields: newLockedFields },
		})
		return { success: true }
	}

	if (action === "unlock") {
		const newLockedFields = existingLockedFields.filter(f => f !== field)
		const updateData: Record<string, unknown> = { locked_fields: newLockedFields }

		// When unlocking cover, also clear custom_cover
		if (field === "cover") {
			updateData.custom_cover = null
		}

		await db.serie.update({
			where: { id },
			data: updateData,
		})

		// Trigger indexer to recalculate from source
		await indexerQueue.add("indexer", { serie_id: id, type: "UPDATE" })

		return { success: true }
	}

	if (action === "update") {
		if (!existingLockedFields.includes(field as SerieField)) {
			throw createError({ statusCode: 400, message: "Field is not locked. Lock it first before updating." })
		}

		const updateData: Record<string, unknown> = {}

		switch (field) {
			case "title":
				updateData.title = value as string
				break
			case "synopsis":
				updateData.synopsis = value as string | null
				break
			case "status":
				updateData.status = value as string[]
				break
			case "type":
				updateData.type = value as string
				break
		}

		await db.serie.update({
			where: { id },
			data: updateData,
		})

		// Trigger indexer to update search index
		await indexerQueue.add("indexer", { serie_id: id, type: "UPDATE" })

		return { success: true }
	}

	throw createError({ statusCode: 400, message: "Invalid action" })
})
