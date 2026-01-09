import { type H3Event, getHeader } from "h3"
import { getAuth } from "./auth"
import { db } from "./db"

export type AuthedContext = {
	user: ReturnType<typeof getAuth>["$Infer"]["Session"]["user"]
	session: ReturnType<typeof getAuth>["$Infer"]["Session"]["session"] | null
}

/**
 * Try to authenticate via API key from headers.
 * Returns the user if valid, null otherwise.
 */
async function tryApiKeyAuth(event: H3Event): Promise<AuthedContext | null> {
	const auth = getAuth()

	// Check for API key in x-api-key header or Authorization: Bearer header
	const apiKey = getHeader(event, "x-api-key") || getHeader(event, "authorization")?.replace(/^Bearer\s+/i, "")

	if (!apiKey) {
		return null
	}

	const result = await auth.api.verifyApiKey({
		body: { key: apiKey },
	})

	if (!result.valid || !result.key) {
		return null
	}

	// Fetch the user from the database
	const user = await db.user.findUnique({
		where: { id: result.key.userId },
	})

	if (!user) {
		return null
	}

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			emailVerified: user.emailVerified,
			image: user.image,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			role: user.role,
			banned: user.banned,
			banReason: user.banReason,
			banExpires: user.banExpires,
			twoFactorEnabled: user.twoFactorEnabled,
		},
		session: null,
	}
}

/**
 * Require authentication for a request. Throws 401 if not authenticated.
 * Checks API key first, then falls back to session-based auth.
 */
export async function requireAuth(event: H3Event): Promise<AuthedContext> {
	// Try API key authentication first
	const apiKeyAuth = await tryApiKeyAuth(event)
	if (apiKeyAuth) {
		return apiKeyAuth
	}

	// Fall back to session-based authentication
	const auth = getAuth()
	const session = await auth.api.getSession({ headers: event.headers })

	if (!session) {
		throw createError({ statusCode: 401, message: "Unauthorized" })
	}

	return {
		user: session.user,
		session: session.session,
	}
}

/**
 * Require admin role for a request. Throws 401 if not authenticated, 403 if not admin.
 */
export async function requireAdmin(event: H3Event): Promise<AuthedContext> {
	const ctx = await requireAuth(event)

	if (ctx.user.role !== "admin") {
		throw createError({ statusCode: 403, message: "Forbidden: Admin access required" })
	}

	return ctx
}
