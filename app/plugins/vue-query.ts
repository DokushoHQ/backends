import {
	VueQueryPlugin,
	QueryClient,
	hydrate,
	dehydrate,
	type DehydratedState,
} from "@tanstack/vue-query"
import { StandardRPCJsonSerializer, type StandardRPCJsonSerializedMetaItem } from "@orpc/client/standard"

export default defineNuxtPlugin((nuxt) => {
	const vueQueryState = useState<DehydratedState | null>("vue-query")

	const serializer = new StandardRPCJsonSerializer()

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn(queryKey) {
					const [json, meta] = serializer.serialize(queryKey)
					return JSON.stringify({ json, meta })
				},
				staleTime: 60_000,
			},
			dehydrate: {
				serializeData(data) {
					const [json, meta] = serializer.serialize(data)
					return { json, meta } as unknown as ReturnType<typeof data>
				},
			},
			hydrate: {
				deserializeData(data) {
					const d = data as unknown as { json: unknown, meta: readonly StandardRPCJsonSerializedMetaItem[] }
					return serializer.deserialize(d.json, d.meta)
				},
			},
		},
	})

	nuxt.vueApp.use(VueQueryPlugin, { queryClient })

	if (import.meta.server) {
		nuxt.hooks.hook("app:rendered", () => {
			vueQueryState.value = dehydrate(queryClient)
		})
	}

	if (import.meta.client) {
		nuxt.hooks.hook("app:created", () => {
			hydrate(queryClient, vueQueryState.value)
		})
	}
})
