export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const id = getRouterParam(event, "id")
	if (!id) {
		throw createError({ statusCode: 400, message: "Serie ID required" })
	}

	const [serie, chapterHealth] = await Promise.all([
		db.serie.findUnique({
			where: { id },
			include: {
				sources: {
					select: {
						id: true,
						external_id: true,
						is_primary: true,
						external_url: true,
						consecutive_failures: true,
						title: true,
						alternates_titles: true,
						synopsis: true,
						cover: true,
						source: { select: { id: true, external_id: true, name: true, icon: true } },
					},
					orderBy: { is_primary: "desc" },
				},
				genres: { select: { id: true, title: true } },
				authors: { select: { id: true, name: true } },
				artists: { select: { id: true, name: true } },
				_count: { select: { chapters: { where: { enabled: true } } } },
			},
		}),
		db.chapter.groupBy({
			by: ["page_fetch_status"],
			where: { serie_id: id },
			_count: true,
		}),
	])

	if (!serie) {
		throw createError({ statusCode: 404, message: "Serie not found" })
	}

	// Build source URLs - prefer stored external_url, fall back to serieUrl() from source implementation
	const sources = await getSources()
	const sourcesWithUrls = await Promise.all(
		serie.sources.map(async (s) => {
			let url = s.external_url
			if (!url) {
				try {
					const sourceImpl = sources.find(src => src.sourceInformation().id === s.source.external_id)
					if (sourceImpl) {
						url = sourceImpl.serieUrl(s.external_id).toString()
					}
				}
				catch {
					// Ignore errors, URL will be null
				}
			}
			return { ...s, external_url: url }
		}),
	)

	// Transform chapter health into counts by status
	const chapterHealthCounts = {
		pending: 0,
		inProgress: 0,
		success: 0,
		partial: 0,
		failed: 0,
	}
	for (const h of chapterHealth) {
		switch (h.page_fetch_status) {
			case "Pending":
				chapterHealthCounts.pending = h._count
				break
			case "InProgress":
				chapterHealthCounts.inProgress = h._count
				break
			case "Success":
				chapterHealthCounts.success = h._count
				break
			case "Partial":
				chapterHealthCounts.partial = h._count
				break
			case "Failed":
				chapterHealthCounts.failed = h._count
				break
		}
	}

	return { ...serie, sources: sourcesWithUrls, chapterHealthCounts }
})
