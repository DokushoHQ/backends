<script setup lang="ts">
const { isAdmin } = await useAuth()
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
						class="size-5"
					/>
					<span class="reader-header__title">Tsundoku</span>
				</NuxtLink>
			</div>

			<div class="reader-header__right">
				<NuxtLink
					v-if="isAdmin"
					to="/dashboard"
					class="reader-header__link"
				>
					<UIcon
						name="i-lucide-layout-dashboard"
						class="size-4"
					/>
					<span class="reader-header__link-text">Dashboard</span>
				</NuxtLink>

				<NuxtLink
					to="/me"
					class="reader-header__link"
				>
					<UIcon
						name="i-lucide-user"
						class="size-4"
					/>
					<span class="reader-header__link-text">Profile</span>
				</NuxtLink>
			</div>
		</header>

		<main class="reader-main">
			<slot />
		</main>
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
	height: 3rem;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 1rem;
	border-bottom: 1px solid var(--ui-border);
	background: var(--ui-bg-elevated);
	flex-shrink: 0;
}

.reader-header__left {
	display: flex;
	align-items: center;
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

.reader-header__right {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.reader-header__link {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem 0.625rem;
	border-radius: 0.375rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	text-decoration: none;
	transition: color 0.15s ease, background-color 0.15s ease;
}

.reader-header__link:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

.reader-header__link-text {
	display: none;
}

@media (min-width: 640px) {
	.reader-header__link-text {
		display: inline;
	}
}

.reader-main {
	flex: 1;
	display: flex;
	flex-direction: column;
}
</style>
