<script setup lang="ts">
import QRCode from "qrcode"

definePageMeta({
	layout: "blank",
	title: "Two-Factor Authentication",
})

// State - default to verify mode (for users completing 2FA during login)
const mode = ref<"setup" | "verify">("verify")
const loading = ref(false)
const error = ref<string | null>(null)
const initialCheckDone = ref(false)

// Setup mode state
const totpUri = ref<string | null>(null)
const qrCodeDataUrl = ref<string | null>(null)
const backupCodes = ref<string[] | null>(null)
const setupCode = ref("")
const password = ref("")

// Verify mode state
const verifyCode = ref("")
const useBackupCode = ref(false)
const backupCodeInput = ref("")

const route = useRoute()
const redirectTo = computed(() => {
	const redirect = route.query.redirect as string | undefined
	if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
		return redirect
	}
	return "/"
})

// Copy feedback
const copied = ref(false)

// State for setup flow stages
const setupStage = ref<"password" | "qrcode" | "backup">("password")

// Determine initial mode - check if user needs setup or verification
onMounted(async () => {
	try {
		// Check if 2FA setup is required (user is logged in but needs to set up 2FA)
		const response = await $fetch<{ required: boolean }>("/api/auth/two-factor-required", {
			credentials: "include",
		}).catch(() => null)

		if (response?.required) {
			// User is authenticated but needs to set up 2FA
			mode.value = "setup"
			setupStage.value = "password"
		}
		else {
			// Either not authenticated (2FA verification during login)
			// or already has 2FA (shouldn't be here, but handle gracefully)
			mode.value = "verify"
		}
	}
	catch {
		// If the check fails, assume verify mode (2FA during login)
		mode.value = "verify"
	}
	finally {
		initialCheckDone.value = true
	}
})

async function initSetup() {
	if (!password.value) {
		error.value = "Please enter your password"
		return
	}

	loading.value = true
	error.value = null

	try {
		const result = await authClient.twoFactor.enable({ password: password.value })
		if (result.error) {
			error.value = result.error.message || "Failed to initialize 2FA setup"
			return
		}

		totpUri.value = result.data?.totpURI ?? null
		backupCodes.value = result.data?.backupCodes ?? null

		if (totpUri.value) {
			qrCodeDataUrl.value = await QRCode.toDataURL(totpUri.value, {
				width: 200,
				margin: 2,
			})
			setupStage.value = "qrcode"
		}
	}
	catch (e: unknown) {
		error.value = e instanceof Error ? e.message : "An unexpected error occurred"
	}
	finally {
		loading.value = false
	}
}

async function verifySetup() {
	if (!setupCode.value || setupCode.value.length !== 6) {
		error.value = "Please enter a 6-digit code"
		return
	}

	loading.value = true
	error.value = null

	try {
		const result = await authClient.twoFactor.verifyTotp({ code: setupCode.value })
		if (result.error) {
			error.value = result.error.message || "Invalid code"
			return
		}

		// Show backup codes before redirecting
		setupStage.value = "backup"
	}
	catch (e: unknown) {
		error.value = e instanceof Error ? e.message : "Verification failed"
	}
	finally {
		loading.value = false
	}
}

async function verifyLogin() {
	// Validate input based on mode
	if (useBackupCode.value) {
		if (!backupCodeInput.value || backupCodeInput.value.length < 6) {
			error.value = "Please enter a valid backup code"
			return
		}
	}
	else {
		if (!verifyCode.value || verifyCode.value.length !== 6) {
			error.value = "Please enter a 6-digit code"
			return
		}
	}

	loading.value = true
	error.value = null

	try {
		let result
		if (useBackupCode.value) {
			result = await authClient.twoFactor.verifyBackupCode({ code: backupCodeInput.value })
		}
		else {
			result = await authClient.twoFactor.verifyTotp({ code: verifyCode.value })
		}

		if (result.error) {
			error.value = result.error.message || "Invalid code"
			return
		}

		// Navigate to home on success
		await navigateTo(redirectTo.value)
	}
	catch (e: unknown) {
		error.value = e instanceof Error ? e.message : "Verification failed"
	}
	finally {
		loading.value = false
	}
}

function toggleBackupCode() {
	useBackupCode.value = !useBackupCode.value
	error.value = null
	verifyCode.value = ""
	backupCodeInput.value = ""
}

function finishSetup() {
	navigateTo(redirectTo.value)
}

function copyBackupCodes() {
	if (backupCodes.value) {
		navigator.clipboard.writeText(backupCodes.value.join("\n"))
		copied.value = true
		setTimeout(() => {
			copied.value = false
		}, 2000)
	}
}

const cardTitle = computed(() => {
	if (mode.value === "setup") {
		if (setupStage.value === "backup") return "Save Your Backup Codes"
		return "Set Up Two-Factor Authentication"
	}
	return "Two-Factor Verification"
})

const cardSubtitle = computed(() => {
	if (mode.value === "verify" && !useBackupCode.value) {
		return "Enter the code from your authenticator app"
	}
	if (mode.value === "verify" && useBackupCode.value) {
		return "Enter one of your backup codes"
	}
	if (setupStage.value === "backup") {
		return "Store these codes safely - you'll need them if you lose access to your authenticator"
	}
	if (setupStage.value === "qrcode") {
		return "Scan the QR code with your authenticator app"
	}
	return "Secure your account with two-factor authentication"
})

const cardAccentColor = computed(() => {
	if (setupStage.value === "backup") return "warning" as const
	return "primary" as const
})
</script>

