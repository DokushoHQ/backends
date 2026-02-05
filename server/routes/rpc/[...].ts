import { RPCHandler } from "@orpc/server/fetch"
import { onError } from "@orpc/server"
import { router } from "../../rpc"

const handler = new RPCHandler(router, {
	interceptors: [
		onError((error) => {
			console.error("[oRPC]", error)
		}),
	],
})

export default defineEventHandler(async (event) => {
	const request = toWebRequest(event)

	const { matched, response } = await handler.handle(request, {
		prefix: "/rpc",
		context: {
			headers: event.headers,
		},
	})

	if (matched) {
		return response
	}

	throw createError({ statusCode: 404, message: "RPC route not found" })
})
