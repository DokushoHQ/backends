<script setup lang="ts">
const props = withDefaults(defineProps<{
	modelValue: boolean
	disabled?: boolean
	showLabel?: boolean
	size?: "sm" | "md"
}>(), {
	disabled: false,
	showLabel: false,
	size: "md",
})

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
}>()

function toggle() {
	if (!props.disabled) {
		emit("update:modelValue", !props.modelValue)
	}
}
</script>

<template>
	<button
		class="toggle"
		:class="{ on: modelValue, sm: size === 'sm' }"
		:disabled="disabled"
		type="button"
		@click="toggle"
	>
		<span class="toggle-track">
			<span class="toggle-thumb" />
		</span>
		<span
			v-if="showLabel"
			class="toggle-text"
		>{{ modelValue ? 'ON' : 'OFF' }}</span>
	</button>
</template>

<style scoped>
.toggle {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0;
	background: none;
	border: none;
	cursor: pointer;
}

.toggle:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.toggle-track {
	position: relative;
	width: 2rem;
	height: 1rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	transition: all 0.2s ease;
}

.toggle.on .toggle-track {
	background: color-mix(in oklch, var(--ui-primary) 20%, transparent);
	border-color: var(--ui-primary);
}

.toggle-thumb {
	position: absolute;
	top: 1px;
	left: 1px;
	width: 0.75rem;
	height: 0.75rem;
	background: var(--ui-text-dimmed);
	border-radius: 50%;
	transition: all 0.2s ease;
}

.toggle.on .toggle-thumb {
	left: calc(100% - 0.875rem);
	background: var(--ui-primary);
	box-shadow: 0 0 4px color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

.toggle-text {
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	min-width: 1.5rem;
}

.toggle.on .toggle-text {
	color: var(--ui-primary);
}

/* Small size variant */
.toggle.sm .toggle-track {
	width: 1.625rem;
	height: 0.875rem;
	border-radius: 0.4375rem;
}

.toggle.sm .toggle-thumb {
	width: 0.625rem;
	height: 0.625rem;
}

.toggle.sm.on .toggle-thumb {
	left: calc(100% - 0.75rem);
}

.toggle.sm .toggle-text {
	font-size: 0.625rem;
	min-width: 1.25rem;
}
</style>
