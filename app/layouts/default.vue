<script setup lang="ts">
const { user, isAdmin, signOut } = await useAuth()
const route = useRoute()
const { collapsed, isMobile, init, cleanup } = useSidebar()

onMounted(() => {
	init()
})

onUnmounted(() => {
	cleanup()
})

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
	]

	if (isAdmin.value) {
		items.push({ label: "Attention", icon: "i-lucide-alert-triangle", to: "/attention", active: isActiveRoute("/attention") })
	}

	items.push(
		{ label: "Series", icon: "i-lucide-book-open", to: "/series", active: isActiveRoute("/series") },
		{ label: "Sources", icon: "i-lucide-server", to: "/sources", active: isActiveRoute("/sources") },
	)

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
	c: () => {
		if (!isMobile.value) {
			useSidebar().toggle()
		}
	},
})
</script>

<template>
	<div class="app-layout">
		<LayoutAppSidebar
			:items="navigation"
			:user="user"
			:user-initials="userInitials"
			@sign-out="handleSignOut"
		/>

		<main
			class="main-content"
			:class="{ 'sidebar-collapsed': collapsed }"
		>
			<slot />
		</main>
	</div>
</template>

<style scoped>
.app-layout {
	position: fixed;
	inset: 0;
	display: flex;
	overflow: hidden;
}

.main-content {
	flex: 1;
	margin-left: var(--sidebar-width);
	transition: margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	display: flex;
	flex-direction: column;
	overflow-y: auto;
	overflow-x: hidden;
}

.main-content.sidebar-collapsed,
:global(html.sidebar-collapsed) .main-content {
	margin-left: var(--sidebar-collapsed-width);
}

@media (max-width: 767px) {
	.main-content,
	.main-content.sidebar-collapsed,
	:global(html.sidebar-collapsed) .main-content {
		margin-left: 0;
	}
}
</style>
