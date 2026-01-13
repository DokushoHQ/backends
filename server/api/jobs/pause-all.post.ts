export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	await Promise.all(allQueueNames.map(pauseQueue))

	return { success: true }
})
