import type { DuplicateGroupMember } from "../../../utils/prisma-json"

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const query = getQuery(event)
	const status = (query.status as string) || "Pending"
	const page = Math.max(1, Number.parseInt(String(query.page || "1"), 10))
	const limit = Math.min(50, Math.max(1, Number.parseInt(String(query.limit || "20"), 10)))
	const offset = (page - 1) * limit

	// Get total count
	const total = await db.duplicateGroup.count({
		where: { status: status as "Pending" | "Merged" | "Dismissed" },
	})

	// Get duplicate groups
	const groups = await db.duplicateGroup.findMany({
		where: { status: status as "Pending" | "Merged" | "Dismissed" },
		orderBy: { confidence: "desc" },
		skip: offset,
		take: limit,
	})

	// Fetch serie data for all members
	const allMemberIds = groups.flatMap(g => (g.members as DuplicateGroupMember[]).map(m => m.serieId))
	const seriesData = await db.serie.findMany({
		where: { id: { in: allMemberIds } },
		select: {
			id: true,
			title: true,
			cover: true,
			soft_deleted_at: true,
			sources: {
				select: {
					is_primary: true,
					source: { select: { id: true, name: true } },
				},
			},
			_count: {
				select: { chapters: { where: { enabled: true } } },
			},
		},
	})
	const seriesMap = new Map(seriesData.map(s => [s.id, s]))

	return {
		groups: groups.map(group => ({
			id: group.id,
			confidence: Math.round(group.confidence * 100),
			status: group.status,
			suggestedPrimaryId: group.suggested_primary_id,
			mergedIntoId: group.merged_into_id,
			mergedAt: group.merged_at,
			createdAt: group.created_at,
			series: (group.members as DuplicateGroupMember[]).map((member) => {
				const serie = seriesMap.get(member.serieId)
				return {
					id: member.serieId,
					title: serie?.title ?? member.titles[0] ?? "Unknown",
					cover: serie?.cover ?? null,
					similarity: Math.round(member.similarity * 100),
					chapterCount: serie?._count.chapters ?? 0,
					isDeleted: serie?.soft_deleted_at !== null,
					sources: serie?.sources.map(s => ({
						id: s.source.id,
						name: s.source.name,
						isPrimary: s.is_primary,
					})) ?? [],
				}
			}),
		})),
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	}
})
