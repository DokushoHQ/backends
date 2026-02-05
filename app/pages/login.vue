<script setup lang="ts">
definePageMeta({
	layout: "blank",
	title: "Login",
})

const { isAuthenticated } = await useAuth()

// Fetch auth configuration from server
const { data: authConfig } = await useFetch("/api/auth/config")

// Auth configuration
const passwordEnabled = computed(() => authConfig.value?.passwordEnabled ?? false)
const signupEnabled = computed(() => authConfig.value?.signupEnabled ?? false)
const oidcProviderId = computed(() => authConfig.value?.oidc?.providerId || null)
const oidcProviderName = computed(() => {
	if (!oidcProviderId.value) return null
	// Use configured display name, or capitalize provider ID as fallback
	if (authConfig.value?.oidc?.providerName) {
		return authConfig.value.oidc.providerName
	}
	return oidcProviderId.value.charAt(0).toUpperCase() + oidcProviderId.value.slice(1)
})

// Last login method tracking
const lastLoginMethod = ref<string | null>(null)
onMounted(() => {
	lastLoginMethod.value = authClient.getLastUsedLoginMethod() ?? null
})
const lastUsedEmail = computed(() => lastLoginMethod.value === "email")
const lastUsedOidc = computed(() => oidcProviderId.value && lastLoginMethod.value === oidcProviderId.value)

// Redirect destination after auth
const route = useRoute()
const redirectTo = computed(() => {
	const redirect = route.query.redirect as string | undefined
	return redirect || "/"
})

// Redirect if already authenticated
watch(
	isAuthenticated,
	(authenticated) => {
		if (authenticated) {
			navigateTo(redirectTo.value)
		}
	},
	{ immediate: true },
)

const email = ref("")
const password = ref("")
const name = ref("")
const error = ref<string | null>(null)
const loading = ref(false)
const oauthLoading = ref(false)

// Email verification state
const verificationRequired = ref(false)
const verificationEmail = ref("")
const resendLoading = ref(false)
const resendSuccess = ref(false)

// Tab state
const activeTab = ref<"login" | "signup">("login")

