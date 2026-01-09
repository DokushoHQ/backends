<script setup lang="ts">
interface ApiKey {
	id: string
	name: string | null
	start: string | null
	enabled: boolean
	requestCount: number
	lastRequest: Date | string | null
	expiresAt: Date | string | null
	createdAt: Date | string
}

interface Props {
	apiKeys: ApiKey[]
}

defineProps<Props>()

const isCreateOpen = ref(false)
const newKeyName = ref("")
const creating = ref(false)
const deletingId = ref<string | null>(null)
const newKey = ref<string | null>(null)
const copied = ref(false)
const error = ref<string | null>(null)

async function handleCreate() {
	creating.value = true
	error.value = null

	try {
		const result = await authClient.apiKey.create({
			name: newKeyName.value || "API Key",
			expiresIn: 60 * 60 * 24 * 365, // 1 year
		})

		if (result.error) {
			error.value = result.error.message ?? "Failed to create API key"
		}
		else if (result.data?.key) {
			newKey.value = result.data.key
			newKeyName.value = ""
			refreshNuxtData()
		}
	}
	catch {
		error.value = "An unexpected error occurred"
	}
	finally {
		creating.value = false
	}
}

async function handleDelete(keyId: string) {
	deletingId.value = keyId

	try {
		const result = await authClient.apiKey.delete({ keyId })

		if (result.error) {
			error.value = result.error.message ?? "Failed to delete API key"
		}
		else {
			refreshNuxtData()
		}
	}
	catch {
		error.value = "An unexpected error occurred"
	}
	finally {
		deletingId.value = null
	}
}

function handleCopy() {
	if (newKey.value) {
		navigator.clipboard.writeText(newKey.value)
		copied.value = true
		setTimeout(() => (copied.value = false), 2000)
	}
}

function handleDialogClose(open: boolean) {
	if (!open) {
		newKey.value = null
		newKeyName.value = ""
		error.value = null
	}
	isCreateOpen.value = open
}

function formatDate(date: Date | string | null): string {
	if (!date) return "Never"
	const d = typeof date === "string" ? new Date(date) : date
	return d.toLocaleDateString()
}
</script>

<template>
	<UCard>
		<template #header>
			<div class="flex items-center justify-between">
				<div>
					<h3 class="text-lg font-semibold flex items-center gap-2">
						<UIcon
							name="i-lucide-key"
							class="size-4"
						/>
						API Keys
					</h3>
					<p class="text-sm text-muted-foreground">
						{{ apiKeys.length }} API keys
					</p>
				</div>
				<UModal v-model:open="isCreateOpen">
					<UButton
						variant="outline"
						size="sm"
						@click="isCreateOpen = true"
					>
						<UIcon
							name="i-lucide-plus"
							class="size-4"
						/>
						Create Key
					</UButton>

					<template #content>
						<UCard>
							<template #header>
								<div>
									<h3 class="font-semibold">
										{{ newKey ? "API Key Created" : "Create API Key" }}
									</h3>
									<p class="text-sm text-muted-foreground">
										{{
											newKey
												? "Copy your API key now. You won't be able to see it again."
												: "Create a new API key to access the API programmatically."
										}}
									</p>
								</div>
							</template>

							<div
								v-if="newKey"
								class="space-y-4"
							>
								<div class="flex items-center gap-2">
									<UInput
										:model-value="newKey"
										readonly
										class="font-mono text-sm flex-1"
									/>
									<UButton
										variant="outline"
										icon="i-lucide-copy"
										@click="handleCopy"
									/>
								</div>
								<p
									v-if="copied"
									class="text-sm text-green-600"
								>
									Copied to clipboard!
								</p>
							</div>

							<div
								v-else
								class="space-y-4"
							>
								<UFormField label="Key Name">
									<UInput
										v-model="newKeyName"
										placeholder="My API Key"
										class="w-full"
									/>
								</UFormField>
								<p
									v-if="error"
									class="text-sm text-destructive"
								>
									{{ error }}
								</p>
							</div>

							<template #footer>
								<div class="flex justify-end gap-2">
									<UButton
										v-if="newKey"
										@click="handleDialogClose(false)"
									>
										Done
									</UButton>
									<template v-else>
										<UButton
											variant="outline"
											@click="handleDialogClose(false)"
										>
											Cancel
										</UButton>
										<UButton
											:loading="creating"
											@click="handleCreate"
										>
											Create Key
										</UButton>
									</template>
								</div>
							</template>
						</UCard>
					</template>
				</UModal>
			</div>
		</template>

		<div
			v-if="apiKeys.length === 0"
			class="py-6 text-center"
		>
			<p class="text-sm text-muted-foreground">
				No API keys yet. Create one to access the API programmatically.
			</p>
		</div>

		<div
			v-else
			class="-mx-4 -my-2"
		>
			<table class="w-full">
				<thead>
					<tr class="border-b text-left text-sm text-muted-foreground">
						<th class="px-4 py-3 font-medium">
							Name
						</th>
						<th class="px-4 py-3 font-medium">
							Key Prefix
						</th>
						<th class="px-4 py-3 font-medium">
							Status
						</th>
						<th class="px-4 py-3 font-medium">
							Requests
						</th>
						<th class="px-4 py-3 font-medium">
							Last Used
						</th>
						<th class="px-4 py-3 font-medium">
							Expires
						</th>
						<th class="px-4 py-3 w-12" />
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="apiKey in apiKeys"
						:key="apiKey.id"
						class="border-b last:border-0"
					>
						<td class="px-4 py-3 font-medium">
							{{ apiKey.name || "Unnamed Key" }}
						</td>
						<td class="px-4 py-3 font-mono text-sm text-muted-foreground">
							{{ apiKey.start ? `${apiKey.start}...` : "-" }}
						</td>
						<td class="px-4 py-3">
							<UBadge
								v-if="apiKey.enabled"
								variant="outline"
								class="text-green-600 border-green-600/50"
							>
								Active
							</UBadge>
							<UBadge
								v-else
								variant="outline"
								class="text-destructive border-destructive/50"
							>
								Disabled
							</UBadge>
						</td>
						<td class="px-4 py-3 text-sm text-muted-foreground">
							{{ apiKey.requestCount.toLocaleString() }}
						</td>
						<td class="px-4 py-3 text-sm text-muted-foreground">
							{{ formatDate(apiKey.lastRequest) }}
						</td>
						<td class="px-4 py-3 text-sm text-muted-foreground">
							{{ formatDate(apiKey.expiresAt) }}
						</td>
						<td class="px-4 py-3">
							<UButton
								variant="ghost"
								size="sm"
								:loading="deletingId === apiKey.id"
								class="text-muted-foreground hover:text-destructive"
								@click="handleDelete(apiKey.id)"
							>
								<UIcon
									name="i-lucide-trash-2"
									class="size-4"
								/>
							</UButton>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</UCard>
</template>
