<script setup lang="ts">
const route = useRoute()
const userId = route.params.id as string

definePageMeta({
	title: "User Details",
	layout: "default",
})

const { data, error } = await useFetch(`/api/users/${userId}`)

if (error.value) {
	console.error("User fetch error:", error.value)
}

const userInitials = computed(() => {
	if (!data.value?.user) return "?"
	const user = data.value.user
	if (user.name) {
		return user.name
			.split(" ")
			.map(n => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2)
	}
	return (user.email?.[0] ?? "?").toUpperCase()
})

function formatDate(date: Date | string | null): string {
	if (!date) return "Never"
	const d = typeof date === "string" ? new Date(date) : date
	return d.toLocaleDateString()
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar>
				<template #title>
					<UBreadcrumb
						:items="[
							{ label: 'Users', to: '/users' },
							{ label: data?.user.name || data?.user.email || 'User' },
						]"
					/>
				</template>
				<template #right>
					<UButton
						variant="outline"
						size="sm"
						to="/users"
					>
						<UIcon
							name="i-lucide-arrow-left"
							class="h-4 w-4 mr-2"
						/>
						Back to Users
					</UButton>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div
				v-if="error"
				class="text-center py-8"
			>
				<p class="text-destructive">
					Failed to load user data
				</p>
			</div>

			<div
				v-else-if="data"
				class="space-y-6"
			>
				<div class="grid gap-6 md:grid-cols-2">
					<!-- User Info Card -->
					<UCard>
						<template #header>
							<h3 class="text-lg font-semibold">
								User Information
							</h3>
						</template>

						<div class="space-y-4">
							<div class="flex items-center gap-4">
								<UAvatar
									:src="data.user.image ?? undefined"
									:text="userInitials"
									class="size-16 text-xl"
								/>
								<div class="space-y-1">
									<p class="text-lg font-medium">
										{{ data.user.name || "Unnamed" }}
									</p>
									<p class="text-sm text-muted-foreground">
										{{ data.user.email }}
									</p>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-4 pt-4 border-t">
								<div>
									<p class="text-sm text-muted-foreground">
										Role
									</p>
									<UBadge
										v-if="data.user.role === 'admin'"
										class="gap-1 mt-1"
									>
										<UIcon
											name="i-lucide-shield"
											class="size-3"
										/>
										Admin
									</UBadge>
									<UBadge
										v-else
										variant="subtle"
										class="mt-1"
									>
										User
									</UBadge>
								</div>
								<div>
									<p class="text-sm text-muted-foreground">
										Email Status
									</p>
									<UBadge
										v-if="data.user.emailVerified"
										variant="outline"
										class="text-green-600 border-green-600/50 mt-1"
									>
										Verified
									</UBadge>
									<UBadge
										v-else
										variant="outline"
										class="text-yellow-600 border-yellow-600/50 mt-1"
									>
										Pending
									</UBadge>
								</div>
								<div>
									<p class="text-sm text-muted-foreground">
										Created
									</p>
									<p class="text-sm font-medium mt-1">
										{{ formatDate(data.user.createdAt) }}
									</p>
								</div>
								<div>
									<p class="text-sm text-muted-foreground">
										Updated
									</p>
									<p class="text-sm font-medium mt-1">
										{{ formatDate(data.user.updatedAt) }}
									</p>
								</div>
							</div>

							<!-- Ban Info -->
							<div
								v-if="data.user.banned"
								class="pt-4 border-t"
							>
								<UBadge
									variant="solid"
									class="mb-2 bg-destructive text-destructive-foreground"
								>
									Banned
								</UBadge>
								<p
									v-if="data.user.banReason"
									class="text-sm text-muted-foreground"
								>
									<span class="font-medium">Reason:</span> {{ data.user.banReason }}
								</p>
								<p
									v-if="data.user.banExpires"
									class="text-sm text-muted-foreground"
								>
									<span class="font-medium">Expires:</span> {{ formatDate(data.user.banExpires) }}
								</p>
							</div>
						</div>
					</UCard>

					<!-- Connected Accounts Card -->
					<UCard>
						<template #header>
							<div>
								<h3 class="text-lg font-semibold flex items-center gap-2">
									<UIcon
										name="i-lucide-key-round"
										class="size-4"
									/>
									Connected Accounts
								</h3>
								<p class="text-sm text-muted-foreground">
									{{ data.accounts.length }} connected accounts
								</p>
							</div>
						</template>

						<div v-if="data.accounts.length === 0">
							<p class="text-sm text-muted-foreground">
								No connected accounts
							</p>
						</div>
						<div
							v-else
							class="space-y-3"
						>
							<div
								v-for="account in data.accounts"
								:key="account.id"
								class="flex items-center justify-between p-3 rounded-lg bg-muted/50"
							>
								<div>
									<p class="font-medium capitalize">
										{{ account.providerId }}
									</p>
									<p class="text-xs text-muted-foreground">
										Connected {{ formatDate(account.createdAt) }}
									</p>
								</div>
								<UBadge
									v-if="account.providerId === 'credential'"
									variant="outline"
								>
									Password
								</UBadge>
							</div>
						</div>
					</UCard>
				</div>

				<!-- Sessions Card -->
				<UCard>
					<template #header>
						<div>
							<h3 class="text-lg font-semibold flex items-center gap-2">
								<UIcon
									name="i-lucide-monitor"
									class="size-4"
								/>
								Active Sessions
							</h3>
							<p class="text-sm text-muted-foreground">
								{{ data.sessions.length }} sessions
							</p>
						</div>
					</template>

					<div
						v-if="data.sessions.length === 0"
						class="py-4"
					>
						<p class="text-sm text-muted-foreground">
							No active sessions
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
										Device / Browser
									</th>
									<th class="px-4 py-3 font-medium">
										IP Address
									</th>
									<th class="px-4 py-3 font-medium">
										Created
									</th>
									<th class="px-4 py-3 font-medium text-right">
										Expires
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="session in data.sessions"
									:key="session.id"
									class="border-b last:border-0"
								>
									<td class="px-4 py-3 max-w-xs">
										<p
											class="text-sm truncate"
											:title="session.userAgent ?? undefined"
										>
											{{ session.userAgent || "Unknown device" }}
										</p>
									</td>
									<td class="px-4 py-3 text-sm text-muted-foreground">
										{{ session.ipAddress || "Unknown" }}
									</td>
									<td class="px-4 py-3 text-sm text-muted-foreground">
										{{ formatDate(session.createdAt) }}
									</td>
									<td class="px-4 py-3 text-right text-sm text-muted-foreground">
										{{ formatDate(session.expiresAt) }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</UCard>

				<!-- API Keys Card -->
				<UCard>
					<template #header>
						<div>
							<h3 class="text-lg font-semibold flex items-center gap-2">
								<UIcon
									name="i-lucide-key"
									class="size-4"
								/>
								API Keys
							</h3>
							<p class="text-sm text-muted-foreground">
								{{ data.apiKeys.length }} API keys
							</p>
						</div>
					</template>

					<div
						v-if="data.apiKeys.length === 0"
						class="py-4"
					>
						<p class="text-sm text-muted-foreground">
							No API keys
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
									<th class="px-4 py-3 font-medium text-right">
										Expires
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="apiKey in data.apiKeys"
									:key="apiKey.id"
									class="border-b last:border-0"
								>
									<td class="px-4 py-3 font-medium">
										{{ apiKey.name || "Unnamed Key" }}
									</td>
									<td class="px-4 py-3 font-mono text-sm text-muted-foreground">
										{{ apiKey.start ? `${apiKey.start}...` : "—" }}
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
											class="text-red-600 border-red-600/50"
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
									<td class="px-4 py-3 text-right text-sm text-muted-foreground">
										{{ formatDate(apiKey.expiresAt) }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</UCard>
			</div>

			<div
				v-else
				class="flex items-center justify-center py-8"
			>
				<UIcon
					name="i-lucide-loader-2"
					class="size-6 animate-spin text-muted-foreground"
				/>
			</div>
		</template>
	</UDashboardPanel>
</template>