async function handleEmailLogin() {
	error.value = null
	loading.value = true
	verificationRequired.value = false

	try {
		const result = await authClient.signIn.email({ email: email.value, password: password.value })
		if (result.error) {
			// Check if email verification is required (403 status)
			if (result.error.status === 403) {
				verificationRequired.value = true
				verificationEmail.value = email.value
				return
			}
			error.value = result.error.message || "Login failed"
		}
		else if ((result.data as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
			// 2FA is required - the twoFactorClient plugin will handle the redirect
			// via onTwoFactorRedirect callback, but we can also navigate explicitly
			await navigateTo("/two-factor")
		}
		else {
			await navigateTo(redirectTo.value, { external: true })
		}
	}
	catch (e: unknown) {
		error.value = e instanceof Error ? e.message : "An unexpected error occurred"
	}
	finally {
		loading.value = false
	}
}

async function handleSignUp() {
	error.value = null
	loading.value = true

	try {
		const result = await authClient.signUp.email({
			email: email.value,
			password: password.value,
			name: name.value,
		})
		if (result.error) {
			error.value = result.error.message || "Sign up failed"
		}
		else {
			// Redirect to verify-email page to show "check your email" message
			await navigateTo("/verify-email")
		}
	}
	catch (e: unknown) {
		error.value = e instanceof Error ? e.message : "An unexpected error occurred"
	}
	finally {
		loading.value = false
	}
}

async function handleOAuthLogin() {
	if (!oidcProviderId.value) return

	error.value = null
	oauthLoading.value = true

	try {
		await authClient.signIn.oauth2({
			providerId: oidcProviderId.value,
			callbackURL: redirectTo.value,
		})
	}
	catch {
		error.value = "OAuth login failed"
		oauthLoading.value = false
	}
}

async function handleResendVerification() {
	resendLoading.value = true
	resendSuccess.value = false
	error.value = null

	try {
		await authClient.sendVerificationEmail({
			email: verificationEmail.value,
			callbackURL: "/verify-email",
		})
		resendSuccess.value = true
	}
	catch (e: unknown) {
		error.value = e instanceof Error ? e.message : "Failed to resend verification email"
	}
	finally {
		resendLoading.value = false
	}
}

function resetVerificationState() {
	verificationRequired.value = false
	verificationEmail.value = ""
	resendSuccess.value = false
}
</script>

<template>
	<div class="auth-page">
		<AuthBackground />
		<div class="auth-page__container">
			<AuthCard
				icon="i-lucide-book-open"
				title="Welcome to Tsundoku"
				:subtitle="signupEnabled ? 'Sign in or create an account to access the dashboard' : 'Sign in to access the dashboard'"
			>
				<!-- Error message -->
				<AuthMessage
					v-if="error"
					type="error"
					class="auth-page__message"
				>
					{{ error }}
				</AuthMessage>

				<!-- Email verification required -->
				<template v-if="verificationRequired">
					<AuthMessage
						type="warning"
						title="Email verification required"
						class="auth-page__message"
					>
						Please check your email ({{ verificationEmail }}) and click the verification link before signing in.
					</AuthMessage>

					<AuthMessage
						v-if="resendSuccess"
						type="success"
						class="auth-page__message"
					>
						Verification email sent! Check your inbox.
					</AuthMessage>

					<div class="auth-page__actions">
						<AuthButton
							variant="outline"
							block
							:loading="resendLoading"
							@click="handleResendVerification"
						>
							<template #icon>
								<UIcon
									name="i-lucide-mail"
									class="size-4"
								/>
							</template>
							Resend verification email
						</AuthButton>

						<AuthButton
							variant="ghost"
							block
							@click="resetVerificationState"
						>
							Try a different email
						</AuthButton>
					</div>
				</template>

				<!-- Auth forms -->
				<template v-else>
					<!-- Tab switcher for signup enabled -->
					<div
						v-if="passwordEnabled && signupEnabled"
						class="auth-page__tabs"
					>
						<button
							class="auth-page__tab"
							:class="{ 'auth-page__tab--active': activeTab === 'login' }"
							type="button"
							@click="activeTab = 'login'"
						>
							Login
						</button>
						<button
							class="auth-page__tab"
							:class="{ 'auth-page__tab--active': activeTab === 'signup' }"
							type="button"
							@click="activeTab = 'signup'"
						>
							Sign Up
						</button>
					</div>

					<!-- Login form -->
					<form
						v-if="passwordEnabled && (activeTab === 'login' || !signupEnabled)"
						class="auth-page__form"
						@submit.prevent="handleEmailLogin"
					>
						<div
							v-if="lastUsedEmail"
							class="auth-page__last-used"
						>
							<UIcon
								name="i-lucide-history"
								class="size-4"
							/>
							<span>Last signed in with email</span>
						</div>

						<AuthInput
							v-model="email"
							type="email"
							label="Email"
							placeholder="you@example.com"
							autocomplete="email"
							required
						/>

						<AuthInput
							v-model="password"
							type="password"
							label="Password"
							autocomplete="current-password"
							required
						/>

						<div class="auth-page__forgot">
							<NuxtLink
								to="/forgot-password"
								class="auth-page__link"
							>
								Forgot password?
							</NuxtLink>
						</div>

						<AuthButton
							type="submit"
							block
							:loading="loading"
						>
							Sign in
						</AuthButton>
					</form>

					<!-- Signup form -->
					<form
						v-if="passwordEnabled && signupEnabled && activeTab === 'signup'"
						class="auth-page__form"
						@submit.prevent="handleSignUp"
					>
						<AuthInput
							v-model="name"
							type="text"
							label="Name"
							placeholder="Your name"
							autocomplete="name"
							required
						/>

						<AuthInput
							v-model="email"
							type="email"
							label="Email"
							placeholder="you@example.com"
							autocomplete="email"
							required
						/>

						<AuthInput
							v-model="password"
							type="password"
							label="Password"
							placeholder="Min 8 characters"
							autocomplete="new-password"
							:minlength="8"
							required
						/>

						<AuthButton
							type="submit"
							block
							:loading="loading"
						>
							Create account
						</AuthButton>
					</form>

					<!-- OIDC login -->
					<template v-if="oidcProviderId">
						<AuthDivider
							v-if="passwordEnabled"
							label="Or continue with"
						/>

						<div
							v-if="lastUsedOidc"
							class="auth-page__last-used"
						>
							<UIcon
								name="i-lucide-history"
								class="size-4"
							/>
							<span>Last signed in with {{ oidcProviderName }}</span>
						</div>

						<AuthButton
							variant="outline"
							block
							:loading="oauthLoading"
							@click="handleOAuthLogin"
						>
							Sign in with {{ oidcProviderName }}
						</AuthButton>
					</template>
				</template>
			</AuthCard>
		</div>
	</div>
</template>

<style scoped>
.auth-page {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1rem;
}

.auth-page__container {
	width: 100%;
	display: flex;
	justify-content: center;
}

.auth-page__message {
	margin-bottom: 1rem;
}

.auth-page__actions {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.auth-page__tabs {
	display: flex;
	gap: 0.25rem;
	padding: 0.25rem;
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
	margin-bottom: 1.5rem;
}

.auth-page__tab {
	flex: 1;
	padding: 0.625rem 1rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--ui-text-muted);
	background: transparent;
	border: none;
	border-radius: 0.375rem;
	cursor: pointer;
	transition:
		color 0.15s ease,
		background-color 0.15s ease;
}

.auth-page__tab:hover {
	color: var(--ui-text);
}

.auth-page__tab--active {
	color: var(--ui-text);
	background: var(--ui-bg-elevated);
	box-shadow: 0 1px 2px color-mix(in oklch, var(--ui-text) 5%, transparent);
}

.auth-page__form {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

.auth-page__last-used {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.8125rem;
	color: var(--ui-text-muted);
}

.auth-page__forgot {
	display: flex;
	justify-content: flex-end;
	margin-top: -0.5rem;
}

.auth-page__link {
	font-size: 0.8125rem;
	color: var(--ui-text-muted);
	text-decoration: none;
	transition: color 0.15s ease;
}

.auth-page__link:hover {
	color: var(--ui-text);
}
</style>
