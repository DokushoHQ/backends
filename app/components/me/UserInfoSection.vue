<script setup lang="ts">
interface LinkedAccount {
	providerId: string
	displayName: string
	linkedAt: string
}

interface Props {
	user: {
		name: string
		email: string
		image: string | null
	}
	linkedAccounts: LinkedAccount[]
}

const props = defineProps<Props>()

const name = ref(props.user.name)
const image = ref(props.user.image ?? "")
const saving = ref(false)
const message = ref<{ type: "success" | "error", text: string } | null>(null)

// Change email state
const changeEmailOpen = ref(false)
const newEmail = ref("")
const changeEmailLoading = ref(false)
const changeEmailError = ref<string | null>(null)
const changeEmailSuccess = ref(false)

const hasChanges = computed(() => name.value !== props.user.name || image.value !== (props.user.image ?? ""))

function getProviderIcon(providerId: string): string {
	if (providerId === "credential") return "i-lucide-key-round"
	if (providerId === "google") return "i-lucide-chrome"
	if (providerId === "github") return "i-lucide-github"
	return "i-lucide-shield-check"
}

function formatLinkedDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

async function handleSave() {
	saving.value = true
	message.value = null

	try {
		const result = await authClient.updateUser({
			name: name.value,
			image: image.value || undefined,
		})

		if (result.error) {
			message.value = { type: "error", text: result.error.message ?? "Failed to update profile" }
		}
		else {
			message.value = { type: "success", text: "Profile updated successfully" }
			refreshNuxtData()
		}
	}
	catch {
		message.value = { type: "error", text: "An unexpected error occurred" }
	}
	finally {
		saving.value = false
	}
}

function resetChangeEmailForm() {
	newEmail.value = ""
	changeEmailError.value = null
	changeEmailSuccess.value = false
}

function handleChangeEmailDialogClose(open: boolean) {
	if (!open) {
		resetChangeEmailForm()
	}
	changeEmailOpen.value = open
}

async function handleChangeEmail() {
	if (!newEmail.value) {
		changeEmailError.value = "Please enter a new email address"
		return
	}

	if (newEmail.value === props.user.email) {
		changeEmailError.value = "New email must be different from current email"
		return
	}

	changeEmailLoading.value = true
	changeEmailError.value = null

	try {
		const result = await authClient.changeEmail({
			newEmail: newEmail.value,
			callbackURL: "/me?emailChanged=true",
		})

		if (result.error) {
			changeEmailError.value = result.error.message ?? "Failed to send verification email"
		}
		else {
			changeEmailSuccess.value = true
		}
	}
	catch {
		changeEmailError.value = "An unexpected error occurred"
	}
	finally {
		changeEmailLoading.value = false
	}
}
</script>

