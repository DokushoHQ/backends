<script setup lang="ts">
definePageMeta({
	layout: "blank",
	title: "Reset Password",
})

const route = useRoute()
const token = computed(() => route.query.token as string | undefined)
const tokenError = computed(() => route.query.error as string | undefined)

const password = ref("")
const confirmPassword = ref("")
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

// Handle invalid/expired token from URL
onMounted(() => {
	if (tokenError.value === "INVALID_TOKEN") {
		error.value = "This reset link is invalid or has expired. Please request a new one."
	}
})

async function handleSubmit() {
	if (!token.value) {
		error.value = "Invalid reset link. Please request a new password reset."
		return
	}

	if (password.value.length < 8) {
		error.value = "Password must be at least 8 characters"
		return
	}

	if (password.value !== confirmPassword.value) {
		error.value = "Passwords do not match"
		return
	}

	loading.value = true
	error.value = null

	try {
		const result = await authClient.resetPassword({
			newPassword: password.value,
			token: token.value,
		})

		if (result.error) {
			error.value = result.error.message || "Failed to reset password"
			return
		}

		success.value = true
		// Redirect to login after delay
		setTimeout(() => navigateTo("/login"), 3000)
	}
	catch (e: unknown) {
		error.value = e instanceof Error ? e.message : "An unexpected error occurred"
	}
	finally {
		loading.value = false
	}
}

// Compute footer link based on state
const footerLink = computed(() => {
	if (!token.value && !tokenError.value) {
		return { to: "/forgot-password", label: "Request a new password reset", primary: true }
	}
	return { to: "/login", label: "Back to login", primary: false }
})
</script>

<template>
	<div class="auth-page">
		<AuthBackground />
		<div class="auth-page__container">
			<AuthCard
				icon="i-lucide-lock-keyhole"
				title="Reset Password"
				:subtitle="success ? 'Your password has been reset' : 'Enter your new password'"
				:accent-color="success ? 'success' : 'primary'"
			>
				<!-- Success State -->
				<template v-if="success">
					<AuthMessage
						type="success"
						title="Password reset successful"
					>
						Redirecting to login...
					</AuthMessage>
				</template>

				<!-- No Token State -->
				<template v-else-if="!token && !tokenError">
					<AuthMessage
						type="warning"
						title="Invalid reset link"
					>
						This page requires a valid password reset link.
					</AuthMessage>
				</template>

				<!-- Form State -->
				<template v-else>
					<AuthMessage
						v-if="error"
						type="error"
						class="auth-page__message"
					>
						{{ error }}
						<NuxtLink
							v-if="tokenError === 'INVALID_TOKEN'"
							to="/forgot-password"
							class="auth-page__inline-link"
						>
							Request a new password reset
						</NuxtLink>
					</AuthMessage>

					<form
						v-if="token && !tokenError"
						class="auth-page__form"
						@submit.prevent="handleSubmit"
					>
						<AuthInput
							v-model="password"
							type="password"
							label="New Password"
							placeholder="Min 8 characters"
							autocomplete="new-password"
							:minlength="8"
							required
						/>

						<AuthInput
							v-model="confirmPassword"
							type="password"
							label="Confirm Password"
							placeholder="Confirm your password"
							autocomplete="new-password"
							required
						/>

						<AuthButton
							type="submit"
							block
							:loading="loading"
						>
							Reset Password
						</AuthButton>
					</form>
				</template>

				<template #footer>
					<div class="auth-page__footer-link">
						<NuxtLink
							:to="footerLink.to"
							class="auth-page__link"
							:class="{ 'auth-page__link--primary': footerLink.primary }"
						>
							{{ footerLink.label }}
						</NuxtLink>
					</div>
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

.auth-page__form {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

.auth-page__footer-link {
	text-align: center;
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

.auth-page__link--primary {
	color: var(--ui-primary);
}

.auth-page__link--primary:hover {
	text-decoration: underline;
}

.auth-page__inline-link {
	display: block;
	margin-top: 0.5rem;
	color: var(--ui-primary);
	text-decoration: none;
}

.auth-page__inline-link:hover {
	text-decoration: underline;
}
</style>
