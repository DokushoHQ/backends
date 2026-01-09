<script setup lang="ts">
interface Props {
	hasPassword: boolean
	twoFactorEnabled: boolean
}

defineProps<Props>()
const emit = defineEmits<{
	refresh: []
}>()

const isBackupCodesOpen = ref(false)
const isPasswordModalOpen = ref(false)
const backupCodes = ref<string[] | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const disableLoading = ref(false)
const password = ref("")
const pendingAction = ref<"backup" | "disable" | null>(null)
const copied = ref(false)

function openPasswordModal(action: "backup" | "disable") {
	pendingAction.value = action
	password.value = ""
	error.value = null
	isPasswordModalOpen.value = true
}

async function handlePasswordSubmit() {
	if (!password.value) {
		error.value = "Please enter your password"
		return
	}

	if (pendingAction.value === "backup") {
		await generateBackupCodes()
	}
	else if (pendingAction.value === "disable") {
		await disable2FA()
	}
}

async function generateBackupCodes() {
	loading.value = true
	error.value = null

	try {
		const result = await authClient.twoFactor.generateBackupCodes({ password: password.value })
		if (result.error) {
			error.value = result.error.message ?? "Failed to generate backup codes"
			return
		}

		backupCodes.value = result.data?.backupCodes ?? null
		isPasswordModalOpen.value = false
		isBackupCodesOpen.value = true
	}
	catch {
		error.value = "An unexpected error occurred"
	}
	finally {
		loading.value = false
	}
}

