import { z } from "zod"

const duplicateJobSchema = z.object({
	name: z.string().min(1),
	data: z.record(z.string(), z.unknown()),
	delay: z.number().optional(),
	priority: z.number().optional(),
	attempts: z.number().optional(),
	backoffType: z.enum(["fixed", "exponential"]).optional(),
	backoffDelay: z.number().optional(),
	removeOnComplete: z.union([z.boolean(), z.number()]).optional(),
	removeOnFail: z.union([z.boolean(), z.number()]).optional(),
})

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const queueParam = getRouterParam(event, "queue")

	if (!queueParam || !isValidQueueName(queueParam)) {
		throw createError({ statusCode: 400, message: "Invalid queue name" })
	}

	const body = await readBody(event)
	const parsed = duplicateJobSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({ statusCode: 400, message: "Invalid request body" })
	}

	const input = parsed.data
	const queueName = queueParam as QueueName
	const queue = getQueue(queueName)

	await queue.add(input.name, input.data, {
		delay: input.delay,
		priority: input.priority,
		attempts: input.attempts,
		backoff:
			input.backoffType && input.backoffDelay
				? { type: input.backoffType, delay: input.backoffDelay }
				: undefined,
		removeOnComplete: input.removeOnComplete,
		removeOnFail: input.removeOnFail,
	})

	return { success: true }
})
