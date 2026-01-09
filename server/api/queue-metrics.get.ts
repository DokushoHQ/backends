import { allQueueNames, getQueue, queueConfig } from "../utils/queue-stats"

/**
 * Append pending metrics data that hasn't been flushed to the array yet.
 * BullMQ only writes metrics when a job completes, so pending jobs are
 * tracked in metadata (count - prevCount) but not in the data array.
 *
 * We fill the gap from prevTS to now with zeros, and place pending jobs
 * at "minutesElapsed - 1" minutes ago (1 minute after the last recorded point).
 * This ensures the timeline extends to "now" and pending appears at the
 * approximate time the jobs completed.
 */
function appendPendingData(
	data: number[],
	meta: Record<string, string> | null,
	now: number,
): number[] {
	if (!meta?.count || !meta?.prevCount || !meta?.prevTS) {
		return data
	}

	const count = Number.parseInt(meta.count)
	const prevCount = Number.parseInt(meta.prevCount)
	const prevTS = Number.parseInt(meta.prevTS)

	const pendingJobs = count - prevCount
	const minutesElapsed = Math.floor((now - prevTS) / 60000)

	// Only add if there are pending jobs and at least 1 minute has passed
	if (pendingJobs <= 0 || minutesElapsed <= 0) {
		return data
	}

	// BullMQ stores newest first (LPUSH behavior)
	// Build: [zeros for gap (now to 1min after prevTS), pending, original data]
	// After reverse: [original data reversed, pending, zeros]
	// This puts:
	// - Original data[0] at "minutesElapsed" minutes ago
	// - Pending at "minutesElapsed - 1" minutes ago
	// - Rightmost at "0m" (now)
	const result: number[] = []

	// Add zeros for the gap (from now to 1 minute after prevTS)
	for (let i = 0; i < minutesElapsed - 1; i++) {
		result.push(0)
	}

	// Add pending jobs at the minute right after last recorded
	result.push(pendingJobs)

	// Add original data
	result.push(...data)

	return result
}

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const now = Date.now()

	const perQueue: Record<string, {
		displayName: string
		completed: number[]
		failed: number[]
		completedCount: number
		failedCount: number
	}> = {}

	for (const name of allQueueNames) {
		const queue = getQueue(name)
		const redis = await queue.client

		// Get metrics data and metadata in parallel
		const [completedMetrics, failedMetrics, completedMeta, failedMeta] = await Promise.all([
			queue.getMetrics("completed", 0, -1),
			queue.getMetrics("failed", 0, -1),
			redis.hgetall(`bull:${queueConfig[name].name}:metrics:completed`),
			redis.hgetall(`bull:${queueConfig[name].name}:metrics:failed`),
		])

		// Append pending data that hasn't been flushed yet
		const completedWithPending = appendPendingData(completedMetrics.data, completedMeta, now)
		const failedWithPending = appendPendingData(failedMetrics.data, failedMeta, now)

		// BullMQ returns data with index 0 = newest, we reverse so index 0 = oldest
		// This makes it chronological: oldest on left, newest on right
		perQueue[name] = {
			displayName: queueConfig[name].displayName,
			completed: [...completedWithPending].reverse(),
			failed: [...failedWithPending].reverse(),
			completedCount: completedMetrics.count,
			failedCount: failedMetrics.count,
		}
	}

	// Aggregate all queues
	const allData = Object.values(perQueue)
	const maxLen = Math.max(...allData.map(q => Math.max(q.completed.length, q.failed.length)), 0)

	const aggregated = {
		completed: new Array(maxLen).fill(0) as number[],
		failed: new Array(maxLen).fill(0) as number[],
		completedCount: 0,
		failedCount: 0,
	}

	for (const q of allData) {
		q.completed.forEach((v, i) => {
			aggregated.completed[i] = (aggregated.completed[i] ?? 0) + v
		})
		q.failed.forEach((v, i) => {
			aggregated.failed[i] = (aggregated.failed[i] ?? 0) + v
		})
		aggregated.completedCount += q.completedCount
		aggregated.failedCount += q.failedCount
	}

	return { aggregated, perQueue }
})
