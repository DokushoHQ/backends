export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	// Series needing attention (failed scrapes, pending deletion, missing covers, chapter data issues)
	const seriesNeedingAttention = await db.serie.findMany({
		where: {
			OR: [
				{ sources: { some: { consecutive_failures: { gt: 0 } } } },
				{ soft_deleted_at: { not: null } },
				{ cover: null },
				{ chapters: { some: { page_fetch_status: { in: ["Pending", "Failed", "Partial"] } } } },
			],
		},
		select: {
			id: true,
			title: true,
			cover: true,
			soft_deleted_at: true,
			sources: {
				where: { consecutive_failures: { gt: 0 } },
				select: {
					consecutive_failures: true,
					source: { select: { name: true } },
				},
			},
			_count: {
				select: {
					chapters: {
						where: { page_fetch_status: { in: ["Pending", "Failed", "Partial"] } },
					},
				},
			},
		},
		orderBy: { updated_at: "desc" },
		take: 10,
	})

	return seriesNeedingAttention.map((serie) => {
		const issues: string[] = []
		if (serie.soft_deleted_at) issues.push("pending_deletion")
		if (!serie.cover) issues.push("missing_cover")
		if (serie.sources.length > 0) {
			const totalFailures = serie.sources.reduce((sum, s) => sum + s.consecutive_failures, 0)
			if (totalFailures > 0) issues.push("scrape_failures")
		}
		if (serie._count.chapters > 0) issues.push("chapter_data_missing")
		return {
			id: serie.id,
			title: serie.title,
			cover: serie.cover,
			issues,
			failedSources: serie.sources.map(s => ({
				name: s.source.name,
				failures: s.consecutive_failures,
			})),
			chaptersNeedingData: serie._count.chapters,
		}
	})
})
