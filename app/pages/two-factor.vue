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
		await navigateTo("/")
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
	navigateTo("/")
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
</script>

<template>
	<div class="flex min-h-screen items-center justify-center bg-background p-4">
		<!-- Loading state while checking mode -->
		<div
			v-if="!initialCheckDone"
			class="flex items-center justify-center"
		>
			<UIcon
				name="i-lucide-loader-2"
				class="size-8 animate-spin text-muted-foreground"
			/>
		</div>

		<UCard
			v-else
			class="w-full max-w-md"
		>
			<template #header>
				<div class="text-center">
					<div class="flex justify-center mb-4">
						<UIcon
							name="i-lucide-shield-check"
							class="h-12 w-12"
						/>
					</div>
					<h1 class="text-2xl font-semibold">
						{{ mode === "setup" ? "Set Up Two-Factor Authentication" : "Two-Factor Verification" }}
					</h1>
					<p
						v-if="mode === 'verify' && !useBackupCode"
						class="text-sm text-muted-foreground mt-1"
					>
						Enter the code from your authenticator app
					</p>
					<p
						v-else-if="mode === 'verify' && useBackupCode"
						class="text-sm text-muted-foreground mt-1"
					>
						Enter one of your backup codes
					</p>
					<p
						v-else-if="setupStage === 'backup'"
						class="text-sm text-muted-foreground mt-1"
					>
						Save your backup codes
					</p>
					<p
						v-else-if="setupStage === 'qrcode'"
						class="text-sm text-muted-foreground mt-1"
					>
						Scan the QR code with your authenticator app
					</p>
					<p
						v-else
						class="text-sm text-muted-foreground mt-1"
					>
						Secure your account with two-factor authentication
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

				<!-- Setup Mode - Password Stage -->
				<template v-if="mode === 'setup' && setupStage === 'password'">
					<p class="text-center text-sm text-muted-foreground">
						Enter your password to set up two-factor authentication
					</p>

					<form
						class="space-y-4"
						@submit.prevent="initSetup"
					>
						<UFormField label="Password">
							<UInput
								v-model="password"
								type="password"
								placeholder="Enter your password"
								class="w-full"
								autocomplete="current-password"
							/>
						</UFormField>
						<UButton
							type="submit"
							block
							:loading="loading"
						>
							Continue
						</UButton>
					</form>
				</template>

				<!-- Setup Mode - QR Code Stage -->
				<template v-if="mode === 'setup' && setupStage === 'qrcode'">
					<div
						v-if="loading"
						class="flex items-center justify-center py-8"
					>
						<UIcon
							name="i-lucide-loader-2"
							class="size-6 animate-spin text-muted-foreground"
						/>
					</div>

					<template v-else-if="qrCodeDataUrl">
						<div class="flex justify-center">
							<img
								:src="qrCodeDataUrl"
								alt="2FA QR Code"
								class="rounded-lg border"
							>
						</div>

						<p class="text-center text-sm text-muted-foreground">
							Scan this QR code with Google Authenticator, Authy, or any TOTP app
						</p>

						<form
							class="space-y-4"
							@submit.prevent="verifySetup"
						>
							<UFormField label="Verification Code">
								<UInput
									v-model="setupCode"
									type="text"
									inputmode="numeric"
									pattern="[0-9]*"
									maxlength="6"
									placeholder="000000"
									class="w-full text-center text-2xl tracking-widest"
									autocomplete="one-time-code"
								/>
							</UFormField>
							<UButton
								type="submit"
								block
								:loading="loading"
							>
								Verify & Enable 2FA
							</UButton>
						</form>
					</template>
				</template>

				<!-- Setup Mode - Backup Codes Stage -->
				<template v-if="mode === 'setup' && setupStage === 'backup' && backupCodes">
					<div class="rounded-md bg-warning/10 p-4 text-sm">
						<div class="flex items-start gap-3">
							<UIcon
								name="i-lucide-alert-triangle"
								class="h-5 w-5 text-warning shrink-0 mt-0.5"
							/>
							<div>
								<p class="font-medium text-warning-foreground">
									Save your backup codes
								</p>
								<p class="mt-1 text-muted-foreground">
									Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
								</p>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
						<span
							v-for="code in backupCodes"
							:key="code"
							class="text-center"
						>
							{{ code }}
						</span>
					</div>

					<div class="flex justify-center gap-2">
						<UButton
							variant="outline"
							@click="copyBackupCodes"
						>
							<UIcon
								:name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
								class="h-4 w-4 mr-2"
							/>
							{{ copied ? 'Copied!' : 'Copy Codes' }}
						</UButton>
						<UButton @click="finishSetup">
							I've Saved My Codes
						</UButton>
					</div>
				</template>

				<!-- Verify Mode -->
				<template v-if="mode === 'verify'">
					<form
						class="space-y-4"
						@submit.prevent="verifyLogin"
					>
						<!-- TOTP Code Input -->
						<template v-if="!useBackupCode">
							<UFormField label="Authentication Code">
								<UInput
									v-model="verifyCode"
									type="text"
									inputmode="numeric"
									pattern="[0-9]*"
									maxlength="6"
									placeholder="000000"
									class="w-full text-center text-2xl tracking-widest"
									autocomplete="one-time-code"
								/>
							</UFormField>
						</template>

						<!-- Backup Code Input -->
						<template v-else>
							<UFormField label="Backup Code">
								<UInput
									v-model="backupCodeInput"
									type="text"
									placeholder="Enter backup code"
									class="w-full text-center text-lg tracking-wider"
								/>
							</UFormField>
						</template>

						<UButton
							type="submit"
							block
							:loading="loading"
						>
							Verify
						</UButton>
					</form>

					<button
						type="button"
						class="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
						@click="toggleBackupCode"
					>
						{{ useBackupCode ? 'Use authenticator app instead' : 'Lost your authenticator? Use a backup code' }}
					</button>
				</template>
			</div>
		</UCard>
	</div>
</template>
