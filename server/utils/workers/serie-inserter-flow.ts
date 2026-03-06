import type { ChapterDataJobData } from "../../queues/chapter-data"
import type { ChapterDedupJobData } from "../../queues/chapter-dedup"
import type { CoverUpdateJobData } from "../../queues/cover-update"
import type { IndexerJobData } from "../../queues/indexer"

type FlowNode = {
	name: string
	queueName: string
	data: ChapterDataJobData | ChapterDedupJobData | CoverUpdateJobData | IndexerJobData
	opts: { priority: number }
	children?: FlowNode[]
}

type BuildSerieInserterFlowParams = {
	serieId: string
	serieSourceId: string
	chapterIds: string[]
	sourceId: string
	priority: number
}

export function buildSerieInserterFlow({
	serieId,
	serieSourceId,
	chapterIds,
	sourceId,
	priority,
}: BuildSerieInserterFlowParams): FlowNode {
	const earlyChildren: FlowNode[] = [
		{
			name: `cover-${serieSourceId}`,
			queueName: "cover-update",
			data: {
				type: "SOURCE",
				serie_source_id: serieSourceId,
			} as CoverUpdateJobData,
			opts: { priority },
		},
		{
			name: `dedup-early-${serieId}`,
			queueName: "chapter-dedup",
			data: { serie_id: serieId } as ChapterDedupJobData,
			opts: { priority },
		},
	]

	if (chapterIds.length > 0) {
		return {
			name: `indexer-final-${serieId}`,
			queueName: "indexer",
			data: { serie_id: serieId, type: "UPDATE" } as IndexerJobData,
			opts: { priority },
			children: [
				{
					name: `dedup-final-${serieId}`,
					queueName: "chapter-dedup",
					data: { serie_id: serieId } as ChapterDedupJobData,
					opts: { priority },
					children: chapterIds.map((chapterId, index) => ({
						name: `chapter-${chapterId}`,
						queueName: "chapter-data",
						data: {
							serie_id: serieId,
							source_id: sourceId,
							chapter_id: chapterId,
							type: "UPDATE",
						} as ChapterDataJobData,
						opts: { priority },
						...(index === 0 && {
							children: [
								{
									name: `indexer-middle-${serieId}`,
									queueName: "indexer",
									data: { serie_id: serieId, type: "UPDATE" } as IndexerJobData,
									opts: { priority },
									children: earlyChildren,
								},
							],
						}),
					})),
				},
			],
		}
	}

	return {
		name: `indexer-final-${serieId}`,
		queueName: "indexer",
		data: { serie_id: serieId, type: "UPDATE" } as IndexerJobData,
		opts: { priority },
		children: [
			{
				name: `dedup-${serieId}`,
				queueName: "chapter-dedup",
				data: { serie_id: serieId } as ChapterDedupJobData,
				opts: { priority },
				children: [
					{
						name: `cover-${serieSourceId}`,
						queueName: "cover-update",
						data: {
							type: "SOURCE",
							serie_source_id: serieSourceId,
						} as CoverUpdateJobData,
						opts: { priority },
					},
				],
			},
		],
	}
}
