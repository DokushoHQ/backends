export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({
			statusCode: 400,
			message: "Missing duplicate group ID",
		})
	}

	const group = await db.duplicateGroup.findUnique({
		where: { id },
	})

	if (!group) {
		throw createError({
			statusCode: 404,
			message: "Duplicate group not found",
		})
	}

	if (group.status !== "Pending") {
		throw createError({
			statusCode: 400,
			message: `Cannot dismiss a group with status: ${group.status}`,
		})
	}

	await db.duplicateGroup.update({
		where: { id },
		data: { status: "Dismissed" },
	})

	return { success: true }
})