<template>
	<div class="auth-page">
		<AuthBackground />
		<div class="auth-page__container">
			<!-- Loading state while checking mode -->
			<div
				v-if="!initialCheckDone"
				class="auth-page__loading"
			>
				<UIcon
					name="i-lucide-loader-2"
					class="size-8 animate-spin"
				/>
			</div>

			<AuthCard
				v-else
				icon="i-lucide-shield-check"
				:title="cardTitle"
				:subtitle="cardSubtitle"
				:accent-color="cardAccentColor"
			>
				<AuthMessage
					v-if="error"
					type="error"
					class="auth-page__message"
				>
					{{ error }}
				</AuthMessage>

				<!-- Setup Mode - Password Stage -->
				<template v-if="mode === 'setup' && setupStage === 'password'">
					<form
						class="auth-page__form"
						@submit.prevent="initSetup"
					>
						<AuthInput
							v-model="password"
							type="password"
							label="Password"
							placeholder="Enter your password"
							autocomplete="current-password"
							required
						/>

						<AuthButton
							type="submit"
							block
							:loading="loading"
						>
							Continue
						</AuthButton>
					</form>
				</template>

				<!-- Setup Mode - QR Code Stage -->
				<template v-if="mode === 'setup' && setupStage === 'qrcode'">
					<div
						v-if="loading"
						class="auth-page__loading-inline"
					>
						<UIcon
							name="i-lucide-loader-2"
							class="size-6 animate-spin"
						/>
					</div>

					<template v-else-if="qrCodeDataUrl">
						<div class="auth-page__qr-wrapper">
							<img
								:src="qrCodeDataUrl"
								alt="2FA QR Code"
								class="auth-page__qr-code"
							>
						</div>

						<p class="auth-page__hint">
							Scan this QR code with Google Authenticator, Authy, or any TOTP app
						</p>

						<form
							class="auth-page__form"
							@submit.prevent="verifySetup"
						>
							<AuthInput
								v-model="setupCode"
								type="text"
								inputmode="numeric"
								:pattern="'[0-9]*'"
								:maxlength="6"
								label="Verification Code"
								placeholder="000000"
								autocomplete="one-time-code"
								centered
								large
								required
							/>

							<AuthButton
								type="submit"
								block
								:loading="loading"
							>
								Verify &amp; Enable 2FA
							</AuthButton>
						</form>
					</template>
				</template>

				<!-- Setup Mode - Backup Codes Stage -->
				<template v-if="mode === 'setup' && setupStage === 'backup' && backupCodes">
					<AuthMessage type="warning">
						Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
					</AuthMessage>

					<div class="auth-page__backup-codes">
						<span
							v-for="code in backupCodes"
							:key="code"
							class="auth-page__backup-code"
						>
							{{ code }}
						</span>
					</div>

					<div class="auth-page__backup-actions">
						<AuthButton
							variant="outline"
							@click="copyBackupCodes"
						>
							<template #icon>
								<UIcon
									:name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
									class="size-4"
								/>
							</template>
							{{ copied ? 'Copied!' : 'Copy Codes' }}
						</AuthButton>
						<AuthButton @click="finishSetup">
							I've Saved My Codes
						</AuthButton>
					</div>
				</template>

				<!-- Verify Mode -->
				<template v-if="mode === 'verify'">
					<form
						class="auth-page__form"
						@submit.prevent="verifyLogin"
					>
						<!-- TOTP Code Input -->
						<template v-if="!useBackupCode">
							<AuthInput
								v-model="verifyCode"
								type="text"
								inputmode="numeric"
								:pattern="'[0-9]*'"
								:maxlength="6"
								label="Authentication Code"
								placeholder="000000"
								autocomplete="one-time-code"
								centered
								large
								required
							/>
						</template>

						<!-- Backup Code Input -->
						<template v-else>
							<AuthInput
								v-model="backupCodeInput"
								type="text"
								label="Backup Code"
								placeholder="Enter backup code"
								centered
								required
							/>
						</template>

						<AuthButton
							type="submit"
							block
							:loading="loading"
						>
							Verify
						</AuthButton>
					</form>

					<button
						type="button"
						class="auth-page__toggle-link"
						@click="toggleBackupCode"
					>
						{{ useBackupCode ? 'Use authenticator app instead' : 'Lost your authenticator? Use a backup code' }}
					</button>
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

.auth-page__loading {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--ui-text-muted);
}

.auth-page__loading-inline {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rem 0;
	color: var(--ui-text-muted);
}

.auth-page__message {
	margin-bottom: 1rem;
}

.auth-page__form {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

.auth-page__qr-wrapper {
	display: flex;
	justify-content: center;
	margin-bottom: 1rem;
}

.auth-page__qr-code {
	border-radius: 0.5rem;
	border: 1px solid var(--ui-border);
	background: white;
}

.auth-page__hint {
	text-align: center;
	font-size: 0.8125rem;
	color: var(--ui-text-muted);
	margin-bottom: 1.5rem;
}

.auth-page__backup-codes {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 0.5rem;
	padding: 1rem;
	margin: 1rem 0;
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
}

.auth-page__backup-code {
	font-family: var(--font-mono);
	font-size: 0.875rem;
	text-align: center;
	color: var(--ui-text);
	padding: 0.25rem;
}

.auth-page__backup-actions {
	display: flex;
	justify-content: center;
	gap: 0.75rem;
}

.auth-page__toggle-link {
	width: 100%;
	margin-top: 1rem;
	padding: 0;
	font-size: 0.8125rem;
	color: var(--ui-text-muted);
	background: none;
	border: none;
	cursor: pointer;
	text-align: center;
	transition: color 0.15s ease;
}

.auth-page__toggle-link:hover {
	color: var(--ui-text);
}
</style>
