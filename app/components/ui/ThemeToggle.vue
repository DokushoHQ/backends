<script setup lang="ts">
defineProps<{
	collapsed?: boolean
}>()

const { isDark, colorModePreference, setColorMode } = useTheme()

const items = [
	[
		{
			label: "Light",
			icon: "i-lucide-sun",
			onSelect: () => setColorMode("light"),
		},
		{
			label: "Dark",
			icon: "i-lucide-moon",
			onSelect: () => setColorMode("dark"),
		},
		{
			label: "System",
			icon: "i-lucide-monitor",
			onSelect: () => setColorMode("system"),
		},
	],
]

const currentIcon = computed(() => {
	if (colorModePreference.value === "system") return "i-lucide-monitor"
	return isDark.value ? "i-lucide-moon" : "i-lucide-sun"
})

const currentLabel = computed(() => {
	if (colorModePreference.value === "system") return "System"
	return isDark.value ? "Dark" : "Light"
})
</script>

<template>
	<UDropdownMenu :items="items">
		<button class="theme-btn">
			<UIcon
				:name="currentIcon"
				class="theme-btn-icon"
			/>
			<span
				class="theme-btn-label"
				:class="{ 'collapsed-label': collapsed }"
			>{{ currentLabel }}</span>
		</button>
	</UDropdownMenu>
</template>

<style scoped>
.theme-btn {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.625rem;
	width: 100%;
	height: 2.25rem;
	padding: 0 0.875rem;
	background: transparent;
	border: none;
	border-radius: var(--radius-panel);
	color: var(--ui-text-muted);
	font-size: var(--font-size-sm);
	cursor: pointer;
	transition: color 0.15s ease, background 0.15s ease;
}

.theme-btn:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

.theme-btn-icon {
	width: 1.125rem;
	height: 1.125rem;
	flex-shrink: 0;
}

.theme-btn-label {
	opacity: 1;
	transition: opacity 0.15s ease;
}

.theme-btn-label.collapsed-label {
	opacity: 0;
	width: 0;
	overflow: hidden;
}
</style>
