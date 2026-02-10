import { createTanstackQueryUtils } from "@orpc/tanstack-query"
import type { RouterClient } from "@orpc/server"
import type { router } from "~~/server/rpc"

export function useOrpc() {
	const client = useNuxtApp().$rpc as RouterClient<typeof router>
	return createTanstackQueryUtils(client)
}
