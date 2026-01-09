export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const id = getRouterParam(event, "id")

	if (!id) {
		throw createError({ statusCode: 400, message: "User ID is required" })
	}

	const user = await db.user.findUnique({
		where: { id },
		include: {
			sessions: {
				orderBy: { createdAt: "desc" },
			},
			accounts: {
				orderBy: { createdAt: "desc" },
			},
			apikeys: {
				orderBy: { createdAt: "desc" },
			},
		},
	})

	if (!user) {
		throw createError({ statusCode: 404, message: "User not found" })
	}

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			role: user.role,
			emailVerified: user.emailVerified,
			banned: user.banned,
			banReason: user.banReason,
			banExpires: user.banExpires,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		},
		accounts: user.accounts.map(account => ({
			id: account.id,
			providerId: account.providerId,
			createdAt: account.createdAt,
		})),
		sessions: user.sessions.map(session => ({
			id: session.id,
			userAgent: session.userAgent,
			ipAddress: session.ipAddress,
			createdAt: session.createdAt,
			expiresAt: session.expiresAt,
		})),
		apiKeys: user.apikeys.map(apikey => ({
			id: apikey.id,
			name: apikey.name,
			start: apikey.start,
			enabled: apikey.enabled ?? true,
			requestCount: apikey.requestCount ?? 0,
			lastRequest: apikey.lastRequest,
			expiresAt: apikey.expiresAt,
		})),
	}
})
