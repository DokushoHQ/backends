<script setup lang="ts">
defineProps<{
	/**
	 * The section title text
	 */
	title: string
}>()
</script>

<template>
	<div class="section-header">
		<span class="prefix">──</span>
		<span class="title">{{ title }}</span>
		<div class="rule" />
		<slot />
	</div>
</template>

<style scoped>
.section-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.prefix {
	color: var(--ui-text-dimmed);
	flex-shrink: 0;
}

.title {
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.1em;
	flex-shrink: 0;
}

.rule {
	flex: 1;
	height: 1px;
	background: linear-gradient(90deg, var(--ui-text-dimmed), transparent);
}
</style>
