<script setup lang="ts">
const { currentTheme, availableThemes, setTheme, colorModePreference, setColorMode } = useTheme()

// Local computed to ensure reactivity after hydration
const selectedThemeId = computed(() => currentTheme.value)

const colorModeOptions = [
	{ label: "Light", value: "light", icon: "i-lucide-sun" },
	{ label: "Dark", value: "dark", icon: "i-lucide-moon" },
	{ label: "System", value: "system", icon: "i-lucide-monitor" },
]
</script>

<template>
	<div class="theme-selector">
		<!-- Theme Selection -->
		<div class="section">
			<h3 class="section-title">
				Theme
			</h3>
			<ClientOnly>
				<div class="theme-grid">
					<button
						v-for="theme in availableThemes"
						:key="theme.id"
						class="theme-card"
						:class="{ selected: selectedThemeId === theme.id }"
						@click="setTheme(theme.id)"
					>
						<div class="theme-preview">
							<div class="preview-light">
								<div class="preview-card" />
								<div class="preview-card" />
							</div>
							<div class="preview-dark">
								<div class="preview-card" />
								<div class="preview-card" />
							</div>
						</div>
						<div class="theme-info">
							<span class="theme-name">{{ theme.name }}</span>
							<span class="theme-description">{{ theme.description }}</span>
						</div>
						<div
							v-if="selectedThemeId === theme.id"
							class="selected-indicator"
						>
							<UIcon
								name="i-lucide-check"
								class="h-4 w-4"
							/>
						</div>
					</button>
				</div>
				<template #fallback>
					<div class="theme-grid">
						<div
							v-for="theme in availableThemes"
							:key="theme.id"
							class="theme-card"
						>
							<div class="theme-preview">
								<div class="preview-light">
									<div class="preview-card" />
									<div class="preview-card" />
								</div>
								<div class="preview-dark">
									<div class="preview-card" />
									<div class="preview-card" />
								</div>
							</div>
							<div class="theme-info">
								<span class="theme-name">{{ theme.name }}</span>
								<span class="theme-description">{{ theme.description }}</span>
							</div>
						</div>
					</div>
				</template>
			</ClientOnly>
		</div>

		<!-- Color Mode -->
		<div class="section">
			<h3 class="section-title">
				Appearance
			</h3>
			<div class="color-mode-options">
				<button
					v-for="option in colorModeOptions"
					:key="option.value"
					class="mode-option"
					:class="{ selected: colorModePreference === option.value }"
					@click="setColorMode(option.value as 'light' | 'dark' | 'system')"
				>
					<UIcon
						:name="option.icon"
						class="h-5 w-5"
					/>
					<span>{{ option.label }}</span>
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.theme-selector {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.section {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.section-title {
	font-size: 0.875rem;
	font-weight: 600;
	color: var(--ui-text);
}

/* Theme cards */
.theme-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 0.75rem;
}

.theme-card {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	padding: 0.75rem;
	background: var(--ui-bg-elevated);
	border: 2px solid var(--ui-border);
	border-radius: var(--radius-card);
	cursor: pointer;
	transition: all 0.15s ease;
	text-align: left;
}

.theme-card:hover {
	border-color: var(--ui-text-muted);
}

.theme-card.selected {
	border-color: var(--ui-primary);
	background: var(--ui-primary-soft);
}

.theme-preview {
	display: flex;
	gap: 0.25rem;
	height: 4rem;
	border-radius: 0.5rem;
	overflow: hidden;
}

.preview-light,
.preview-dark {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	padding: 0.375rem;
}

.preview-light {
	background: oklch(0.965 0.012 85);
}

.preview-dark {
	background: oklch(0.155 0.015 260);
}

.preview-card {
	flex: 1;
	border-radius: 0.25rem;
}

.preview-light .preview-card {
	background: oklch(0.993 0.005 85);
}

.preview-dark .preview-card {
	background: oklch(0.205 0.018 255);
}

.theme-info {
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
}

.theme-name {
	font-size: 0.875rem;
	font-weight: 600;
	color: var(--ui-text);
}

.theme-description {
	font-size: 0.75rem;
	color: var(--ui-text-muted);
}

.selected-indicator {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.5rem;
	height: 1.5rem;
	background: var(--ui-primary);
	color: white;
	border-radius: 50%;
}

/* Color mode options */
.color-mode-options {
	display: flex;
	gap: 0.5rem;
}

.mode-option {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	padding: 0.75rem;
	background: var(--ui-bg-elevated);
	border: 2px solid var(--ui-border);
	border-radius: 0.5rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--ui-text-muted);
	cursor: pointer;
	transition: all 0.15s ease;
}

.mode-option:hover {
	border-color: var(--ui-text-muted);
	color: var(--ui-text);
}

.mode-option.selected {
	border-color: var(--ui-primary);
	background: var(--ui-primary-soft);
	color: var(--ui-primary);
}
</style>
