import type { RouterClient } from "@orpc/server"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { router } from "~~/server/rpc"

export default defineNuxtPlugin(() => {
	const event = useRequestEvent()
	const requestURL = useRequestURL()

	const link = new RPCLink({
		url: `${requestURL.origin}/rpc`,
		headers: event?.headers,
	})

	const client: RouterClient<typeof router> = createORPCClient(link)

	return {
		provide: {
			rpc: client,
		},
	}
})
