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
		<UButton
			variant="ghost"
			:icon="currentIcon"
			class="theme-toggle"
			:class="collapsed ? '' : 'justify-start w-full'"
		>
			<span v-if="!collapsed">{{ currentLabel }}</span>
		</UButton>
	</UDropdownMenu>
</template>

<style scoped>
.theme-toggle {
	color: var(--ui-text-muted);
}

.theme-toggle:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}
</style>
