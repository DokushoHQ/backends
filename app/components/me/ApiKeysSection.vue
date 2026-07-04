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

const props = defineProps<Props>()

const isCreateOpen = ref(false)
const newKeyName = ref("")
const creating = ref(false)
const deletingId = ref<string | null>(null)
const newKey = ref<string | null>(null)
const copied = ref(false)
const error = ref<string | null>(null)

const keyCountDescription = computed(() => {
	const count = props.apiKeys.length
	return `${count} API key${count === 1 ? "" : "s"}`
})

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
	<UiContentCard
		title="API Keys"
		:description="keyCountDescription"
		icon="i-lucide-key"
		color="amber"
	>
		<template #header-actions>
			<UModal
				v-model:open="isCreateOpen"
				@update:open="handleDialogClose"
			>
				<UButton
					variant="outline"
					size="sm"
					@click="() => { isCreateOpen = true }"
				>
					<UIcon
						name="i-lucide-plus"
						class="h-4 w-4"
					/>
					Create Key
				</UButton>

				<template #content>
					<UCard>
						<template #header>
							<div>
								<h3 class="text-lg font-semibold">
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
								class="text-sm text-success"
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
								class="text-sm text-error"
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
		</template>

		<div class="card-body">
			<div
				v-if="apiKeys.length === 0"
				class="empty-state"
			>
				<UIcon
					name="i-lucide-key-round"
					class="empty-icon"
				/>
				<span>No API keys yet</span>
				<span class="empty-description">Create one to access the API programmatically</span>
			</div>

			<div
				v-else
				class="table-wrapper"
			>
				<table class="data-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Key Prefix</th>
							<th>Status</th>
							<th>Requests</th>
							<th>Last Used</th>
							<th>Expires</th>
							<th class="action-col" />
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="apiKey in apiKeys"
							:key="apiKey.id"
						>
							<td class="name-cell">
								{{ apiKey.name || "Unnamed Key" }}
							</td>
							<td class="key-cell">
								{{ apiKey.start ? `${apiKey.start}...` : "-" }}
							</td>
							<td>
								<span
									v-if="apiKey.enabled"
									class="status-badge active"
								>
									Active
								</span>
								<span
									v-else
									class="status-badge disabled"
								>
									Disabled
								</span>
							</td>
							<td class="meta-cell">
								{{ apiKey.requestCount.toLocaleString() }}
							</td>
							<td class="meta-cell">
								{{ formatDate(apiKey.lastRequest) }}
							</td>
							<td class="meta-cell">
								{{ formatDate(apiKey.expiresAt) }}
							</td>
							<td class="action-col">
								<UButton
									variant="ghost"
									color="error"
									size="sm"
									:loading="deletingId === apiKey.id"
									@click="handleDelete(apiKey.id)"
								>
									<UIcon
										name="i-lucide-trash-2"
										class="h-4 w-4"
									/>
								</UButton>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</UiContentCard>
</template>

<style scoped>
.card-body {
	padding: 0;
}

/* Empty state */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.5rem;
	padding: 2.5rem 1rem;
	color: var(--ui-text-muted);
	font-size: var(--font-size-sm);
}

.empty-icon {
	width: 2rem;
	height: 2rem;
	opacity: 0.5;
}

.empty-description {
	font-size: var(--font-size-xs);
	opacity: 0.8;
}

/* Table wrapper */
.table-wrapper {
	overflow-x: auto;
}

/* Data table */
.data-table {
	width: 100%;
	border-collapse: collapse;
}

.data-table th {
	padding: 0.75rem 1rem;
	text-align: left;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	background: var(--ui-bg-muted);
	border-bottom: 1px solid var(--ui-border-muted);
}

.data-table td {
	padding: 0.75rem 1rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text);
	border-bottom: 1px solid var(--ui-border-muted);
}

.data-table tbody tr:last-child td {
	border-bottom: none;
}

.data-table tbody tr:hover {
	background: var(--ui-bg-muted);
}

.action-col {
	width: 3rem;
	text-align: center;
}

/* Cell styles */
.name-cell {
	font-weight: 500;
}

.key-cell {
	font-family: var(--font-mono, ui-monospace, monospace);
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

.meta-cell {
	color: var(--ui-text-muted);
}

/* Status badge */
.status-badge {
	display: inline-flex;
	align-items: center;
	padding: 0.125rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 2rem;
}

.status-badge.active {
	background: var(--ui-success-soft);
	color: var(--ui-success);
}

.status-badge.disabled {
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

/* Utility classes for modal */
.text-success {
	color: var(--ui-success);
}

.text-error {
	color: var(--ui-error);
}
</style>
