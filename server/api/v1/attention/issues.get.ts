import { z } from "zod"
import type { Prisma } from "../../../utils/db"

const querySchema = z.object({
	type: z.enum(["all", "pending_deletion", "missing_cover", "scrape_failures", "chapter_data_missing"]).default("all"),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const query = getQuery(event)
	const parsed = querySchema.safeParse(query)
	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			message: `Invalid query: ${parsed.error.message}`,
		})
	}

	const { type, page, limit } = parsed.data
	const skip = (page - 1) * limit

	// Build where clause based on type filter
	function buildWhereClause(issueType: string): Prisma.SerieWhereInput {
		switch (issueType) {
			case "pending_deletion":
				return { soft_deleted_at: { not: null } }
			case "missing_cover":
				return { cover: null, soft_deleted_at: null }
			case "scrape_failures":
				return { sources: { some: { consecutive_failures: { gt: 0 } } }, soft_deleted_at: null }
			case "chapter_data_missing":
				return { chapters: { some: { page_fetch_status: { in: ["Pending", "Failed", "Partial"] } } }, soft_deleted_at: null }
			default: // "all"
				return {
					OR: [
						{ soft_deleted_at: { not: null } },
						{ cover: null },
						{ sources: { some: { consecutive_failures: { gt: 0 } } } },
						{ chapters: { some: { page_fetch_status: { in: ["Pending", "Failed", "Partial"] } } } },
					],
				}
		}
	}

	const whereClause = buildWhereClause(type)

	// Fetch series with pagination
	const [series, total] = await Promise.all([
		db.serie.findMany({
			where: whereClause,
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
			skip,
			take: limit,
		}),
		db.serie.count({ where: whereClause }),
	])

	// Get counts for each issue type (for tab badges)
	const [pendingDeletionCount, missingCoverCount, scrapeFailuresCount, chapterDataCount] = await Promise.all([
		db.serie.count({ where: { soft_deleted_at: { not: null } } }),
		db.serie.count({ where: { cover: null, soft_deleted_at: null } }),
		db.serie.count({ where: { sources: { some: { consecutive_failures: { gt: 0 } } }, soft_deleted_at: null } }),
		db.serie.count({ where: { chapters: { some: { page_fetch_status: { in: ["Pending", "Failed", "Partial"] } } }, soft_deleted_at: null } }),
	])

	// Transform series data
	const transformedSeries = series.map((serie) => {
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
			softDeletedAt: serie.soft_deleted_at,
			issues,
			failedSources: serie.sources.map(s => ({
				name: s.source.name,
				failures: s.consecutive_failures,
			})),
			chaptersNeedingData: serie._count.chapters,
		}
	})

	return {
		series: transformedSeries,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
		counts: {
			all: pendingDeletionCount + missingCoverCount + scrapeFailuresCount + chapterDataCount,
			pending_deletion: pendingDeletionCount,
			missing_cover: missingCoverCount,
			scrape_failures: scrapeFailuresCount,
			chapter_data_missing: chapterDataCount,
		},
	}
})