<template>
	<UiContentCard
		title="Account"
		icon="i-lucide-user"
		color="blue"
	>
		<div class="card-body">
			<!-- Edit form -->
			<div class="form-section">
				<div class="form-field">
					<label>Name</label>
					<UInput
						v-model="name"
						placeholder="Your name"
						class="w-full"
					/>
				</div>

				<div class="form-field">
					<label>Email</label>
					<div class="email-field">
						<UInput
							:model-value="user.email"
							disabled
							class="flex-1"
						/>
						<UModal
							v-model:open="changeEmailOpen"
							@update:open="handleChangeEmailDialogClose"
						>
							<UButton
								variant="outline"
								@click="changeEmailOpen = true"
							>
								Change
							</UButton>

							<template #content>
								<UCard>
									<template #header>
										<div>
											<h3 class="text-lg font-semibold">
												Change Email Address
											</h3>
											<p class="text-sm text-muted-foreground">
												A verification email will be sent to your new address
											</p>
										</div>
									</template>

									<div
										v-if="changeEmailSuccess"
										class="flex flex-col items-center gap-4 py-8"
									>
										<UIcon
											name="i-lucide-mail-check"
											class="size-12 text-green-600 dark:text-green-400"
										/>
										<div class="text-center">
											<p class="font-medium">
												Verification email sent!
											</p>
											<p class="text-sm text-muted-foreground mt-1">
												Check your inbox at {{ newEmail }} and click the verification link.
											</p>
										</div>
										<UButton
											variant="outline"
											@click="changeEmailOpen = false"
										>
											Close
										</UButton>
									</div>

									<div
										v-else
										class="space-y-4"
									>
										<div
											v-if="changeEmailError"
											class="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
										>
											{{ changeEmailError }}
										</div>

										<UFormField label="Current Email">
											<UInput
												:model-value="user.email"
												disabled
												class="w-full bg-muted"
											/>
										</UFormField>

										<UFormField label="New Email">
											<UInput
												v-model="newEmail"
												type="email"
												placeholder="new@example.com"
												class="w-full"
											/>
										</UFormField>
									</div>

									<template
										v-if="!changeEmailSuccess"
										#footer
									>
										<div class="flex justify-end gap-2">
											<UButton
												variant="outline"
												@click="changeEmailOpen = false"
											>
												Cancel
											</UButton>
											<UButton
												:loading="changeEmailLoading"
												:disabled="!newEmail"
												@click="handleChangeEmail"
											>
												Send Verification
											</UButton>
										</div>
									</template>
								</UCard>
							</template>
						</UModal>
					</div>
				</div>

				<div class="form-field">
					<label>Profile Image URL</label>
					<UInput
						v-model="image"
						placeholder="https://example.com/avatar.jpg"
						class="w-full"
					/>
				</div>
			</div>

			<p
				v-if="message"
				class="message"
				:class="message.type"
			>
				{{ message.text }}
			</p>

			<!-- Linked accounts -->
			<div class="linked-accounts">
				<h4>Linked Accounts</h4>
				<div class="accounts-list">
					<div
						v-for="account in linkedAccounts"
						:key="account.providerId"
						class="account-item"
					>
						<div class="account-info">
							<UIcon
								:name="getProviderIcon(account.providerId)"
								class="account-icon"
							/>
							<div class="account-details">
								<span class="account-name">{{ account.displayName }}</span>
								<span class="account-date">Linked {{ formatLinkedDate(account.linkedAt) }}</span>
							</div>
						</div>
						<span class="connected-badge">Connected</span>
					</div>
				</div>
			</div>

			<!-- Save button -->
			<div class="actions-footer">
				<UButton
					variant="outline"
					:loading="saving"
					:disabled="!hasChanges"
					@click="handleSave"
				>
					<UIcon
						name="i-lucide-save"
						class="h-4 w-4"
					/>
					Save Changes
				</UButton>
			</div>
		</div>
	</UiContentCard>
</template>

<style scoped>
.card-body {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	padding: 1rem;
}

/* Form section */
.form-section {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.form-field {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
}

.form-field label {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.email-field {
	display: flex;
	gap: 0.5rem;
}

/* Message */
.message {
	font-size: var(--font-size-sm);
}

.message.success {
	color: var(--ui-success);
}

.message.error {
	color: var(--ui-error);
}

/* Linked accounts */
.linked-accounts {
	padding-top: 1rem;
	border-top: 1px solid var(--ui-border-muted);
}

.linked-accounts h4 {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	margin-bottom: 0.75rem;
}

.accounts-list {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.account-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0.75rem;
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
}

.account-info {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.account-icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-text-muted);
}

.account-details {
	display: flex;
	flex-direction: column;
}

.account-name {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.account-date {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

.connected-badge {
	display: inline-flex;
	align-items: center;
	padding: 0.25rem 0.625rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 2rem;
	background: var(--ui-success-soft);
	color: var(--ui-success);
}

/* Actions footer */
.actions-footer {
	display: flex;
	justify-content: flex-end;
	padding-top: 1rem;
	border-top: 1px solid var(--ui-border-muted);
}
</style>
