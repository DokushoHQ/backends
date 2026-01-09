import { adminClient, apiKeyClient, genericOAuthClient, lastLoginMethodClient, twoFactorClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/vue"

export const authClient = createAuthClient({
	plugins: [
		adminClient(),
		apiKeyClient(),
		genericOAuthClient(),
		lastLoginMethodClient(),
		twoFactorClient({
			onTwoFactorRedirect: () => {
				navigateTo("/two-factor")
			},
		}),
	],
})
