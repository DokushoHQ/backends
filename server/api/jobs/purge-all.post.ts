import { obliterateAllQueues } from "../../utils/queue-stats"

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const result = await obliterateAllQueues()

	return {
		success: result.errors.length === 0,
		purged: result.purged,
		errors: result.errors,
		message: result.errors.length === 0
			? `Successfully purged ${result.purged.length} queues`
			: `Purged ${result.purged.length} queues with ${result.errors.length} errors`,
	}
})
