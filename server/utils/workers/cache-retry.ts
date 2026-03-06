export const MAX_CACHE_RETRIES = 4

export const CACHE_RETRY_DELAYS_MS = [
	10 * 60 * 1000,
	60 * 60 * 1000,
	2 * 60 * 60 * 1000,
	6 * 60 * 60 * 1000,
] as const

export function getCacheRetryDelayMs(retryAttempt: number): number {
	return CACHE_RETRY_DELAYS_MS[retryAttempt] ?? CACHE_RETRY_DELAYS_MS[CACHE_RETRY_DELAYS_MS.length - 1]!
}

export function getCacheRetryDelayLabel(retryAttempt: number): string {
	if (retryAttempt === 0) return "10 min"
	if (retryAttempt === 1) return "1h"
	if (retryAttempt === 2) return "2h"
	return "6h"
}
