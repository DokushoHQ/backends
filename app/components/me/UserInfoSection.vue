<script setup lang="ts">
interface LinkedAccount {
	providerId: string
	displayName: string
	linkedAt: string
}

interface Props {
	user: {
		id: string
		name: string
		email: string
		image: string | null
		role: string | null
		createdAt: string
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

const userInitials = computed(() => {
	if (name.value) {
		return name.value
			.split(" ")
			.map(n => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2)
	}
	return (props.user.email[0] ?? "?").toUpperCase()
})

const roleLabel = computed(() => {
	if (!props.user.role) return "User"
	return props.user.role.charAt(0).toUpperCase() + props.user.role.slice(1)
})

const memberSince = computed(() => {
	return new Date(props.user.createdAt).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	})
})

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
	<UCard>
		<template #header>
			<div>
				<h3 class="text-lg font-semibold flex items-center gap-2">
					<UIcon
						name="i-lucide-user"
						class="size-4"
					/>
					Profile Information
				</h3>
				<p class="text-sm text-muted-foreground">
					Update your personal information
				</p>
			</div>
		</template>

		<div class="space-y-6">
			<!-- Avatar and basic info -->
			<div class="flex items-center gap-4">
				<UAvatar
					:src="image || undefined"
					:text="userInitials"
					class="size-16 text-xl"
				/>
				<div class="space-y-1">
					<div class="flex items-center gap-2">
						<span class="font-medium">{{ name || user.email }}</span>
						<UBadge
							:color="user.role === 'admin' ? 'primary' : 'neutral'"
							variant="subtle"
							size="sm"
						>
							{{ roleLabel }}
						</UBadge>
					</div>
					<p class="text-sm text-muted-foreground">
						Member since {{ memberSince }}
					</p>
				</div>
			</div>

			<!-- Edit form -->
			<div class="grid gap-4">
				<div class="grid gap-2">
					<label class="text-sm font-medium">Name</label>
					<UInput
						v-model="name"
						placeholder="Your name"
						class="w-full"
					/>
				</div>

				<div class="grid gap-2">
					<label class="text-sm font-medium">Email</label>
					<div class="flex gap-2">
						<UInput
							:model-value="user.email"
							disabled
							class="flex-1 bg-muted"
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

				<div class="grid gap-2">
					<label class="text-sm font-medium">Profile Image URL</label>
					<UInput
						v-model="image"
						placeholder="https://example.com/avatar.jpg"
						class="w-full"
					/>
				</div>
			</div>

			<p
				v-if="message"
				class="text-sm"
				:class="message.type === 'error' ? 'text-destructive' : 'text-green-600'"
			>
				{{ message.text }}
			</p>

			<!-- Linked accounts -->
			<div class="pt-4 border-t">
				<h4 class="text-sm font-medium mb-3">
					Linked Accounts
				</h4>
				<div class="space-y-2">
					<div
						v-for="account in linkedAccounts"
						:key="account.providerId"
						class="flex items-center justify-between p-3 rounded-lg bg-muted/50"
					>
						<div class="flex items-center gap-3">
							<UIcon
								:name="getProviderIcon(account.providerId)"
								class="size-5 text-muted-foreground"
							/>
							<div>
								<p class="text-sm font-medium">
									{{ account.displayName }}
								</p>
								<p class="text-xs text-muted-foreground">
									Linked {{ formatLinkedDate(account.linkedAt) }}
								</p>
							</div>
						</div>
						<UBadge
							color="success"
							variant="subtle"
							size="xl"
						>
							Connected
						</UBadge>
					</div>
				</div>
			</div>

			<!-- Save button -->
			<div class="flex justify-end pt-4 border-t">
				<UButton
					variant="outline"
					:loading="saving"
					:disabled="!hasChanges"
					@click="handleSave"
				>
					<UIcon
						name="i-lucide-save"
						class="size-4"
					/>
					Save Changes
				</UButton>
			</div>
		</div>
	</UCard>
</template>
