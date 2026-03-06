export const RECOMPUTE_DEDUP_SPREAD_MS = 50
export const RECOMPUTE_INDEX_SPREAD_MS = 100
export const RECOMPUTE_DEDUP_BUFFER_MS = 5000

export function calculateRecomputeDedupDelayMs(index: number): number {
	return index * RECOMPUTE_DEDUP_SPREAD_MS
}

export function calculateRecomputeDedupEstimatedMs(seriesCount: number): number {
	return seriesCount * RECOMPUTE_DEDUP_SPREAD_MS + RECOMPUTE_DEDUP_BUFFER_MS
}

export function calculateRecomputeIndexDelayMs(index: number, dedupEstimatedMs: number): number {
	return dedupEstimatedMs + (index * RECOMPUTE_INDEX_SPREAD_MS)
}
