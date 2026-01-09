export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	const users = await db.user.findMany({
		orderBy: { createdAt: "desc" },
	})

	return {
		users: users.map(user => ({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			role: user.role,
			emailVerified: user.emailVerified,
			createdAt: user.createdAt,
		})),
	}
})
