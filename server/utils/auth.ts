import { type BetterAuthOptions, betterAuth } from "better-auth"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin, apiKey, bearer, genericOAuth, lastLoginMethod, openAPI, twoFactor } from "better-auth/plugins"
import emailQueue from "../queues/email"
import { db } from "./db"

type Auth = ReturnType<typeof createAuth>

let _auth: Auth | null = null

/**
 * Decode a JWT token payload without verification (for extracting claims)
 */
function decodeJwt(token: string): Record<string, unknown> | null {
	try {
		const parts = token.split(".")
		if (parts.length !== 3 || !parts[1]) return null
		return JSON.parse(Buffer.from(parts[1], "base64url").toString())
	}
	catch {
		return null
	}
}

/**
 * Map OIDC groups to an application role based on the role map config
 */
function mapGroupsToRole(groups: string[], roleMap: Record<string, string>): string | null {
	for (const [group, role] of Object.entries(roleMap)) {
		if (groups.includes(group)) {
			return role
		}
	}
	return null
}

function createAuth() {
	const config = useRuntimeConfig()

	const basePlugins = [
		admin(),
		apiKey({
			rateLimit: {
				maxRequests: 1000,
				timeWindow: 1000 * 60 * 5,
			},
		}),
		bearer(),
		lastLoginMethod(),
		twoFactor({
			issuer: "Dokusho",
		}),
		openAPI(),
	]

	// Parse role map from config if provided
	let oidcRoleMap: Record<string, string> | null = null
	if (config.oidcRoleMap) {
		try {
			oidcRoleMap = JSON.parse(config.oidcRoleMap)
		}
		catch {
			console.warn("Invalid OIDC_ROLE_MAP JSON, skipping role mapping")
		}
	}

	// Build OIDC plugin separately if configured
	const oidcPlugin
		= config.oidcProviderId && config.oidcClientId && config.oidcClientSecret && config.oidcDiscoveryUrl
			? genericOAuth({
					config: [
						{
							providerId: config.oidcProviderId,
							clientId: config.oidcClientId,
							clientSecret: config.oidcClientSecret,
							discoveryUrl: config.oidcDiscoveryUrl,
							pkce: true,
							scopes: ["openid", "email", "profile", "groups"],
							accessType: "offline",
						},
					],
				})
			: null

	const authOptions = {
		database: prismaAdapter(db, { provider: "postgresql" }),
		emailVerification: {
			sendVerificationEmail: async ({ user, url, token }) => {
				const verificationUrl = new URL(url)
				const existingCallback = verificationUrl.searchParams.get("callbackURL")
					|| verificationUrl.searchParams.get("callbackUrl")

				// Decode token to check if this is a change email request
				const tokenPayload = decodeJwt(token)
				const isChangeEmail = tokenPayload?.requestType === "change-email-verification"
				const newEmail = isChangeEmail ? (tokenPayload?.updateTo as string) : null
				const oldEmail = isChangeEmail ? (tokenPayload?.email as string) : null

				// Only set default callback for signup verification, not email change
				if (!existingCallback || !existingCallback.includes("/me")) {
					verificationUrl.searchParams.set("callbackURL", "/verify-email?verified=true")
				}

				// Enqueue email job - don't await to prevent timing attacks
				if (isChangeEmail && newEmail && oldEmail) {
					emailQueue.add("email-change", {
						type: "EMAIL_CHANGE",
						to: newEmail,
						userName: user.name || "User",
						changeEmailUrl: verificationUrl.toString(),
					}).catch((err: unknown) => console.error("Failed to enqueue email change verification:", err))

					// Send warning to OLD email address
					emailQueue.add("email-change-warning", {
						type: "EMAIL_CHANGE_WARNING",
						to: oldEmail,
						userName: user.name || "User",
						newEmail: newEmail,
					}).catch((err: unknown) => console.error("Failed to enqueue email change warning:", err))
				}
				else {
					emailQueue.add("email-verification", {
						type: "EMAIL_VERIFICATION",
						to: user.email,
						userName: user.name || "User",
						verificationUrl: verificationUrl.toString(),
					}).catch((err: unknown) => console.error("Failed to enqueue verification email:", err))
				}
			},
			sendOnSignUp: true,
		},
		emailAndPassword: {
			enabled: config.enablePassword,
			requireEmailVerification: true,
			minPasswordLength: 16,
			revokeSessionsOnPasswordReset: true,
			disableSignUp: config.disableSignup,
			sendResetPassword: async ({ user, url }) => {
				// Enqueue email job - don't await to prevent timing attacks
				emailQueue.add("password-reset", {
					type: "PASSWORD_RESET",
					to: user.email,
					userName: user.name || "User",
					resetUrl: url,
				}).catch((err: unknown) => console.error("Failed to enqueue password reset email:", err))
			},
			resetPasswordTokenExpiresIn: 3600, // 1 hour
			onPasswordReset: async ({ user }) => {
				emailQueue.add("password-reset-confirmation", {
					type: "PASSWORD_RESET_CONFIRMATION",
					to: user.email,
					userName: user.name || "User",
				}).catch((err: unknown) => console.error("Failed to enqueue password reset confirmation:", err))
			},
		},
		user: {
			changeEmail: {
				enabled: true,
			},
			deleteUser: {
				enabled: true,
			},
		},
		secret: config.authSecret,
		baseURL: config.public.baseUrl,
		trustedOrigins: config.corsOrigins?.split(",") || [],
		plugins: oidcPlugin ? [...basePlugins, oidcPlugin] : basePlugins,
		databaseHooks: {
			account: {
				create: {
					after: async (account) => {
						// Map OIDC groups to role when an OAuth account is created/linked
						if (!oidcRoleMap || !account.idToken) return

						const decoded = decodeJwt(account.idToken)
						if (!decoded?.groups) return

						const groups = decoded.groups as string[]
						const role = mapGroupsToRole(groups, oidcRoleMap)

						if (role) {
							await db.user.update({
								where: { id: account.userId },
								data: { role },
							})
						}
					},
				},
			},
		},
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				if (ctx.path === "/sign-up/email" && config.disableSignup) {
					throw new APIError("FORBIDDEN", { message: "Registration is disabled" })
				}
			}),
		},
	} satisfies BetterAuthOptions

	return betterAuth(authOptions)
}

export function getAuth(): Auth {
	if (!_auth) {
		_auth = createAuth()
	}
	return _auth
}

// Lazy proxy for backwards compatibility
export const auth = new Proxy({} as Auth, {
	get(_target, prop: string | symbol) {
		const instance = getAuth()
		const value = instance[prop as keyof Auth]
		if (typeof value === "function") {
			return value.bind(instance)
		}
		return value
	},
})
