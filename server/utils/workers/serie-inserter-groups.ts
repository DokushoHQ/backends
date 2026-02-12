import type { Prisma } from "../db"
import type { SourceChapters } from "../sources/core"

type ScanlationGroupRecord = {
	id: string
	external_id: string
}

export async function upsertScanlationGroupsAndBuildMap(
	tx: Prisma.TransactionClient,
	sourceId: string,
	chaptersResult: SourceChapters,
): Promise<Map<string, string>> {
	const allGroups = chaptersResult.chapters.flatMap(c => c.groups)
	const uniqueGroups = new Map(allGroups.map(g => [g.id, g]))

	for (const group of uniqueGroups.values()) {
		await tx.scanlationGroup.upsert({
			where: {
				source_id_external_id: {
					source_id: sourceId,
					external_id: group.id,
				},
			},
			update: {
				name: group.name,
				...(group.url && { url: group.url.toString() }),
			},
			create: {
				source_id: sourceId,
				external_id: group.id,
				name: group.name,
				...(group.url && { url: group.url.toString() }),
			},
		})
	}

	const groupRecords = await tx.scanlationGroup.findMany({
		where: {
			source_id: sourceId,
			external_id: { in: [...uniqueGroups.keys()] },
		},
		select: { id: true, external_id: true },
	}) as ScanlationGroupRecord[]

	return new Map(groupRecords.map(g => [g.external_id, g.id]))
}
