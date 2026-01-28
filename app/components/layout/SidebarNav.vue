<script setup lang="ts">
export interface NavItem {
	label: string
	icon: string
	to: string
	active: boolean
}

defineProps<{
	items: NavItem[]
	collapsed: boolean
}>()

const emit = defineEmits<{
	navigate: []
}>()
</script>

<template>
	<nav class="sidebar-nav">
		<NuxtLink
			v-for="item in items"
			:key="item.to"
			:to="item.to"
			class="nav-item"
			:class="{ active: item.active }"
			@click="emit('navigate')"
		>
			<UIcon
				:name="item.icon"
				class="nav-icon"
			/>
			<span
				class="nav-label"
				:class="{ 'collapsed-label': collapsed }"
			>{{ item.label }}</span>
			<span
				v-if="collapsed"
				class="nav-tooltip"
			>{{ item.label }}</span>
		</NuxtLink>
	</nav>
</template>

<style scoped>
.sidebar-nav {
	flex: 1;
	padding: 0.5rem 0;
	overflow-y: auto;
	overflow-x: hidden;
}

.nav-item {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.625rem 0.875rem;
	margin: 0.125rem 0.5rem;
	color: var(--ui-text-muted);
	text-decoration: none;
	border-radius: var(--radius-panel);
	transition:
		color 0.15s ease,
		background 0.15s ease;
}

.nav-item:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

.nav-item.active {
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
}

.nav-item.active::before {
	content: "";
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	width: 3px;
	height: 1.25rem;
	background: var(--ui-primary);
	border-radius: 0 2px 2px 0;
	box-shadow: 2px 0 8px color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

.nav-icon {
	width: 1.25rem;
	height: 1.25rem;
	flex-shrink: 0;
}

.nav-label {
	font-size: var(--font-size-sm);
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	opacity: 1;
	transition: opacity 0.15s ease;
}

.nav-label.collapsed-label {
	opacity: 0;
	width: 0;
}

/* Tooltip for collapsed state */
.nav-tooltip {
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

.nav-item:hover .nav-tooltip {
	opacity: 1;
}
</style>
