export default defineEventHandler(async (event) => {
	const session = await requireAuth(event)
	const config = useRuntimeConfig()

	const user = await db.user.findUnique({
		where: { id: session.user.id },
		include: {
			apikeys: {
				orderBy: { createdAt: "desc" },
			},
			accounts: {
				select: {
					providerId: true,
					createdAt: true,
				},
			},
		},
	})

	if (!user) {
		throw createError({ statusCode: 404, message: "User not found" })
	}

	// Build linked accounts with display names
	const linkedAccounts = user.accounts.map((account) => {
		let displayName: string
		if (account.providerId === "credential") {
			displayName = "Password"
		}
		else if (account.providerId === config.oidcProviderId) {
			displayName = config.public.oidcProviderName || account.providerId.charAt(0).toUpperCase() + account.providerId.slice(1)
		}
		else {
			displayName = account.providerId.charAt(0).toUpperCase() + account.providerId.slice(1)
		}

		return {
			providerId: account.providerId,
			displayName,
			linkedAt: account.createdAt,
		}
	})

	const hasPassword = linkedAccounts.some(a => a.providerId === "credential")

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			role: user.role,
			createdAt: user.createdAt,
			twoFactorEnabled: user.twoFactorEnabled ?? false,
		},
		hasPassword,
		linkedAccounts,
		apiKeys: user.apikeys.map(key => ({
			id: key.id,
			name: key.name,
			start: key.start,
			enabled: key.enabled ?? true,
			requestCount: key.requestCount ?? 0,
			lastRequest: key.lastRequest,
			expiresAt: key.expiresAt,
			createdAt: key.createdAt,
		})),
	}
})
