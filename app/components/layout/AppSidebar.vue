<script setup lang="ts">
import type { NavItem } from "./SidebarNav.vue"

defineProps<{
	items: NavItem[]
	user: {
		name?: string | null
		email?: string | null
		image?: string | null
	} | null
	userInitials: string
}>()

const emit = defineEmits<{
	signOut: []
}>()

const { collapsed, mobileOpen, toggle, closeMobile } = useSidebar()
</script>

<template>
	<!-- Desktop sidebar -->
	<aside
		class="sidebar"
		:class="{ collapsed }"
	>
		<div class="sidebar-header">
			<img
				src="/favicon.png"
				alt="Tsundoku"
				class="sidebar-logo"
			>
			<span
				class="sidebar-title"
				:class="{ 'collapsed-title': collapsed }"
			>Tsundoku</span>
		</div>

		<LayoutSidebarNav
			:items="items"
			:collapsed="collapsed"
		/>

		<LayoutSidebarFooter
			:collapsed="collapsed"
			:user="user"
			:user-initials="userInitials"
			@sign-out="emit('signOut')"
			@toggle-collapse="toggle"
		/>
	</aside>

	<!-- Mobile drawer -->
	<LayoutSidebarDrawer
		:open="mobileOpen"
		:items="items"
		:user="user"
		:user-initials="userInitials"
		@close="closeMobile"
		@sign-out="emit('signOut')"
	/>
</template>

<style scoped>
.sidebar {
	position: fixed;
	top: 0;
	left: 0;
	height: 100vh;
	width: var(--sidebar-width);
	background: var(--ui-bg-elevated);
	border-right: 1px solid var(--ui-border);
	display: flex;
	flex-direction: column;
	z-index: 40;
	transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	box-shadow:
		1px 0 0 0 var(--ui-border),
		4px 0 16px -4px color-mix(in oklch, var(--ui-text) 5%, transparent);
}

.sidebar.collapsed,
:global(html.sidebar-collapsed) .sidebar {
	width: var(--sidebar-collapsed-width);
}

@media (max-width: 767px) {
	.sidebar {
		display: none;
	}
}

.sidebar-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	/* Logo is 1.75rem vs nav icons 1.25rem, reduce padding by 0.25rem to center */
	padding: 0.5rem 0.5rem 0.5rem 1.125rem;
	border-bottom: 1px solid var(--ui-border);
	min-height: 3.5rem;
}

.sidebar-logo {
	width: 1.75rem;
	height: 1.75rem;
	border-radius: 0.25rem;
	flex-shrink: 0;
	transition: transform 0.2s ease;
}

.sidebar-header:hover .sidebar-logo {
	transform: scale(1.08);
}

.sidebar-title {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
	white-space: nowrap;
	overflow: hidden;
	opacity: 1;
	transition: opacity 0.15s ease;
}

.sidebar-title.collapsed-title {
	opacity: 0;
	width: 0;
}
</style>
