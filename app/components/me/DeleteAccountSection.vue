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
	<UiContentCard
		title="Danger Zone"
		description="Irreversible actions for your account"
		icon="i-lucide-triangle-alert"
		color="red"
		danger
	>
		<div class="card-body">
			<div class="danger-row">
				<div class="danger-info">
					<div class="danger-icon">
						<UIcon
							name="i-lucide-trash-2"
							class="h-5 w-5"
						/>
					</div>
					<div class="danger-content">
						<span class="danger-title">Delete Account</span>
						<span class="danger-description">Permanently delete your account and all associated data</span>
					</div>
				</div>

				<UModal
					v-model:open="isOpen"
					@update:open="handleDialogClose"
				>
					<UButton
						variant="outline"
						color="error"
						@click="() => { isOpen = true }"
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
										@click="() => { isOpen = false }"
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
		</div>
	</UiContentCard>
</template>

<style scoped>
.card-body {
	padding: 1rem;
}

/* Danger row */
.danger-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1rem;
	background: var(--ui-error-soft);
	border: 1px solid color-mix(in oklch, var(--ui-error) 25%, transparent);
	border-radius: 0.5rem;
}

.danger-info {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.danger-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 0.5rem;
	background: color-mix(in oklch, var(--ui-error) 15%, var(--ui-bg-elevated));
	color: var(--ui-error);
	flex-shrink: 0;
}

.danger-content {
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
}

.danger-title {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.danger-description {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}
</style>
