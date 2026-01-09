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
	<div class="flex min-h-screen items-center justify-center bg-background p-4">
		<UCard class="w-full max-w-md">
			<template #header>
				<div class="text-center">
					<div class="flex justify-center mb-4">
						<UIcon
							name="i-lucide-key-round"
							class="h-12 w-12"
						/>
					</div>
					<h1 class="text-2xl font-semibold">
						Forgot Password
					</h1>
					<p class="text-sm text-muted-foreground">
						Enter your email to receive a password reset link
					</p>
				</div>
			</template>

			<div class="space-y-4">
				<!-- Success State -->
				<template v-if="success">
					<div class="rounded-md bg-green-500/10 p-4 text-center">
						<div class="flex justify-center mb-3">
							<UIcon
								name="i-lucide-mail-check"
								class="h-8 w-8 text-green-600 dark:text-green-400"
							/>
						</div>
						<p class="text-sm font-medium text-green-800 dark:text-green-200">
							Check your email
						</p>
						<p class="text-sm text-muted-foreground mt-1">
							If an account exists for {{ email }}, you will receive a password reset link shortly.
						</p>
					</div>

					<div class="text-center">
						<NuxtLink
							to="/login"
							class="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Back to login
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
					</div>

					<form
						class="space-y-4"
						@submit.prevent="handleSubmit"
					>
						<UFormField label="Email">
							<UInput
								v-model="email"
								type="email"
								placeholder="you@example.com"
								required
								class="w-full"
							/>
						</UFormField>
						<UButton
							type="submit"
							block
							:loading="loading"
						>
							Send Reset Link
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
