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

const cardConfig = computed(() => {
	if (verified.value) {
		return {
			icon: "i-lucide-check-circle",
			title: "Email Verified!",
			subtitle: "Your email has been verified. You can now log in.",
			accentColor: "success" as const,
		}
	}
	if (error.value) {
		return {
			icon: "i-lucide-x-circle",
			title: "Verification Failed",
			subtitle: "This verification link is invalid or has expired.",
			accentColor: "error" as const,
		}
	}
	return {
		icon: "i-lucide-mail",
		title: "Check Your Email",
		subtitle: "We've sent a verification link to your email address. Click the link to verify your account.",
		accentColor: "primary" as const,
	}
})
</script>

<template>
	<div class="auth-page">
		<AuthBackground />
		<div class="auth-page__container">
			<AuthCard
				:icon="cardConfig.icon"
				:title="cardConfig.title"
				:subtitle="cardConfig.subtitle"
				:accent-color="cardConfig.accentColor"
			>
				<!-- Success state - shown after clicking verification link -->
				<template v-if="verified">
					<AuthButton
						to="/login"
						block
					>
						Go to Login
					</AuthButton>
				</template>

				<!-- Error state -->
				<template v-else-if="error">
					<AuthButton
						to="/login"
						variant="outline"
						block
					>
						Back to Login
					</AuthButton>
				</template>

				<!-- Default state (direct navigation from signup) -->
				<template v-else>
					<AuthButton
						to="/login"
						variant="outline"
						block
					>
						Back to Login
					</AuthButton>
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
</style>
