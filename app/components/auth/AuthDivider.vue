<script setup lang="ts">
interface Props {
	label?: string
}

defineProps<Props>()
</script>

<template>
	<div class="auth-divider">
		<div class="auth-divider__line auth-divider__line--left" />
		<span
			v-if="label"
			class="auth-divider__label"
		>
			{{ label }}
		</span>
		<div class="auth-divider__line auth-divider__line--right" />
	</div>
</template>

<style scoped>
.auth-divider {
	display: flex;
	align-items: center;
	gap: 1rem;
	margin: 1.5rem 0;
}

.auth-divider__line {
	flex: 1;
	height: 1px;
	background: linear-gradient(
		90deg,
		transparent,
		var(--ui-border) 20%,
		var(--ui-border) 80%,
		transparent
	);
}

.auth-divider__line--left {
	background: linear-gradient(
		90deg,
		transparent,
		var(--ui-border)
	);
}

.auth-divider__line--right {
	background: linear-gradient(
		90deg,
		var(--ui-border),
		transparent
	);
}

.auth-divider__label {
	font-size: 0.8125rem;
	color: var(--ui-text-muted);
	white-space: nowrap;
	text-transform: lowercase;
}
</style>
