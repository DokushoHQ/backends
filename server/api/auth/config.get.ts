export default defineEventHandler(() => {
	const config = useRuntimeConfig()

	return {
		passwordEnabled: config.enablePassword,
		signupEnabled: config.enablePassword && !config.disableSignup,
		oidc: config.oidcProviderId
			? {
					providerId: config.oidcProviderId,
					providerName: config.public.oidcProviderName || null,
				}
			: null,
	}
})
