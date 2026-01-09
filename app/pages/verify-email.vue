<script setup lang="ts">
definePageMeta({
	layout: "blank",
	title: "Verify Email",
})

const route = useRoute()
const error = computed(() => route.query.error as string | undefined)
// After verification, better-auth redirects here without params on success, or with ?error= on failure
// If redirected from signup, there's no error and no special param - show "check email" message
// We use a "verified" query param to distinguish successful verification from signup redirect
const verified = computed(() => route.query.verified === "true")
</script>

<template>
	<div class="flex min-h-screen items-center justify-center bg-background p-4">
		<UCard class="w-full max-w-md">
			<!-- Success state - shown after clicking verification link -->
			<template v-if="verified">
				<div class="text-center space-y-4">
					<div class="flex justify-center mb-4">
						<UIcon
							name="i-lucide-check-circle"
							class="h-12 w-12 text-green-600 dark:text-green-400"
						/>
					</div>
					<h1 class="text-2xl font-semibold">
						Email Verified!
					</h1>
					<p class="text-sm text-muted-foreground">
						Your email has been verified. You can now log in.
					</p>
					<UButton
						to="/login"
						block
					>
						Go to Login
					</UButton>
				</div>
			</template>

			<!-- Error state -->
			<template v-else-if="error">
				<div class="text-center space-y-4">
					<div class="flex justify-center mb-4">
						<UIcon
							name="i-lucide-x-circle"
							class="h-12 w-12 text-destructive"
						/>
					</div>
					<h1 class="text-2xl font-semibold">
						Verification Failed
					</h1>
					<p class="text-sm text-muted-foreground">
						This verification link is invalid or has expired.
					</p>
					<UButton
						to="/login"
						block
						variant="outline"
					>
						Back to Login
					</UButton>
				</div>
			</template>

			<!-- No token state (direct navigation) -->
			<template v-else>
				<div class="text-center space-y-4">
					<div class="flex justify-center mb-4">
						<UIcon
							name="i-lucide-mail"
							class="h-12 w-12"
						/>
					</div>
					<h1 class="text-2xl font-semibold">
						Check Your Email
					</h1>
					<p class="text-sm text-muted-foreground">
						We've sent a verification link to your email address.
						Click the link to verify your account.
					</p>
					<UButton
						to="/login"
						block
						variant="outline"
					>
						Back to Login
					</UButton>
				</div>
			</template>
		</UCard>
	</div>
</template>
