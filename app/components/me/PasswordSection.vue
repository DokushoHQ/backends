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
	<UCard>
		<template #header>
			<div>
				<h3 class="text-lg font-semibold flex items-center gap-2">
					<UIcon
						name="i-lucide-shield"
						class="size-4"
					/>
					Security
				</h3>
				<p class="text-sm text-muted-foreground">
					Manage your account security settings
				</p>
			</div>
		</template>

		<div class="space-y-4">
			<div
				v-if="!hasPassword"
				class="flex items-center gap-3 p-4 rounded-lg bg-muted/50"
			>
				<UIcon
					name="i-lucide-info"
					class="size-5 text-muted-foreground"
				/>
				<div>
					<p class="text-sm font-medium">
						No password set
					</p>
					<p class="text-xs text-muted-foreground">
						Your account uses external authentication only
					</p>
				</div>
			</div>

			<div
				v-else
				class="flex items-center justify-between p-4 rounded-lg bg-muted/50"
			>
				<div class="flex items-center gap-3">
					<UIcon
						name="i-lucide-key-round"
						class="size-5 text-muted-foreground"
					/>
					<div>
						<p class="text-sm font-medium">
							Password
						</p>
						<p class="text-xs text-muted-foreground">
							Update your account password
						</p>
					</div>
				</div>

				<UModal
					v-model:open="isOpen"
					@update:open="handleDialogClose"
				>
					<UButton
						variant="outline"
						@click="isOpen = true"
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
										@click="isOpen = false"
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
	</UCard>
</template>
