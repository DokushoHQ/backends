import { allQueueNames, getQueue, queueConfig } from "../utils/queue-stats"

const MINUTES_PER_DAY = 1440

interface DailyData {
	date: string // ISO date string (YYYY-MM-DD)
	completed: number
	failed: number
}

interface QueueDailyMetrics {
	displayName: string
	daily: DailyData[]
	totalCompleted: number
	totalFailed: number
	// Recent activity for sparkline (last 24 hours, hourly buckets)
	recentCompleted: number[]
	recentFailed: number[]
}

/**
 * Aggregate minute-level metrics into daily buckets.
 * Data is chronological (index 0 = oldest minute).
 */
function aggregateToDaily(data: number[], days: number): number[] {
	const result: number[] = new Array(days).fill(0)

	// Work backwards from the end of the data array
	// data[data.length - 1] = most recent minute (today)
	// data[data.length - MINUTES_PER_DAY] = 1 day ago, etc.
	for (let day = 0; day < days; day++) {
		const endIdx = data.length - (day * MINUTES_PER_DAY)
		const startIdx = Math.max(0, endIdx - MINUTES_PER_DAY)
		const resultIdx = days - 1 - day

		for (let i = startIdx; i < endIdx && i < data.length; i++) {
			result[resultIdx] = (result[resultIdx] ?? 0) + (data[i] ?? 0)
		}
	}

	return result
}

/**
 * Get recent hourly data for sparklines (last 24 hours).
 */
function getRecentHourly(data: number[]): number[] {
	const MINUTES_PER_HOUR = 60
	const HOURS = 24
	const result: number[] = new Array(HOURS).fill(0)

	// Take last 24 hours of minute data
	const recentData = data.slice(-MINUTES_PER_DAY)

	for (let hour = 0; hour < HOURS; hour++) {
		const startIdx = hour * MINUTES_PER_HOUR
		const endIdx = Math.min(startIdx + MINUTES_PER_HOUR, recentData.length)

		for (let i = startIdx; i < endIdx; i++) {
			result[hour] = (result[hour] ?? 0) + (recentData[i] ?? 0)
		}
	}

	return result
}

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const query = getQuery(event)
	const days = Math.min(Math.max(Number(query.days) || 14, 1), 30)

	const perQueue: Record<string, QueueDailyMetrics> = {}

	// Generate date labels for the last N days
	const dateLabels: string[] = []
	const now = new Date()
	for (let i = days - 1; i >= 0; i--) {
		const date = new Date(now)
		date.setDate(date.getDate() - i)
		const isoDate = date.toISOString().split("T")[0] ?? ""
		dateLabels.push(isoDate)
	}

	for (const name of allQueueNames) {
		const queue = getQueue(name)

		const [completedMetrics, failedMetrics] = await Promise.all([
			queue.getMetrics("completed", 0, -1),
			queue.getMetrics("failed", 0, -1),
		])

		// Reverse to chronological order (index 0 = oldest)
		const completedData = [...completedMetrics.data].reverse()
		const failedData = [...failedMetrics.data].reverse()

		// Aggregate to daily
		const dailyCompleted = aggregateToDaily(completedData, days)
		const dailyFailed = aggregateToDaily(failedData, days)

		// Get recent hourly for sparklines
		const recentCompleted = getRecentHourly(completedData)
		const recentFailed = getRecentHourly(failedData)

		// Build daily data array
		const daily: DailyData[] = dateLabels.map((date, i) => ({
			date,
			completed: dailyCompleted[i] ?? 0,
			failed: dailyFailed[i] ?? 0,
		}))

		perQueue[name] = {
			displayName: queueConfig[name].displayName,
			daily,
			totalCompleted: completedMetrics.count,
			totalFailed: failedMetrics.count,
			recentCompleted,
			recentFailed,
		}
	}

	// Aggregate all queues
	const aggregatedDaily: DailyData[] = dateLabels.map((date, i) => ({
		date,
		completed: Object.values(perQueue).reduce((sum, q) => sum + (q.daily[i]?.completed ?? 0), 0),
		failed: Object.values(perQueue).reduce((sum, q) => sum + (q.daily[i]?.failed ?? 0), 0),
	}))

	const aggregatedRecent = {
		completed: new Array(24).fill(0) as number[],
		failed: new Array(24).fill(0) as number[],
	}

	for (const q of Object.values(perQueue)) {
		q.recentCompleted.forEach((v, i) => {
			aggregatedRecent.completed[i] = (aggregatedRecent.completed[i] ?? 0) + v
		})
		q.recentFailed.forEach((v, i) => {
			aggregatedRecent.failed[i] = (aggregatedRecent.failed[i] ?? 0) + v
		})
	}

	return {
		days,
		dates: dateLabels,
		aggregated: {
			daily: aggregatedDaily,
			recentCompleted: aggregatedRecent.completed,
			recentFailed: aggregatedRecent.failed,
			totalCompleted: Object.values(perQueue).reduce((sum, q) => sum + q.totalCompleted, 0),
			totalFailed: Object.values(perQueue).reduce((sum, q) => sum + q.totalFailed, 0),
		},
		perQueue,
	}
})
