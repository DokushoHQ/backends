<script setup lang="ts">
interface Props {
	hasPassword: boolean
}

defineProps<Props>()

const isOpen = ref(false)
const currentPassword = ref("")
const newPassword = ref("")
const confirmPassword = ref("")
const revokeOtherSessions = ref(true)
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

const passwordsMatch = computed(() => newPassword.value === confirmPassword.value)
const isValid = computed(() =>
	currentPassword.value.length > 0
	&& newPassword.value.length >= 8
	&& confirmPassword.value.length > 0
	&& passwordsMatch.value,
)

function resetForm() {
	currentPassword.value = ""
	newPassword.value = ""
	confirmPassword.value = ""
	revokeOtherSessions.value = true
	error.value = null
	success.value = false
}

function handleDialogClose(open: boolean) {
	if (!open) {
		resetForm()
	}
	isOpen.value = open
}

async function handleChangePassword() {
	if (!isValid.value) return

	loading.value = true
	error.value = null

	try {
		const result = await authClient.changePassword({
			currentPassword: currentPassword.value,
			newPassword: newPassword.value,
			revokeOtherSessions: revokeOtherSessions.value,
		})

		if (result.error) {
			error.value = result.error.message ?? "Failed to change password"
		}
		else {
			success.value = true
			setTimeout(() => {
				isOpen.value = false
				resetForm()
			}, 1500)
		}
	}
	catch {
		error.value = "An unexpected error occurred"
	}
	finally {
		loading.value = false
	}
}
</script>

<template>
	<UiContentCard
		title="Security"
		description="Manage your account security settings"
		icon="i-lucide-shield"
		color="blue"
	>
		<div class="card-body">
			<div
				v-if="!hasPassword"
				class="info-box"
			>
				<UIcon
					name="i-lucide-info"
					class="info-icon"
				/>
				<div class="info-content">
					<span class="info-title">No password set</span>
					<span class="info-description">Your account uses external authentication only</span>
				</div>
			</div>

			<div
				v-else
				class="action-row"
			>
				<div class="action-info">
					<UIcon
						name="i-lucide-key-round"
						class="action-icon"
					/>
					<div class="action-content">
						<span class="action-title">Password</span>
						<span class="action-description">Update your account password</span>
					</div>
				</div>

				<UModal
					v-model:open="isOpen"
					@update:open="handleDialogClose"
				>
					<UButton
						variant="outline"
						@click="() => { isOpen = true }"
					>
						Change Password
					</UButton>

					<template #content>
						<UCard>
							<template #header>
								<div>
									<h3 class="text-lg font-semibold">
										Change Password
									</h3>
									<p class="text-sm text-muted-foreground">
										Enter your current password and choose a new one
									</p>
								</div>
							</template>

							<div
								v-if="success"
								class="flex flex-col items-center gap-4 py-8"
							>
								<UIcon
									name="i-lucide-circle-check"
									class="size-12 text-green-600 dark:text-green-400"
								/>
								<p class="text-sm font-medium">
									Password changed successfully
								</p>
							</div>

							<div
								v-else
								class="space-y-4"
							>
								<div
									v-if="error"
									class="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
								>
									{{ error }}
								</div>

								<UFormField label="Current Password">
									<UInput
										v-model="currentPassword"
										type="password"
										placeholder="Enter current password"
										class="w-full"
									/>
								</UFormField>

								<UFormField label="New Password">
									<UInput
										v-model="newPassword"
										type="password"
										placeholder="Min 8 characters"
										class="w-full"
									/>
								</UFormField>

								<UFormField label="Confirm New Password">
									<UInput
										v-model="confirmPassword"
										type="password"
										placeholder="Confirm new password"
										class="w-full"
									/>
									<p
										v-if="confirmPassword && !passwordsMatch"
										class="text-xs text-destructive mt-1"
									>
										Passwords do not match
									</p>
								</UFormField>

								<div class="flex items-center gap-2">
									<UCheckbox
										id="revoke-sessions"
										v-model="revokeOtherSessions"
									/>
									<label
										for="revoke-sessions"
										class="text-sm"
									>
										Sign out of all other devices
									</label>
								</div>
							</div>

							<template
								v-if="!success"
								#footer
							>
								<div class="flex justify-end gap-2">
									<UButton
										variant="outline"
										@click="() => { isOpen = false }"
									>
										Cancel
									</UButton>
									<UButton
										:loading="loading"
										:disabled="!isValid"
										@click="handleChangePassword"
									>
										Change Password
									</UButton>
								</div>
							</template>
						</UCard>
					</template>
				</UModal>
			</div>
		</div>
	</UiContentCard>
</template>

<style scoped>
.card-body {
	padding: 1rem;
}

/* Info box */
.info-box {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 1rem;
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
}

.info-icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-text-muted);
	flex-shrink: 0;
}

.info-content {
	display: flex;
	flex-direction: column;
}

.info-title {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.info-description {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
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
