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
			:class="{ collapsed }"
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
			:class="{ collapsed }"
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
			:class="{ collapsed }"
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
	padding: 0.75rem 0.5rem;
	border-top: 1px solid color-mix(in oklch, var(--ui-border) 50%, transparent);
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.user-link {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.5rem;
	border-radius: var(--radius-panel);
	text-decoration: none;
	transition: background 0.15s ease;
}

.user-link:hover {
	background: var(--ui-bg-muted);
}

.user-link.collapsed {
	justify-content: center;
}

.user-avatar {
	flex-shrink: 0;
	transition: box-shadow 0.15s ease;
}

.user-link:hover .user-avatar {
	box-shadow: 0 0 0 2px var(--ui-primary-soft);
}

.user-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	opacity: 1;
	transition: opacity 0.15s ease;
}

.user-info.collapsed-info {
	opacity: 0;
	width: 0;
	overflow: hidden;
}

.user-name {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.user-email {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.footer-btn {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.625rem;
	width: 100%;
	padding: 0.5rem 0.625rem;
	background: transparent;
	border: none;
	border-radius: var(--radius-panel);
	color: var(--ui-text-muted);
	font-size: var(--font-size-sm);
	cursor: pointer;
	transition:
		color 0.15s ease,
		background 0.15s ease;
}

.footer-btn:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

.footer-btn.collapsed {
	justify-content: center;
	padding: 0.5rem;
}

.footer-btn-icon {
	width: 1.125rem;
	height: 1.125rem;
	flex-shrink: 0;
}

.collapse-btn .collapse-icon {
	transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.collapse-btn.collapsed .collapse-icon {
	transform: rotate(180deg);
}

.footer-btn-label {
	opacity: 1;
	transition: opacity 0.15s ease;
	text-align: left;
}

.footer-btn-label.collapsed-label {
	opacity: 0;
	width: 0;
	overflow: hidden;
}

/* Tooltips for collapsed state */
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
