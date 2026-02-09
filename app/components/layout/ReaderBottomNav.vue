<script setup lang="ts">
const route = useRoute()
const { isAdmin } = await useAuth()

function isActive(path: string): boolean {
	if (path === "/") return route.path === "/" || route.path.startsWith("/series/")
	return route.path === path || route.path.startsWith(`${path}/`)
}

const tabs = computed(() => {
	const items = [
		{ label: "Library", icon: "i-lucide-library", to: "/" },
		{ label: "Profile", icon: "i-lucide-user", to: "/me" },
	]
	if (isAdmin.value) {
		items.push({ label: "Dashboard", icon: "i-lucide-layout-dashboard", to: "/dashboard" })
	}
	return items
})
</script>

<template>
	<nav class="bottom-nav">
		<NuxtLink
			v-for="tab in tabs"
			:key="tab.to"
			:to="tab.to"
			class="bottom-nav__tab"
			:class="{ 'bottom-nav__tab--active': isActive(tab.to) }"
		>
			<UIcon
				:name="tab.icon"
				class="bottom-nav__icon"
			/>
			<span class="bottom-nav__label">{{ tab.label }}</span>
		</NuxtLink>
	</nav>
</template>

<style scoped>
.bottom-nav {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: var(--reader-bottom-nav-height);
	display: flex;
	align-items: stretch;
	background: color-mix(in oklch, var(--ui-bg-elevated) 85%, transparent);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	border-top: 1px solid var(--ui-border);
	z-index: 50;
}

@media (min-width: 640px) {
	.bottom-nav {
		display: none;
	}
}

.bottom-nav__tab {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.125rem;
	text-decoration: none;
	color: var(--ui-text-dimmed);
	transition: color 0.15s ease;
	position: relative;
	-webkit-tap-highlight-color: transparent;
}

.bottom-nav__tab--active {
	color: var(--ui-primary);
}

.bottom-nav__tab--active::before {
	content: '';
	position: absolute;
	top: 0;
	left: 25%;
	right: 25%;
	height: 2px;
	background: var(--ui-primary);
	border-radius: 0 0 2px 2px;
}

.bottom-nav__icon {
	width: 1.25rem;
	height: 1.25rem;
}

.bottom-nav__label {
	font-size: var(--font-size-xs);
	font-weight: 500;
	line-height: 1;
}
</style>
