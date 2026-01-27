export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const preference = await db.serieChapterPreference.findUnique({
		where: { serie_id: id },
	})

	// Return defaults if not found
	return {
		preference: preference ?? {
			use_secondary_fallback: {},
			use_secondary_fallback_default: true,
			notify_on_new_gaps: false,
			notify_on_gap_filled: false,
		},
	}
})
