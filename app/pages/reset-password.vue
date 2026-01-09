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
</script>

<template>
	<div class="flex min-h-screen items-center justify-center bg-background p-4">
		<UCard class="w-full max-w-md">
			<template #header>
				<div class="text-center">
					<div class="flex justify-center mb-4">
						<UIcon
							name="i-lucide-lock-keyhole"
							class="h-12 w-12"
						/>
					</div>
					<h1 class="text-2xl font-semibold">
						Reset Password
					</h1>
					<p class="text-sm text-muted-foreground">
						{{ success ? 'Your password has been reset' : 'Enter your new password' }}
					</p>
				</div>
			</template>

			<div class="space-y-4">
				<!-- Success State -->
				<template v-if="success">
					<div class="rounded-md bg-green-500/10 p-4 text-center">
						<div class="flex justify-center mb-3">
							<UIcon
								name="i-lucide-check-circle"
								class="h-8 w-8 text-green-600 dark:text-green-400"
							/>
						</div>
						<p class="text-sm font-medium text-green-800 dark:text-green-200">
							Password reset successful
						</p>
						<p class="text-sm text-muted-foreground mt-1">
							Redirecting to login...
						</p>
					</div>
				</template>

				<!-- No Token State -->
				<template v-else-if="!token && !tokenError">
					<div class="rounded-md bg-warning/10 p-4 text-center">
						<div class="flex justify-center mb-3">
							<UIcon
								name="i-lucide-alert-triangle"
								class="h-8 w-8 text-warning"
							/>
						</div>
						<p class="text-sm font-medium">
							Invalid reset link
						</p>
						<p class="text-sm text-muted-foreground mt-1">
							This page requires a valid password reset link.
						</p>
					</div>

					<div class="text-center">
						<NuxtLink
							to="/forgot-password"
							class="text-sm text-primary hover:underline"
						>
							Request a new password reset
						</NuxtLink>
					</div>
				</template>

				<!-- Form State -->
				<template v-else>
					<div
						v-if="error"
						class="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
					>
						{{ error }}
						<div
							v-if="tokenError === 'INVALID_TOKEN'"
							class="mt-2"
						>
							<NuxtLink
								to="/forgot-password"
								class="text-primary hover:underline"
							>
								Request a new password reset
							</NuxtLink>
						</div>
					</div>

					<form
						v-if="token && !tokenError"
						class="space-y-4"
						@submit.prevent="handleSubmit"
					>
						<UFormField label="New Password">
							<UInput
								v-model="password"
								type="password"
								placeholder="Min 8 characters"
								required
								minlength="8"
								class="w-full"
							/>
						</UFormField>
						<UFormField label="Confirm Password">
							<UInput
								v-model="confirmPassword"
								type="password"
								placeholder="Confirm your password"
								required
								class="w-full"
							/>
						</UFormField>
						<UButton
							type="submit"
							block
							:loading="loading"
						>
							Reset Password
						</UButton>
					</form>

					<div class="text-center">
						<NuxtLink
							to="/login"
							class="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Back to login
						</NuxtLink>
					</div>
				</template>
			</div>
		</UCard>
	</div>
</template>
