export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const stats = await getAllQueueStats()

	return {
		stats,
		totalJobs: stats.reduce((sum, q) => sum + q.total, 0),
		totalActive: stats.reduce((sum, q) => sum + q.active, 0),
		totalWaiting: stats.reduce((sum, q) => sum + q.waiting, 0),
		totalCompleted: stats.reduce((sum, q) => sum + q.completed, 0),
		totalFailed: stats.reduce((sum, q) => sum + q.failed, 0),
		totalDelayed: stats.reduce((sum, q) => sum + q.delayed, 0),
	}
})
