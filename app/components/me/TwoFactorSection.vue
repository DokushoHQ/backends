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
	<UiContentCard
		v-if="hasPassword"
		title="Two-Factor Authentication"
		description="Add an extra layer of security to your account"
		icon="i-lucide-shield-check"
		color="green"
	>
		<div class="card-body">
			<div
				v-if="error"
				class="error-box"
			>
				{{ error }}
			</div>

			<!-- 2FA Enabled -->
			<div
				v-if="twoFactorEnabled"
				class="two-factor-enabled"
			>
				<div class="status-box enabled">
					<UIcon
						name="i-lucide-check-circle"
						class="status-icon"
					/>
					<div class="status-content">
						<span class="status-title">2FA is enabled</span>
						<span class="status-description">Your account is protected with two-factor authentication</span>
					</div>
				</div>

				<div class="action-buttons">
					<UButton
						variant="outline"
						@click="openPasswordModal('backup')"
					>
						<UIcon
							name="i-lucide-refresh-cw"
							class="h-4 w-4"
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
											class="h-4 w-4"
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
				class="action-row"
			>
				<div class="action-info">
					<UIcon
						name="i-lucide-shield-off"
						class="action-icon"
					/>
					<div class="action-content">
						<span class="action-title">2FA is not enabled</span>
						<span class="action-description">Enable two-factor authentication to secure your account</span>
					</div>
				</div>

				<UButton
					variant="outline"
					to="/two-factor"
				>
					Set Up 2FA
				</UButton>
			</div>
		</div>
	</UiContentCard>
</template>

<style scoped>
.card-body {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 1rem;
}

/* Error box */
.error-box {
	padding: 0.75rem;
	background: var(--ui-error-soft);
	color: var(--ui-error);
	border-radius: 0.5rem;
	font-size: var(--font-size-sm);
}

/* Two factor enabled */
.two-factor-enabled {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

/* Status box */
.status-box {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 1rem;
	border-radius: 0.5rem;
}

.status-box.enabled {
	background: var(--ui-success-soft);
	border: 1px solid color-mix(in oklch, var(--ui-success) 20%, transparent);
}

.status-icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-success);
	flex-shrink: 0;
}

.status-content {
	display: flex;
	flex-direction: column;
}

.status-title {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.status-description {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

/* Action buttons */
.action-buttons {
	display: flex;
	gap: 0.5rem;
}

/* Action row */
.action-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1rem;
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
}

.action-info {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.action-icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-text-muted);
	flex-shrink: 0;
}

.action-content {
	display: flex;
	flex-direction: column;
}

.action-title {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.action-description {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}
</style>
