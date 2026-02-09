<script setup lang="ts">
const route = useRoute()
const { isAdmin } = await useAuth()

function isActive(path: string): boolean {
	if (path === "/") return route.path === "/"
	return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
	<div class="reader-layout">
		<header class="reader-header">
			<div class="reader-header__left">
				<NuxtLink
					to="/"
					class="reader-header__logo"
				>
					<UIcon
						name="i-lucide-book-open"
						class="reader-header__logo-icon"
					/>
					<span class="reader-header__title">Tsundoku</span>
				</NuxtLink>

				<nav class="reader-header__nav">
					<NuxtLink
						to="/"
						class="reader-header__nav-link"
						:class="{ 'reader-header__nav-link--active': isActive('/') }"
					>
						<UIcon
							name="i-lucide-library"
							class="reader-header__nav-icon"
						/>
						Library
					</NuxtLink>
					<NuxtLink
						to="/me"
						class="reader-header__nav-link"
						:class="{ 'reader-header__nav-link--active': isActive('/me') }"
					>
						<UIcon
							name="i-lucide-user"
							class="reader-header__nav-icon"
						/>
						Profile
					</NuxtLink>

					<template v-if="isAdmin">
						<span class="reader-header__nav-sep" />
						<NuxtLink
							to="/dashboard"
							class="reader-header__nav-link"
						>
							<UIcon
								name="i-lucide-layout-dashboard"
								class="reader-header__nav-icon"
							/>
							Dashboard
						</NuxtLink>
					</template>
				</nav>
			</div>
		</header>

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

.reader-header {
	height: 2.75rem;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 1rem;
	border-bottom: 1px solid var(--ui-border);
	background: var(--ui-bg-elevated);
	flex-shrink: 0;
}

@media (min-width: 640px) {
	.reader-header {
		height: 3.5rem;
		padding: 0 1.5rem;
	}
}

@media (min-width: 1280px) {
	.reader-header {
		padding: 0 2.5rem;
	}
}

.reader-header__left {
	display: flex;
	align-items: center;
	gap: 2rem;
}

.reader-header__logo {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: var(--ui-text);
	text-decoration: none;
	font-weight: 600;
	font-size: var(--font-size-base);
}

.reader-header__logo-icon {
	width: 1.25rem;
	height: 1.25rem;
}

@media (min-width: 640px) {
	.reader-header__logo {
		font-size: var(--font-size-md);
		gap: 0.625rem;
	}

	.reader-header__logo-icon {
		width: 1.375rem;
		height: 1.375rem;
	}
}

.reader-header__nav {
	display: none;
	align-items: center;
	gap: 0.125rem;
}

@media (min-width: 640px) {
	.reader-header__nav {
		display: flex;
	}
}

.reader-header__nav-link {
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

.reader-header__nav-icon {
	width: 1rem;
	height: 1rem;
}

.reader-header__nav-link:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

.reader-header__nav-link--active {
	color: var(--ui-primary);
}

.reader-header__nav-link--active::after {
	content: '';
	position: absolute;
	bottom: -0.6875rem;
	left: 0.75rem;
	right: 0.75rem;
	height: 2px;
	background: var(--ui-primary);
	border-radius: 2px 2px 0 0;
}

@media (min-width: 640px) {
	.reader-header__nav-link--active::after {
		bottom: -0.8125rem;
	}
}

.reader-header__nav-sep {
	width: 1px;
	height: 1rem;
	margin: 0 0.375rem;
	background: var(--ui-border);
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
</style>
