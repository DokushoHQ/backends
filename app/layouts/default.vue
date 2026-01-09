<script setup lang="ts">
const { user, isAdmin, signOut } = await useAuth()
const route = useRoute()

const collapsed = ref(false)

// Helper to check if route matches (including nested routes)
function isActiveRoute(path: string): boolean {
	if (path === "/") {
		return route.path === "/"
	}
	return route.path === path || route.path.startsWith(`${path}/`)
}

const navigation = computed(() => {
	const items = [
		{ label: "Overview", icon: "i-lucide-home", to: "/", active: isActiveRoute("/") },
		{ label: "Series", icon: "i-lucide-book-open", to: "/series", active: isActiveRoute("/series") },
		{ label: "Sources", icon: "i-lucide-server", to: "/sources", active: isActiveRoute("/sources") },
	]

	if (isAdmin.value) {
		items.push(
			{ label: "Users", icon: "i-lucide-users", to: "/users", active: isActiveRoute("/users") },
			{ label: "Jobs", icon: "i-lucide-briefcase", to: "/jobs", active: isActiveRoute("/jobs") },
		)
	}

	return items
})

const userInitials = computed(() => {
	if (user.value?.name) {
		return user.value.name
			.split(" ")
			.map((n: string) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2)
	}
	return (user.value?.email?.[0] ?? "?").toUpperCase()
})

async function handleSignOut() {
	await signOut()
}

defineShortcuts({
	c: () => (collapsed.value = !collapsed.value),
})
</script>

<template>
	<UDashboardGroup>
		<UDashboardSidebar
			v-model:collapsed="collapsed"
			collapsible
			:min-size="9"
		>
			<template #header="{ collapsed: isCollapsed }">
				<div
					class="flex items-center w-full"
					:class="isCollapsed ? 'justify-center' : ''"
				>
					<div class="flex items-center gap-2">
						<UIcon
							name="i-lucide-book-open"
							class="size-6 shrink-0"
						/>
						<span
							v-if="!isCollapsed"
							class="text-lg font-semibold"
						>Dokusho</span>
					</div>
				</div>
			</template>

			<template #default="{ collapsed: isCollapsed }">
				<UNavigationMenu
					:collapsed="isCollapsed"
					:items="navigation"
					orientation="vertical"
				/>
			</template>

			<template #footer="{ collapsed: isCollapsed }">
				<div
					class="flex flex-col gap-1"
					:class="isCollapsed ? 'items-center' : ''"
				>
					<NuxtLink
						to="/me"
						class="flex items-center rounded-md hover:bg-muted transition-colors"
						:class="
							isCollapsed
								? 'justify-center p-2'
								: 'gap-3 px-2.5 py-2'
						"
					>
						<UAvatar
							:src="user?.image ?? undefined"
							:text="userInitials"
							size="sm"
							class="shrink-0"
						/>
						<div
							v-if="!isCollapsed"
							class="flex flex-col overflow-hidden min-w-0"
						>
							<span class="text-sm font-medium truncate">{{
								user?.name || "User"
							}}</span>
							<span
								class="text-xs text-muted-foreground truncate"
							>{{ user?.email }}</span>
						</div>
					</NuxtLink>
					<UButton
						v-if="!isCollapsed"
						variant="ghost"
						class="justify-start w-full"
						icon="i-lucide-log-out"
						@click="handleSignOut"
					>
						Sign out
					</UButton>
					<UButton
						v-else
						variant="ghost"
						icon="i-lucide-log-out"
						@click="handleSignOut"
					/>
					<UButton
						variant="ghost"
						:icon="
							isCollapsed
								? 'i-lucide-panel-left-open'
								: 'i-lucide-panel-left-close'
						"
						:class="isCollapsed ? '' : 'justify-start w-full'"
						@click="collapsed = !collapsed"
					>
						<span v-if="!isCollapsed">Collapse</span>
					</UButton>
				</div>
			</template>
		</UDashboardSidebar>

		<div class="flex-1 flex flex-col overflow-hidden">
			<slot />
		</div>
	</UDashboardGroup>
</template>
