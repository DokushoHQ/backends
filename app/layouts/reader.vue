<script setup lang="ts">
const route = useRoute()
const { isAdmin } = await useAuth()

function isActive(path: string): boolean {
	if (path === "/") return route.path === "/" || route.path.startsWith("/series/")
	return route.path === path || route.path.startsWith(`${path}/`)
}

const backTo = computed(() => {
	if (route.path.startsWith("/series/")) return "/"
	return undefined
})

const links = computed(() => {
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
	<div class="reader-layout">
		<UiPageHeader
			title="Tsundoku"
			:back-to="backTo"
			:show-mobile-menu="false"
		>
			<template #right>
				<nav class="reader-nav">
					<template
						v-for="(link, i) in links"
						:key="link.to"
					>
						<span
							v-if="i > 0 && link.to === '/dashboard'"
							class="reader-nav__sep"
						/>
						<NuxtLink
							:to="link.to"
							class="reader-nav__link"
							:class="{ 'reader-nav__link--active': isActive(link.to) }"
						>
							<UIcon
								:name="link.icon"
								class="reader-nav__icon"
							/>
							{{ link.label }}
						</NuxtLink>
					</template>
				</nav>
			</template>
		</UiPageHeader>

		<main class="reader-main">
			<slot />
		</main>

		<LayoutReaderBottomNav />
	</div>
</template>

<style scoped>
.reader-layout {
	min-height: 100vh;
	display: flex;
	flex-direction: column;
	background: var(--ui-bg);
}

.reader-main {
	flex: 1;
	display: flex;
	flex-direction: column;
	padding-bottom: var(--reader-bottom-nav-height);
}

@media (min-width: 640px) {
	.reader-main {
		padding-bottom: 0;
	}
}

/* Nav links in the right slot of UiPageHeader */
.reader-nav {
	display: none;
	align-items: center;
	gap: 0.125rem;
}

@media (min-width: 640px) {
	.reader-nav {
		display: flex;
	}
}

.reader-nav__link {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.5rem 0.75rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text-dimmed);
	text-decoration: none;
	border-radius: var(--radius-panel);
	transition: color 0.15s ease, background-color 0.15s ease;
}

.reader-nav__icon {
	width: 1rem;
	height: 1rem;
}

.reader-nav__link:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

.reader-nav__link--active {
	color: var(--ui-primary);
}

.reader-nav__sep {
	width: 1px;
	height: 1rem;
	margin: 0 0.375rem;
	background: var(--ui-border);
}
</style>
