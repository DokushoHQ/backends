export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	await Promise.all(allQueueNames.map(resumeQueue))

	return { success: true }
})
