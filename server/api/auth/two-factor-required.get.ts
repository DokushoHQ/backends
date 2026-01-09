export default defineEventHandler(async (event) => {
	const { user } = await requireAuth(event)

	// If 2FA is already enabled, not required
	if (user.twoFactorEnabled) {
		return { required: false }
	}

	// Check if user has password authentication
	const account = await db.account.findFirst({
		where: {
			userId: user.id,
			providerId: "credential",
		},
	})

	// 2FA is required only for password users who don't have it enabled
	return { required: !!account }
})
