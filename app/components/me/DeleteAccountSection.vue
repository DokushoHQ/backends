<script setup lang="ts">
interface Props {
	hasPassword: boolean
}

const props = defineProps<Props>()

const isOpen = ref(false)
const password = ref("")
const confirmText = ref("")
const loading = ref(false)
const error = ref<string | null>(null)

const isValid = computed(() => {
	if (confirmText.value !== "DELETE") return false
	if (props.hasPassword && password.value.length === 0) return false
	return true
})

function resetForm() {
	password.value = ""
	confirmText.value = ""
	error.value = null
}

function handleDialogClose(open: boolean) {
	if (!open) {
		resetForm()
	}
	isOpen.value = open
}

async function handleDelete() {
	if (!isValid.value) return

	loading.value = true
	error.value = null

	try {
		const result = await authClient.deleteUser({
			password: props.hasPassword ? password.value : undefined,
		})

		if (result.error) {
			error.value = result.error.message ?? "Failed to delete account"
		}
		else {
			// Redirect to login page after successful deletion
			await navigateTo("/login")
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
				<h3 class="text-lg font-semibold flex items-center gap-2 text-destructive">
					<UIcon
						name="i-lucide-triangle-alert"
						class="size-4"
					/>
					Danger Zone
				</h3>
				<p class="text-sm text-muted-foreground">
					Irreversible actions for your account
				</p>
			</div>
		</template>

		<div class="flex items-center justify-between p-4 rounded-lg border border-destructive/50 bg-destructive/5">
			<div class="flex items-center gap-3">
				<UIcon
					name="i-lucide-trash-2"
					class="size-5 text-destructive"
				/>
				<div>
					<p class="text-sm font-medium">
						Delete Account
					</p>
					<p class="text-xs text-muted-foreground">
						Permanently delete your account and all associated data
					</p>
				</div>
			</div>

			<UModal
				v-model:open="isOpen"
				@update:open="handleDialogClose"
			>
				<UButton
					variant="outline"
					color="error"
					@click="isOpen = true"
				>
					Delete Account
				</UButton>

				<template #content>
					<UCard>
						<template #header>
							<div>
								<h3 class="text-lg font-semibold text-destructive">
									Delete Account
								</h3>
								<p class="text-sm text-muted-foreground">
									This action cannot be undone
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

							<div class="rounded-md bg-destructive/10 p-4 text-sm">
								<p class="font-medium text-destructive mb-2">
									Warning: This will permanently delete:
								</p>
								<ul class="list-disc list-inside text-muted-foreground space-y-1">
									<li>Your user account</li>
									<li>All active sessions</li>
									<li>All API keys</li>
								</ul>
							</div>

							<div
								v-if="hasPassword"
								class="space-y-4"
							>
								<UFormField label="Current Password">
									<UInput
										v-model="password"
										type="password"
										placeholder="Enter your password to confirm"
										class="w-full"
									/>
								</UFormField>
							</div>

							<div
								v-else
								class="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground"
							>
								<p>
									Your account will be deleted using your current session.
									For security, this requires a recent sign-in.
								</p>
							</div>

							<UFormField label="Type DELETE to confirm">
								<UInput
									v-model="confirmText"
									type="text"
									placeholder="DELETE"
									class="w-full"
								/>
							</UFormField>
						</div>

						<template #footer>
							<div class="flex justify-end gap-2">
								<UButton
									variant="outline"
									@click="isOpen = false"
								>
									Cancel
								</UButton>
								<UButton
									color="error"
									:loading="loading"
									:disabled="!isValid"
									@click="handleDelete"
								>
									Delete Account
								</UButton>
							</div>
						</template>
					</UCard>
				</template>
			</UModal>
		</div>
	</UCard>
</template>
