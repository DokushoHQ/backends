<script setup lang="ts">
import type { NavItem } from "./SidebarNav.vue"

defineProps<{
	open: boolean
	items: NavItem[]
	user: {
		name?: string | null
		email?: string | null
		image?: string | null
	} | null
	userInitials: string
}>()

const emit = defineEmits<{
	close: []
	signOut: []
}>()

function handleNavClick() {
	emit("close")
}

function handleBackdropClick() {
	emit("close")
}
</script>

<template>
	<Teleport to="body">
		<Transition name="drawer">
			<div
				v-if="open"
				class="drawer-backdrop"
				@click.self="handleBackdropClick"
			>
				<div class="drawer-panel">
					<button
						class="drawer-close"
						aria-label="Close menu"
						@click="emit('close')"
					>
						<UIcon
							name="i-lucide-x"
							class="size-5"
						/>
					</button>

					<div class="drawer-header">
						<img
							src="/favicon.png"
							alt="Tsundoku"
							class="drawer-logo"
						>
						<span class="drawer-title">Tsundoku</span>
					</div>

					<nav class="drawer-nav">
						<LayoutSidebarNav
							:items="items"
							:collapsed="false"
							@navigate="handleNavClick"
						/>
					</nav>

					<div class="drawer-footer">
						<LayoutSidebarFooter
							:collapsed="false"
							:user="user"
							:user-initials="userInitials"
							:show-collapse-toggle="false"
							@sign-out="emit('signOut')"
							@navigate="handleNavClick"
						/>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.drawer-backdrop {
	position: fixed;
	inset: 0;
	z-index: 9998;
	background: color-mix(in oklch, var(--ui-bg) 60%, transparent);
	backdrop-filter: blur(4px);
	overflow: hidden;
}

.drawer-panel {
	position: fixed;
	top: 0;
	left: 0;
	bottom: 0;
	width: var(--sidebar-mobile-width);
	max-width: calc(100vw - 3rem);
	background: var(--ui-bg-elevated);
	z-index: 9999;
	display: flex;
	flex-direction: column;
	box-shadow: 4px 0 24px -4px color-mix(in oklch, var(--ui-text) 15%, transparent);
	overflow-y: auto;
}

.drawer-close {
	position: absolute;
	top: 0.75rem;
	right: 0.75rem;
	width: 2rem;
	height: 2rem;
	display: flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
	border-radius: var(--radius-panel);
	color: var(--ui-text-muted);
	cursor: pointer;
	transition:
		color 0.15s ease,
		background 0.15s ease;
}

.drawer-close:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

.drawer-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.5rem 1rem;
	border-bottom: 1px solid var(--ui-border);
	min-height: 3.5rem;
}

.drawer-logo {
	width: 1.75rem;
	height: 1.75rem;
	border-radius: 0.25rem;
	flex-shrink: 0;
}

.drawer-title {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
}

.drawer-nav {
	flex: 1;
	overflow-y: auto;
	overflow-x: hidden;
}

.drawer-footer {
	border-top: 1px solid var(--ui-border);
}

/* Transition animations */
.drawer-enter-active {
	transition: opacity 0.25s ease;
}

.drawer-leave-active {
	transition: opacity 0.2s ease;
}

.drawer-enter-from,
.drawer-leave-to {
	opacity: 0;
}

.drawer-enter-active .drawer-panel {
	transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.drawer-leave-active .drawer-panel {
	transition: transform 0.2s ease;
}

.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
	transform: translateX(-100%);
}
</style>
