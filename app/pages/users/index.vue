<script setup lang="ts">
definePageMeta({
	title: "Users",
	layout: "default",
})

const { data, error } = await useFetch("/api/users")

if (error.value) {
	console.error("Users fetch error:", error.value)
}

function getUserInitials(user: { name: string | null, email: string }): string {
	if (user.name) {
		return user.name
			.split(" ")
			.map(n => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2)
	}
	return (user.email[0] ?? "?").toUpperCase()
}

function formatDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date
	return d.toLocaleDateString()
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar
				title="Users"
				:description="`${data?.users.length ?? 0} registered users`"
			/>
		</template>

		<template #body>
			<!-- Error state -->
			<div
				v-if="error"
				class="py-12 text-center"
			>
				<div class="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
					<UIcon
						name="i-lucide-alert-circle"
						class="size-8 text-destructive"
					/>
				</div>
				<h3 class="text-lg font-semibold">
					Failed to load users
				</h3>
				<p class="text-sm text-muted-foreground">
					{{
						error.statusCode === 403
							? "You don't have permission to view this page"
							: error.message
					}}
				</p>
			</div>

			<!-- Empty state -->
			<div
				v-else-if="!data?.users.length"
				class="py-12 text-center"
			>
				<div class="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
					<UIcon
						name="i-lucide-users"
						class="size-8 text-muted-foreground"
					/>
				</div>
				<h3 class="text-lg font-semibold">
					No users yet
				</h3>
				<p class="text-sm text-muted-foreground">
					Users will appear here once they register.
				</p>
			</div>

			<!-- Data -->
			<UCard v-else>
				<template #header>
					<div>
						<h3 class="text-lg font-semibold">
							All Users
						</h3>
						<p class="text-sm text-muted-foreground">
							Manage user accounts and permissions
						</p>
					</div>
				</template>

				<div class="-mx-4 -my-2">
					<table class="w-full">
						<thead>
							<tr
								class="border-b text-left text-sm text-muted-foreground"
							>
								<th class="px-4 py-3 font-medium">
									User
								</th>
								<th class="px-4 py-3 font-medium">
									Role
								</th>
								<th class="px-4 py-3 font-medium">
									Status
								</th>
								<th class="px-4 py-3 font-medium text-right">
									Joined
								</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="user in data.users"
								:key="user.id"
								class="border-b last:border-0 cursor-pointer hover:bg-muted/50"
							>
								<td class="px-4 py-3">
									<NuxtLink
										:to="`/users/${user.id}`"
										class="flex items-center gap-3"
									>
										<UAvatar
											:src="user.image ?? undefined"
											:text="getUserInitials(user)"
											size="sm"
										/>
										<div>
											<p class="font-medium">
												{{ user.name || "Unnamed" }}
											</p>
											<p
												class="text-sm text-muted-foreground"
											>
												{{ user.email }}
											</p>
										</div>
									</NuxtLink>
								</td>
								<td class="px-4 py-3">
									<UBadge
										v-if="user.role === 'admin'"
										class="gap-1"
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
									>
										User
									</UBadge>
								</td>
								<td class="px-4 py-3">
									<UBadge
										v-if="user.emailVerified"
										variant="outline"
										class="text-green-600 border-green-600/50"
									>
										Verified
									</UBadge>
									<UBadge
										v-else
										variant="outline"
										class="text-yellow-600 border-yellow-600/50"
									>
										Pending
									</UBadge>
								</td>
								<td
									class="px-4 py-3 text-right text-sm text-muted-foreground"
								>
									{{ formatDate(user.createdAt) }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</UCard>
		</template>
	</UDashboardPanel>
</template>
