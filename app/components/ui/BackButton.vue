<script setup lang="ts">
defineProps<{
	to: string
	label?: string
}>()
</script>

<template>
	<NuxtLink
		:to="to"
		class="back-button"
	>
		<UIcon
			name="i-lucide-arrow-left"
			class="h-4 w-4 shrink-0"
		/>
		<span class="label">{{ label || 'Back' }}</span>
	</NuxtLink>
</template>

<style scoped>
.back-button {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem;
	font-size: 0.8125rem;
	font-weight: 500;
	color: var(--ui-text-muted);
	border-radius: 0.375rem;
	transition: all 0.15s ease;
}

.back-button:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

.label {
	display: none;
}

@media (min-width: 640px) {
	.back-button {
		padding: 0.375rem 0.75rem;
	}

	.label {
		display: inline;
	}
}
</style>
