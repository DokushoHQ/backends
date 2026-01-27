import { z } from "zod"

const updateSchema = z.object({
	priority: z.number().int().min(1).max(100).optional(),
	enabled: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Source ID required" })
	}

	const body = await readBody(event)
	const parsed = updateSchema.safeParse(body)
	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Invalid request body" })
	}

	// Verify source exists
	const source = await db.source.findUnique({
		where: { id },
		select: { id: true },
	})

	if (!source) {
		throw createError({ statusCode: 404, message: "Source not found" })
	}

	// Update the source
	const updated = await db.source.update({
		where: { id },
		data: {
			...(parsed.data.priority !== undefined && { priority: parsed.data.priority }),
			...(parsed.data.enabled !== undefined && { enabled: parsed.data.enabled }),
		},
		select: {
			id: true,
			name: true,
			priority: true,
			enabled: true,
		},
	})

	return updated
})
