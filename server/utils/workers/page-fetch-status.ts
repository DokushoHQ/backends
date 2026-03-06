import type { PageFetchStatus } from "../db"

export type PageFetchCounts = {
	successCount: number
	retryableFailedCount: number
	permanentlyFailedCount: number
}

export function resolvePageFetchStatusFromCounts(counts: PageFetchCounts): PageFetchStatus {
	const { successCount, retryableFailedCount, permanentlyFailedCount } = counts

	if (retryableFailedCount === 0 && permanentlyFailedCount === 0) {
		return "Success"
	}

	if (successCount === 0 && permanentlyFailedCount === 0) {
		return "Failed"
	}

	if (successCount === 0 && retryableFailedCount === 0) {
		return "PermanentlyFailed"
	}

	if (permanentlyFailedCount > 0) {
		return "Incomplete"
	}

	return "Partial"
}
