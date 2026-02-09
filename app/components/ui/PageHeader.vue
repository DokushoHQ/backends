<script setup lang="ts">
import type { BreadcrumbItem } from "./Breadcrumb.vue"

const props = withDefaults(defineProps<{
	/**
	 * Page title (for simple header mode)
	 */
	title?: string
	/**
	 * Page description (shown below title)
	 */
	description?: string
	/**
	 * Breadcrumb items (enables breadcrumb mode)
	 * When provided, title prop is ignored
	 */
	items?: BreadcrumbItem[]
	/**
	 * Back button destination
	 * When provided, shows a back button before the title/breadcrumb
	 */
	backTo?: string
	/**
	 * Show the mobile sidebar menu button.
	 * Set to false when used outside the dashboard layout.
	 */
	showMobileMenu?: boolean
}>(), {
	showMobileMenu: true,
})

function handleOpenMobile() {
	if (props.showMobileMenu) {
		useSidebar().openMobile()
	}
}
</script>

<template>
	<header class="page-header">
		<div class="header-left">
			<!-- Mobile sidebar toggle (dashboard layout only) -->
			<button
				v-if="showMobileMenu"
				class="mobile-menu-btn"
				aria-label="Open menu"
				@click="handleOpenMobile"
			>
				<UIcon
					name="i-lucide-menu"
					class="menu-icon"
				/>
			</button>

			<!-- Back button -->
			<NuxtLink
				v-if="backTo"
				:to="backTo"
				class="back-btn"
			>
				<UIcon
					name="i-lucide-chevron-left"
					class="back-icon"
				/>
			</NuxtLink>

			<!-- Breadcrumb mode -->
			<UiBreadcrumb
				v-if="items"
				:items="items"
			/>

			<!-- Title mode -->
			<div
				v-else
				class="title-block"
			>
				<h1 class="page-title">
					{{ title }}
				</h1>
				<!-- Custom description slot or prop -->
				<slot name="description">
					<p
						v-if="description"
						class="page-description"
					>
						{{ description }}
					</p>
				</slot>
			</div>
		</div>

		<div class="header-right">
			<slot name="right" />
		</div>
	</header>
</template>

<style scoped>
.page-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	min-height: 3.5rem;
	padding: 0.5rem 1rem;
	background: var(--ui-bg-elevated);
	border-bottom: 1px solid var(--ui-border);
	position: relative;
}

.page-header::after {
	content: "";
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 1px;
	background: linear-gradient(90deg, var(--ui-primary), transparent 50%);
}

.header-left {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	min-width: 0;
	height: 2.5rem;
}

.mobile-menu-btn {
	display: none;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	color: var(--ui-text-muted);
	cursor: pointer;
	flex-shrink: 0;
	transition: all 0.15s ease;
}

.mobile-menu-btn:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

.menu-icon {
	width: 1rem;
	height: 1rem;
}

@media (max-width: 767px) {
	.mobile-menu-btn {
		display: flex;
	}

	.header-left :deep(.breadcrumb) {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		max-width: 60%;
	}
}

.back-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	flex-shrink: 0;
	transition: all 0.15s ease;
}

.back-btn:hover {
	color: var(--ui-primary);
	border-color: var(--ui-primary);
	box-shadow: 0 0 8px color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

.back-icon {
	width: 1rem;
	height: 1rem;
}

.title-block {
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
	min-width: 0;
}

.page-title {
	font-size: var(--font-size-base);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.page-description {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.header-right {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex-shrink: 0;
}

/* Style slotted buttons consistently */
.header-right :deep(.btn),
.header-right :deep(button) {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	padding: 0.5rem 0.875rem;
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 0.25rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.header-right :deep(.btn-secondary) {
	color: var(--ui-text-muted);
	background: transparent;
	border: 1px solid var(--ui-border);
}

.header-right :deep(.btn-secondary:hover:not(:disabled)) {
	color: var(--ui-text);
	border-color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
}

.header-right :deep(.btn:disabled) {
	opacity: 0.5;
	cursor: not-allowed;
}

.header-right :deep(.btn-icon) {
	width: 0.875rem;
	height: 0.875rem;
}

.header-right :deep(.btn-label) {
	display: none;
}

@media (min-width: 640px) {
	.header-right :deep(.btn-label) {
		display: inline;
	}
}

.header-right :deep(.spin) {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
