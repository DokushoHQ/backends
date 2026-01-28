<script setup lang="ts">
defineProps<{
	/**
	 * Section title displayed above the panel with decorative rule
	 */
	title?: string
	/**
	 * Simple panel header title (alternative to header slot)
	 */
	headerTitle?: string
	/**
	 * Use muted background for header
	 */
	headerMuted?: boolean
	/**
	 * Compact mode reduces padding
	 */
	compact?: boolean
}>()
</script>

<template>
	<section class="panel-section">
		<!-- Decorative Section Header -->
		<UiSectionHeader
			v-if="title"
			:title="title"
		/>

		<!-- Panel Container -->
		<div
			class="panel"
			:class="{ compact }"
		>
			<!-- Optional Header Area (for stats, tabs, etc.) -->
			<div
				v-if="headerTitle || $slots.header"
				class="panel-header"
				:class="{ muted: headerMuted }"
			>
				<slot name="header">
					<span class="panel-title">{{ headerTitle }}</span>
				</slot>
			</div>

			<!-- Optional Tabs Area (full-width, no padding) -->
			<div
				v-if="$slots.tabs"
				class="panel-tabs"
			>
				<slot name="tabs" />
			</div>

			<!-- Panel Body -->
			<div class="panel-body">
				<slot />
			</div>
		</div>
	</section>
</template>

<style scoped>
.panel-section {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	height: 100%;
}

/* Panel Container */
.panel {
	display: flex;
	flex-direction: column;
	flex: 1;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-panel);
	overflow: hidden;
}

/* Panel Header */
.panel-header {
	padding: 0.75rem 1rem;
	border-bottom: 1px solid var(--ui-border);
}

.panel-header.muted {
	padding: 0.625rem 0.875rem;
	background: var(--ui-bg-muted);
}

.panel-header:empty {
	display: none;
}

/* Panel Tabs */
.panel-tabs {
	background: var(--ui-bg);
	border-bottom: 1px solid var(--ui-border);
}

.panel-tabs:empty {
	display: none;
}

.panel-title {
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text-muted);
	letter-spacing: 0.1em;
}

/* Panel Body */
.panel-body {
	flex: 1;
	padding: 1rem;
}

.panel.compact .panel-body {
	padding: 0.625rem;
}
</style>
