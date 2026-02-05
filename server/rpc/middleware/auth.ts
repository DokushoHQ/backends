import { ORPCError, os } from "@orpc/server"
import type { Context } from "../context"
import { getAuth } from "../../utils/auth"

const authCheck = os
	.$context<Context>()
	.middleware(async ({ context, next }) => {
		if (!context.headers) {
			throw new ORPCError("UNAUTHORIZED", { message: "No headers provided" })
		}

		const auth = getAuth()
		const session = await auth.api.getSession({ headers: context.headers })

		if (!session) {
			throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" })
		}

		return next({
			context: {
				user: session.user,
				session: session.session,
			},
		})
	})

/** Base builder with auth middleware applied - use this to define authed procedures */
export const authed = os.$context<Context>().use(authCheck)
