<script setup lang="ts">
definePageMeta({
	layout: "blank",
	title: "Forgot Password",
})

const email = ref("")
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

async function handleSubmit() {
	if (!email.value) {
		error.value = "Please enter your email"
		return
	}

	loading.value = true
	error.value = null

	try {
		const result = await authClient.requestPasswordReset({
			email: email.value,
			redirectTo: "/reset-password",
		})

		if (result.error) {
			error.value = result.error.message || "Failed to send reset email"
			return
		}

		success.value = true
	}
	catch (e: unknown) {
		error.value = e instanceof Error ? e.message : "An unexpected error occurred"
	}
	finally {
		loading.value = false
	}
}
</script>

<template>
	<div class="auth-page">
		<AuthBackground />
		<div class="auth-page__container">
			<AuthCard
				icon="i-lucide-key-round"
				title="Forgot Password"
				:subtitle="success ? 'Check your email' : 'Enter your email to receive a password reset link'"
				:accent-color="success ? 'success' : 'primary'"
			>
				<!-- Success State -->
				<template v-if="success">
					<AuthMessage
						type="success"
						title="Email sent"
					>
						If an account exists for {{ email }}, you will receive a password reset link shortly.
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
					</AuthMessage>

					<form
						class="auth-page__form"
						@submit.prevent="handleSubmit"
					>
						<AuthInput
							v-model="email"
							type="email"
							label="Email"
							placeholder="you@example.com"
							autocomplete="email"
							required
						/>

						<AuthButton
							type="submit"
							block
							:loading="loading"
						>
							Send Reset Link
						</AuthButton>
					</form>
				</template>

				<template #footer>
					<div class="auth-page__footer-link">
						<NuxtLink
							to="/login"
							class="auth-page__link"
						>
							Back to login
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
</style>
