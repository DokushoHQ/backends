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

// Redirect if already authenticated
watch(
	isAuthenticated,
	(authenticated) => {
		if (authenticated) {
			navigateTo("/")
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
			await navigateTo("/", { external: true })
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
			callbackURL: "/",
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
	<div class="flex min-h-screen items-center justify-center bg-background p-4">
		<UCard class="w-full max-w-md">
			<template #header>
				<div class="text-center">
					<div class="flex justify-center mb-4">
						<UIcon
							name="i-lucide-book-open"
							class="h-12 w-12"
						/>
					</div>
					<h1 class="text-2xl font-semibold">
						Welcome to Dokusho
					</h1>
					<p class="text-sm text-muted-foreground">
						{{ signupEnabled ? 'Sign in or create an account to access the dashboard' : 'Sign in to access the dashboard' }}
					</p>
				</div>
			</template>

			<div class="space-y-4">
				<div
					v-if="error"
					class="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
				>
					{{ error }}
				</div>

				<!-- Email verification required -->
				<template v-if="verificationRequired">
					<div class="space-y-4">
						<div class="rounded-md bg-warning/10 p-4">
							<div class="flex items-start gap-3">
								<UIcon
									name="i-lucide-mail-warning"
									class="h-5 w-5 text-warning mt-0.5"
								/>
								<div>
									<p class="font-medium text-warning">
										Email verification required
									</p>
									<p class="text-sm text-muted-foreground mt-1">
										Please check your email ({{ verificationEmail }}) and click the verification link before signing in.
									</p>
								</div>
							</div>
						</div>

						<div
							v-if="resendSuccess"
							class="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400"
						>
							Verification email sent! Check your inbox.
						</div>

						<UButton
							block
							variant="outline"
							:loading="resendLoading"
							@click="handleResendVerification"
						>
							<UIcon
								name="i-lucide-mail"
								class="h-4 w-4 mr-2"
							/>
							Resend verification email
						</UButton>

						<UButton
							block
							variant="ghost"
							@click="resetVerificationState"
						>
							Try a different email
						</UButton>
					</div>
				</template>

				<!-- Password auth with signup enabled: show tabs -->
				<UTabs
					v-else-if="passwordEnabled && signupEnabled"
					:items="[
						{ label: 'Login', slot: 'login' },
						{ label: 'Sign Up', slot: 'signup' },
					]"
					class="w-full"
				>
					<template #login>
						<form
							class="space-y-4 mt-4"
							@submit.prevent="handleEmailLogin"
						>
							<div
								v-if="lastUsedEmail"
								class="flex items-center gap-2 text-sm text-muted-foreground"
							>
								<UIcon
									name="i-lucide-history"
									class="h-4 w-4"
								/>
								<span>Last signed in with email</span>
							</div>
							<UFormField label="Email">
								<UInput
									v-model="email"
									type="email"
									placeholder="you@example.com"
									required
									class="w-full"
								/>
							</UFormField>
							<UFormField label="Password">
								<UInput
									v-model="password"
									type="password"
									required
									class="w-full"
								/>
							</UFormField>
							<div class="text-right">
								<NuxtLink
									to="/forgot-password"
									class="text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									Forgot password?
								</NuxtLink>
							</div>
							<UButton
								type="submit"
								block
								:loading="loading"
							>
								Sign in
							</UButton>
						</form>
					</template>

					<template #signup>
						<form
							class="space-y-4 mt-4"
							@submit.prevent="handleSignUp"
						>
							<UFormField label="Name">
								<UInput
									v-model="name"
									type="text"
									placeholder="Your name"
									required
									class="w-full"
								/>
							</UFormField>
							<UFormField label="Email">
								<UInput
									v-model="email"
									type="email"
									placeholder="you@example.com"
									required
									class="w-full"
								/>
							</UFormField>
							<UFormField label="Password">
								<UInput
									v-model="password"
									type="password"
									placeholder="Min 8 characters"
									required
									minlength="8"
									class="w-full"
								/>
							</UFormField>
							<UButton
								type="submit"
								block
								:loading="loading"
							>
								Create account
							</UButton>
						</form>
					</template>
				</UTabs>

				<!-- Password auth with signup disabled: show login form only -->
				<form
					v-else-if="passwordEnabled && !signupEnabled"
					class="space-y-4"
					@submit.prevent="handleEmailLogin"
				>
					<div
						v-if="lastUsedEmail"
						class="flex items-center gap-2 text-sm text-muted-foreground"
					>
						<UIcon
							name="i-lucide-history"
							class="h-4 w-4"
						/>
						<span>Last signed in with email</span>
					</div>
					<UFormField label="Email">
						<UInput
							v-model="email"
							type="email"
							placeholder="you@example.com"
							required
							class="w-full"
						/>
					</UFormField>
					<UFormField label="Password">
						<UInput
							v-model="password"
							type="password"
							required
							class="w-full"
						/>
					</UFormField>
					<div class="text-right">
						<NuxtLink
							to="/forgot-password"
							class="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Forgot password?
						</NuxtLink>
					</div>
					<UButton
						type="submit"
						block
						:loading="loading"
					>
						Sign in
					</UButton>
				</form>

				<template v-if="oidcProviderId">
					<USeparator
						v-if="passwordEnabled"
						label="Or continue with"
					/>

					<div
						v-if="lastUsedOidc"
						class="flex items-center gap-2 text-sm text-muted-foreground"
					>
						<UIcon
							name="i-lucide-history"
							class="h-4 w-4"
						/>
						<span>Last signed in with {{ oidcProviderName }}</span>
					</div>

					<UButton
						variant="outline"
						block
						:loading="oauthLoading"
						@click="handleOAuthLogin"
					>
						Sign in with {{ oidcProviderName }}
					</UButton>
				</template>
			</div>
		</UCard>
	</div>
</template>
