<script setup lang="ts">
defineProps<{
	collapsed: boolean
	user: {
		name?: string | null
		email?: string | null
		image?: string | null
	} | null
	userInitials: string
	showCollapseToggle?: boolean
}>()

const emit = defineEmits<{
	signOut: []
	toggleCollapse: []
	navigate: []
}>()
</script>

<template>
	<div
		class="sidebar-footer"
		:class="{ collapsed }"
	>
		<NuxtLink
			to="/me"
			class="user-link"
			@click="emit('navigate')"
		>
			<UAvatar
				:src="user?.image ?? undefined"
				:text="userInitials"
				size="sm"
				class="user-avatar"
			/>
			<div
				class="user-info"
				:class="{ 'collapsed-info': collapsed }"
			>
				<span class="user-name">{{ user?.name || "User" }}</span>
				<span class="user-email">{{ user?.email }}</span>
			</div>
			<span
				v-if="collapsed"
				class="footer-tooltip"
			>Profile</span>
		</NuxtLink>

		<button
			class="footer-btn"
			@click="emit('signOut')"
		>
			<UIcon
				name="i-lucide-log-out"
				class="footer-btn-icon"
			/>
			<span
				class="footer-btn-label"
				:class="{ 'collapsed-label': collapsed }"
			>Sign out</span>
			<span
				v-if="collapsed"
				class="footer-tooltip"
			>Sign out</span>
		</button>

		<UiThemeToggle :collapsed="collapsed" />

		<button
			v-if="showCollapseToggle !== false"
			class="footer-btn collapse-btn"
			@click="emit('toggleCollapse')"
		>
			<UIcon
				:name="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
				class="footer-btn-icon collapse-icon"
			/>
			<span
				class="footer-btn-label"
				:class="{ 'collapsed-label': collapsed }"
			>Collapse</span>
			<span
				v-if="collapsed"
				class="footer-tooltip"
			>Expand</span>
		</button>
	</div>
</template>

<style scoped>
.sidebar-footer {
	padding: 0.5rem;
	border-top: 1px solid var(--ui-border);
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

/* Common styles for all footer items */
.user-link,
.footer-btn {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.625rem;
	width: 100%;
	height: 2.25rem;
	/* Match nav item: nav margin 0.5rem + nav padding 0.875rem - footer padding 0.5rem = 0.875rem */
	padding: 0 0.875rem;
	border-radius: var(--radius-panel);
	color: var(--ui-text-muted);
	font-size: var(--font-size-sm);
	cursor: pointer;
	transition: background 0.15s ease, color 0.15s ease;
}

/* Avatar is larger than icons, adjust padding to center it */
.user-link {
	/* Avatar is ~1.5rem, icons are ~1.125rem, difference/2 ≈ 0.1875rem less padding */
	padding-left: 0.625rem;
}

.user-link {
	text-decoration: none;
}

.footer-btn {
	background: transparent;
	border: none;
}

.user-link:hover,
.footer-btn:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

/* Avatar */
.user-avatar {
	flex-shrink: 0;
}

.user-link:hover .user-avatar {
	box-shadow: 0 0 0 2px var(--ui-primary-soft);
}

/* User info - absolutely positioned to not affect height */
.user-info {
	position: absolute;
	left: 2.75rem; /* padding 0.625rem + avatar ~1.5rem + gap 0.625rem */
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	flex-direction: column;
	line-height: 1.2;
	opacity: 1;
	transition: opacity 0.15s ease;
}

.user-info.collapsed-info {
	opacity: 0;
}

.user-name {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	white-space: nowrap;
}

.user-email {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	white-space: nowrap;
}

/* Icons */
.footer-btn-icon {
	width: 1.125rem;
	height: 1.125rem;
	flex-shrink: 0;
}

/* Labels */
.footer-btn-label {
	opacity: 1;
	white-space: nowrap;
	transition: opacity 0.15s ease;
}

.footer-btn-label.collapsed-label {
	opacity: 0;
	width: 0;
	overflow: hidden;
}

/* Tooltips */
.footer-tooltip {
	position: absolute;
	left: calc(100% + 0.5rem);
	top: 50%;
	transform: translateY(-50%);
	padding: 0.375rem 0.625rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-panel);
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text);
	white-space: nowrap;
	pointer-events: none;
	opacity: 0;
	transition: opacity 0.15s ease;
	box-shadow: 0 2px 8px color-mix(in oklch, var(--ui-text) 10%, transparent);
	z-index: 50;
}

.user-link:hover .footer-tooltip,
.footer-btn:hover .footer-tooltip {
	opacity: 1;
}
</style>
