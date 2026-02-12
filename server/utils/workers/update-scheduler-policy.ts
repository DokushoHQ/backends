export const FAILURE_BACKOFF_DAYS: Record<number, number> = {
	1: 0,
	2: 1,
	3: 3,
	4: 7,
	5: 14,
}

type RefreshEligibilityParams = {
	lastCheckedAt: Date | null
	consecutiveFailures: number
	now: Date
}

export function isEligibleForRefresh({
	lastCheckedAt,
	consecutiveFailures,
	now,
}: RefreshEligibilityParams): boolean {
	if (consecutiveFailures <= 0) {
		return true
	}

	const skipDays = FAILURE_BACKOFF_DAYS[Math.min(consecutiveFailures, 5)] ?? 14
	if (!lastCheckedAt) {
		return true
	}

	const daysSinceLastCheck = (now.getTime() - lastCheckedAt.getTime()) / (24 * 60 * 60 * 1000)
	return daysSinceLastCheck >= skipDays
}

type StaggerIntervalParams = {
	rateLimitDurationMs: number
	rateLimitMax: number
	spreadMs: number
	totalItems: number
}

export function calculateStaggerIntervalMs({
	rateLimitDurationMs,
	rateLimitMax,
	spreadMs,
	totalItems,
}: StaggerIntervalParams): number {
	const minInterval = rateLimitDurationMs / rateLimitMax
	const spreadInterval = spreadMs / Math.max(totalItems, 1)
	return Math.max(minInterval, spreadInterval)
}
