export default defineEventHandler(async (event) => {
	const session = await requireAuth(event)

	if (!session.session) {
		throw createError({ statusCode: 401, message: "Session required" })
	}

	const sessions = await db.session.findMany({
		where: { userId: session.user.id },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			token: true,
			createdAt: true,
			expiresAt: true,
			ipAddress: true,
			userAgent: true,
		},
	})

	const currentToken = session.session.token

	return sessions.map(s => ({
		id: s.id,
		token: s.token,
		createdAt: s.createdAt,
		expiresAt: s.expiresAt,
		ipAddress: s.ipAddress,
		userAgent: s.userAgent,
		isCurrent: s.token === currentToken,
	}))
})