function handleDialogClose(open: boolean) {
	if (!open) {
		backupCodes.value = null
		error.value = null
		copied.value = false
	}
	isBackupCodesOpen.value = open
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

async function disable2FA() {
	disableLoading.value = true
	error.value = null

	try {
		const result = await authClient.twoFactor.disable({ password: password.value })
		if (result.error) {
			error.value = result.error.message ?? "Failed to disable 2FA"
			return
		}

		isPasswordModalOpen.value = false
		emit("refresh")
	}
	catch {
		error.value = "An unexpected error occurred"
	}
	finally {
		disableLoading.value = false
	}
}
</script>

<template>
	<UCard v-if="hasPassword">
		<template #header>
			<div>
				<h3 class="text-lg font-semibold flex items-center gap-2">
					<UIcon
						name="i-lucide-shield-check"
						class="size-4"
					/>
					Two-Factor Authentication
				</h3>
				<p class="text-sm text-muted-foreground">
					Add an extra layer of security to your account
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

			<!-- 2FA Enabled -->
			<div
				v-if="twoFactorEnabled"
				class="space-y-4"
			>
				<div class="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
					<div class="flex items-center gap-3">
						<UIcon
							name="i-lucide-check-circle"
							class="size-5 text-green-600 dark:text-green-400"
						/>
						<div>
							<p class="text-sm font-medium">
								2FA is enabled
							</p>
							<p class="text-xs text-muted-foreground">
								Your account is protected with two-factor authentication
							</p>
						</div>
					</div>
				</div>

				<div class="flex gap-2">
					<UButton
						variant="outline"
						@click="openPasswordModal('backup')"
					>
						<UIcon
							name="i-lucide-refresh-cw"
							class="size-4 mr-2"
						/>
						Regenerate Backup Codes
					</UButton>

					<UButton
						variant="ghost"
						color="error"
						@click="openPasswordModal('disable')"
					>
						Disable 2FA
					</UButton>
				</div>

				<!-- Password Confirmation Modal -->
				<UModal v-model:open="isPasswordModalOpen">
					<template #content>
						<UCard>
							<template #header>
								<div>
									<h3 class="text-lg font-semibold">
										{{ pendingAction === 'disable' ? 'Disable Two-Factor Authentication' : 'Regenerate Backup Codes' }}
									</h3>
									<p class="text-sm text-muted-foreground">
										Enter your password to continue
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

								<div
									v-if="pendingAction === 'disable'"
									class="rounded-md bg-warning/10 p-4 text-sm"
								>
									<div class="flex items-start gap-3">
										<UIcon
											name="i-lucide-alert-triangle"
											class="h-5 w-5 text-warning shrink-0 mt-0.5"
										/>
										<p class="text-muted-foreground">
											Disabling 2FA will make your account less secure. You will need to set it up again to re-enable it.
										</p>
									</div>
								</div>

								<div
									v-if="pendingAction === 'backup'"
									class="rounded-md bg-warning/10 p-4 text-sm"
								>
									<div class="flex items-start gap-3">
										<UIcon
											name="i-lucide-alert-triangle"
											class="h-5 w-5 text-warning shrink-0 mt-0.5"
										/>
										<p class="text-muted-foreground">
											This will generate new backup codes and invalidate your existing ones.
										</p>
									</div>
								</div>

								<UFormField label="Password">
									<UInput
										v-model="password"
										type="password"
										placeholder="Enter your password"
										class="w-full"
										@keyup.enter="handlePasswordSubmit"
									/>
								</UFormField>
							</div>

							<template #footer>
								<div class="flex justify-end gap-2">
									<UButton
										variant="outline"
										@click="isPasswordModalOpen = false"
									>
										Cancel
									</UButton>
									<UButton
										:color="pendingAction === 'disable' ? 'error' : 'primary'"
										:loading="loading || disableLoading"
										@click="handlePasswordSubmit"
									>
										{{ pendingAction === 'disable' ? 'Disable 2FA' : 'Regenerate Codes' }}
									</UButton>
								</div>
							</template>
						</UCard>
					</template>
				</UModal>

				<!-- Backup Codes Display Modal -->
				<UModal
					v-model:open="isBackupCodesOpen"
					@update:open="handleDialogClose"
				>
					<template #content>
						<UCard>
							<template #header>
								<div>
									<h3 class="text-lg font-semibold">
										Backup Codes
									</h3>
									<p class="text-sm text-muted-foreground">
										Use these codes if you lose access to your authenticator app
									</p>
								</div>
							</template>

							<div class="space-y-4">
								<div class="rounded-md bg-warning/10 p-4 text-sm">
									<div class="flex items-start gap-3">
										<UIcon
											name="i-lucide-alert-triangle"
											class="h-5 w-5 text-warning shrink-0 mt-0.5"
										/>
										<p class="text-muted-foreground">
											These codes replace your previous backup codes. Store them securely.
										</p>
									</div>
								</div>

								<div
									v-if="backupCodes"
									class="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm"
								>
									<span
										v-for="code in backupCodes"
										:key="code"
										class="text-center"
									>
										{{ code }}
									</span>
								</div>
							</div>

							<template #footer>
								<div class="flex justify-end gap-2">
									<UButton
										variant="outline"
										@click="copyBackupCodes"
									>
										<UIcon
											:name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
											class="size-4 mr-2"
										/>
										{{ copied ? 'Copied!' : 'Copy Codes' }}
									</UButton>
									<UButton @click="isBackupCodesOpen = false">
										Done
									</UButton>
								</div>
							</template>
						</UCard>
					</template>
				</UModal>
			</div>

			<!-- 2FA Not Enabled -->
			<div
				v-else
				class="flex items-center justify-between p-4 rounded-lg bg-muted/50"
			>
				<div class="flex items-center gap-3">
					<UIcon
						name="i-lucide-shield-off"
						class="size-5 text-muted-foreground"
					/>
					<div>
						<p class="text-sm font-medium">
							2FA is not enabled
						</p>
						<p class="text-xs text-muted-foreground">
							Enable two-factor authentication to secure your account
						</p>
					</div>
				</div>

				<UButton
					variant="outline"
					@click="navigateTo('/two-factor')"
				>
					Set Up 2FA
				</UButton>
			</div>
		</div>
	</UCard>
</template>
