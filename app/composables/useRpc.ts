import type { RouterClient } from "@orpc/server"
import type { router } from "~~/server/rpc"

export function useRpc() {
	return useNuxtApp().$rpc as RouterClient<typeof router>
}
