<script setup lang="ts">
interface SerieSource {
	id: string
	external_id: string
	is_primary: boolean
	priority: number
	source: { id: string, name: string }
}

const props = defineProps<{
	serieId: string
	sources: SerieSource[]
}>()

const emit = defineEmits<{
	updated: []
}>()

const toast = useToast()
const isPending = ref(false)
const languageOverridesExpanded = ref(false)
const unsplitOverridesExpanded = ref(false)

// Languages available in the system
const LANGUAGES = ["En", "Fr", "Jp", "JpRo", "Ko", "KoRo", "ZhHk", "Zh"] as const

// Fetch chapter preferences
const { data: preferenceData, refresh: refreshPreference } = await useFetch(`/api/v1/serie/${props.serieId}/chapter-preference`)

// Local state for editing - Secondary Fallback
const localFallbackDefault = ref(preferenceData.value?.preference?.use_secondary_fallback_default ?? true)
const localFallbackOverrides = ref<Record<string, boolean | undefined>>({
	...preferenceData.value?.preference?.use_secondary_fallback,
})

// Local state for editing - Prefer Unsplit
const localUnsplitDefault = ref(preferenceData.value?.preference?.prefer_unsplit_default ?? true)
const localUnsplitOverrides = ref<Record<string, boolean | undefined>>({
	...preferenceData.value?.preference?.prefer_unsplit,
})

// Watch for preference data changes
watch(preferenceData, (newData) => {
	if (newData?.preference) {
		localFallbackDefault.value = newData.preference.use_secondary_fallback_default
		localFallbackOverrides.value = { ...newData.preference.use_secondary_fallback }
		localUnsplitDefault.value = newData.preference.prefer_unsplit_default
		localUnsplitOverrides.value = { ...newData.preference.prefer_unsplit }
	}
})

// Sorted sources for priority display (primary first, then by priority)
const sortedSources = computed(() => {
	return [...props.sources].sort((a, b) => {
		if (a.is_primary) return -1
		if (b.is_primary) return 1
		return a.priority - b.priority
	})
})

// Check if there are any changes to save
const hasPreferenceChanges = computed(() => {
	const original = preferenceData.value?.preference
	if (!original) {
		return localFallbackDefault.value !== true || localUnsplitDefault.value !== true
	}

	if (localFallbackDefault.value !== original.use_secondary_fallback_default) return true
	if (localUnsplitDefault.value !== original.prefer_unsplit_default) return true

	const origFallbackOverrides = original.use_secondary_fallback as Record<string, boolean | undefined>
	for (const lang of LANGUAGES) {
		if (origFallbackOverrides[lang] !== localFallbackOverrides.value[lang]) return true
	}

	const origUnsplitOverrides = original.prefer_unsplit as Record<string, boolean | undefined>
	for (const lang of LANGUAGES) {
		if (origUnsplitOverrides[lang] !== localUnsplitOverrides.value[lang]) return true
	}

	return false
})

// Save preferences
async function savePreferences() {
	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/chapter-preference`, {
			method: "PATCH",
			body: {
				use_secondary_fallback_default: localFallbackDefault.value,
				use_secondary_fallback: Object.fromEntries(
					Object.entries(localFallbackOverrides.value).filter(([_, v]) => v !== undefined),
				),
				prefer_unsplit_default: localUnsplitDefault.value,
				prefer_unsplit: Object.fromEntries(
					Object.entries(localUnsplitOverrides.value).filter(([_, v]) => v !== undefined),
				),
			},
		})
		await refreshPreference()
		toast.add({
			title: "Preferences Saved",
			description: "Chapter preferences have been updated",
			color: "success",
		})
		emit("updated")
	}
	catch (e: unknown) {
		console.error("Failed to save preferences:", e)
		toast.add({
			title: "Save Failed",
			description: "Could not save chapter preferences",
			color: "error",
		})
	}
	finally {
		isPending.value = false
	}
}

// Get override status text for a language (for fallback)
function getFallbackOverrideText(lang: string) {
	const val = localFallbackOverrides.value[lang]
	if (val === undefined) return "Use default"
	return val ? "Enabled" : "Disabled"
}

// Cycle through fallback override states: undefined -> true -> false -> undefined
function cycleFallbackOverride(lang: string) {
	const current = localFallbackOverrides.value[lang]
	if (current === undefined) {
		localFallbackOverrides.value[lang] = true
	}
	else if (current === true) {
		localFallbackOverrides.value[lang] = false
	}
	else {
		localFallbackOverrides.value[lang] = undefined
	}
}

// Get override status text for a language (for unsplit)
function getUnsplitOverrideText(lang: string) {
	const val = localUnsplitOverrides.value[lang]
	if (val === undefined) return "Use default"
	return val ? "Enabled" : "Disabled"
}

// Cycle through unsplit override states: undefined -> true -> false -> undefined
function cycleUnsplitOverride(lang: string) {
	const current = localUnsplitOverrides.value[lang]
	if (current === undefined) {
		localUnsplitOverrides.value[lang] = true
	}
	else if (current === true) {
		localUnsplitOverrides.value[lang] = false
	}
	else {
		localUnsplitOverrides.value[lang] = undefined
	}
}

// Move source up in priority
async function moveSourceUp(sourceId: string) {
	const idx = sortedSources.value.findIndex(s => s.id === sourceId)
	if (idx <= 1) return // Can't move primary or first non-primary

	const source = sortedSources.value[idx]
	const aboveSource = sortedSources.value[idx - 1]
	if (!source || !aboveSource || aboveSource.is_primary) return

	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/sources`, {
			method: "PATCH",
			body: {
				priorities: {
					[source.id]: aboveSource.priority,
					[aboveSource.id]: source.priority,
				},
			},
		})
		toast.add({
			title: "Priority Updated",
			description: "Source priority has been updated",
			color: "success",
		})
		emit("updated")
	}
	catch (e: unknown) {
		console.error("Failed to update priority:", e)
		toast.add({
			title: "Update Failed",
			description: "Could not update source priority",
			color: "error",
		})
	}
	finally {
		isPending.value = false
	}
}

// Move source down in priority
async function moveSourceDown(sourceId: string) {
	const idx = sortedSources.value.findIndex(s => s.id === sourceId)
	if (idx === -1 || idx >= sortedSources.value.length - 1) return

	const source = sortedSources.value[idx]
	const belowSource = sortedSources.value[idx + 1]
	if (!source || !belowSource || source.is_primary) return

	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/sources`, {
			method: "PATCH",
			body: {
				priorities: {
					[source.id]: belowSource.priority,
					[belowSource.id]: source.priority,
				},
			},
		})
		toast.add({
			title: "Priority Updated",
			description: "Source priority has been updated",
			color: "success",
		})
		emit("updated")
	}
	catch (e: unknown) {
		console.error("Failed to update priority:", e)
		toast.add({
			title: "Update Failed",
			description: "Could not update source priority",
			color: "error",
		})
	}
	finally {
		isPending.value = false
	}
}
</script>

<template>
	<section
		v-if="sources.length > 1"
		class="edit-section"
	>
		<div class="section-header">
			<div class="section-title">
				<div class="section-icon">
					<UIcon
						name="i-lucide-layers"
						class="icon"
					/>
				</div>
				<div>
					<h2>Chapter Preferences</h2>
					<p>Configure how secondary sources fill missing chapters</p>
				</div>
			</div>
		</div>

		<div class="section-body">
			<div class="settings-grid">
				<!-- Left Column: Fallback Settings -->
				<div class="settings-column">
					<!-- Secondary Fallback Toggle -->
					<div class="setting-block">
						<div class="setting-header">
							<h3>Secondary Fallback</h3>
							<button
								class="toggle-button"
								:class="{ active: localFallbackDefault }"
								:disabled="isPending"
								@click="localFallbackDefault = !localFallbackDefault"
							>
								<span class="toggle-track">
									<span class="toggle-thumb" />
								</span>
								<span class="toggle-label">{{ localFallbackDefault ? 'On' : 'Off' }}</span>
							</button>
						</div>
						<p class="setting-description">
							When primary source is missing a chapter, use secondary sources to fill the gap
						</p>
					</div>

					<!-- Language Overrides for Secondary Fallback -->
					<div class="setting-block">
						<button
							class="expand-header"
							@click="languageOverridesExpanded = !languageOverridesExpanded"
						>
							<span class="expand-label">Language Overrides</span>
							<UIcon
								:name="languageOverridesExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
								class="expand-icon"
							/>
						</button>
						<p class="setting-description">
							Override the secondary fallback setting for specific languages. Click to cycle: Use default → Enabled → Disabled
						</p>

						<div
							v-if="languageOverridesExpanded"
							class="overrides-list"
						>
							<div
								v-for="lang in LANGUAGES"
								:key="lang"
								class="override-item"
							>
								<span class="override-lang">{{ lang }}</span>
								<button
									class="override-toggle"
									:class="{
										'use-default': localFallbackOverrides[lang] === undefined,
										'enabled': localFallbackOverrides[lang] === true,
										'disabled': localFallbackOverrides[lang] === false,
									}"
									:disabled="isPending"
									@click="cycleFallbackOverride(lang)"
								>
									{{ getFallbackOverrideText(lang) }}
								</button>
							</div>
						</div>
					</div>

					<!-- Prefer Unsplit Toggle -->
					<div class="setting-block">
						<div class="setting-header">
							<h3>Prefer Unsplit Chapters</h3>
							<button
								class="toggle-button"
								:class="{ active: localUnsplitDefault }"
								:disabled="isPending"
								@click="localUnsplitDefault = !localUnsplitDefault"
							>
								<span class="toggle-track">
									<span class="toggle-thumb" />
								</span>
								<span class="toggle-label">{{ localUnsplitDefault ? 'On' : 'Off' }}</span>
							</button>
						</div>
						<p class="setting-description">
							When enabled, whole chapters (Ch 1) take priority over split versions (Ch 1.1, 1.2, 1.3) even from secondary sources
						</p>
					</div>

					<!-- Language Overrides for Prefer Unsplit -->
					<div class="setting-block">
						<button
							class="expand-header"
							@click="unsplitOverridesExpanded = !unsplitOverridesExpanded"
						>
							<span class="expand-label">Unsplit Language Overrides</span>
							<UIcon
								:name="unsplitOverridesExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
								class="expand-icon"
							/>
						</button>
						<p class="setting-description">
							Override the prefer unsplit setting for specific languages. Click to cycle: Use default → Enabled → Disabled
						</p>

						<div
							v-if="unsplitOverridesExpanded"
							class="overrides-list"
						>
							<div
								v-for="lang in LANGUAGES"
								:key="lang"
								class="override-item"
							>
								<span class="override-lang">{{ lang }}</span>
								<button
									class="override-toggle"
									:class="{
										'use-default': localUnsplitOverrides[lang] === undefined,
										'enabled': localUnsplitOverrides[lang] === true,
										'disabled': localUnsplitOverrides[lang] === false,
									}"
									:disabled="isPending"
									@click="cycleUnsplitOverride(lang)"
								>
									{{ getUnsplitOverrideText(lang) }}
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Right Column: Source Priority -->
				<div class="settings-column">
					<div class="setting-block">
						<h3>Source Priority</h3>
						<p class="setting-description">
							Order determines which secondary source is preferred when filling gaps
						</p>

						<div class="sources-list">
							<div
								v-for="(source, idx) in sortedSources"
								:key="source.id"
								class="source-row"
							>
								<span class="source-rank">{{ idx + 1 }}.</span>
								<span class="source-name">{{ source.source.name }}</span>
								<span
									v-if="source.is_primary"
									class="primary-badge"
								>Primary</span>
								<div
									v-else
									class="priority-controls"
								>
									<button
										class="priority-btn"
										:disabled="isPending || idx <= 1"
										title="Move up"
										@click="moveSourceUp(source.id)"
									>
										<UIcon
											name="i-lucide-chevron-up"
											class="btn-icon"
										/>
									</button>
									<button
										class="priority-btn"
										:disabled="isPending || idx >= sortedSources.length - 1"
										title="Move down"
										@click="moveSourceDown(source.id)"
									>
										<UIcon
											name="i-lucide-chevron-down"
											class="btn-icon"
										/>
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Save button -->
			<div
				v-if="hasPreferenceChanges"
				class="save-row"
			>
				<button
					class="save-button"
					:disabled="isPending"
					@click="savePreferences"
				>
					<UIcon
						v-if="isPending"
						name="i-lucide-loader-2"
						class="spinner"
					/>
					<template v-else>
						Save Preferences
					</template>
				</button>
			</div>
		</div>
	</section>
</template>

<style scoped>
.edit-section {
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.75rem;
	overflow: hidden;
}

/* Section header */
.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem 1.25rem;
	border-bottom: 1px solid var(--ui-border-muted);
}

.section-title {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.section-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
	background: color-mix(in oklch, var(--color-purple) 15%, transparent);
	border-radius: 0.375rem;
}

.section-icon .icon {
	width: 1rem;
	height: 1rem;
	color: var(--color-purple);
}

.section-title h2 {
	font-size: var(--font-size-base);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
}

.section-title p {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin: 0;
}

/* Section body */
.section-body {
	padding: 1.25rem;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

/* Settings grid - two columns on large screens */
.settings-grid {
	display: grid;
	gap: 1.5rem;
}

@media (min-width: 768px) {
	.settings-grid {
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}
}

.settings-column {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

/* Setting blocks */
.setting-block {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.setting-block h3 {
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
}

.setting-description {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin: 0;
	line-height: 1.5;
}

.setting-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
}

/* Toggle button */
.toggle-button {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0;
	background: none;
	border: none;
	cursor: pointer;
}

.toggle-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.toggle-track {
	position: relative;
	width: 2.5rem;
	height: 1.375rem;
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 2rem;
	transition: all 0.2s ease;
}

.toggle-button.active .toggle-track {
	background: var(--ui-primary);
	border-color: var(--ui-primary);
}

.toggle-thumb {
	position: absolute;
	top: 0.125rem;
	left: 0.125rem;
	width: 1rem;
	height: 1rem;
	background: white;
	border-radius: 50%;
	transition: transform 0.2s ease;
}

.toggle-button.active .toggle-thumb {
	transform: translateX(1.125rem);
}

.toggle-label {
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
}

.toggle-button.active .toggle-label {
	color: var(--ui-primary);
}

/* Expand header */
.expand-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 0.625rem 0.875rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.expand-header:hover {
	background: var(--ui-border);
}

.expand-label {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.expand-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
}

/* Overrides list */
.overrides-list {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
	padding-top: 0.5rem;
}

.override-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0.5rem 0.75rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border-muted);
	border-radius: 0.375rem;
}

.override-lang {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.override-toggle {
	padding: 0.25rem 0.625rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border: 1px solid var(--ui-border);
	border-radius: 2rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.override-toggle.use-default {
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
}

.override-toggle.enabled {
	color: var(--ui-success);
	background: var(--ui-success-soft);
	border-color: transparent;
}

.override-toggle.disabled {
	color: var(--ui-error);
	background: var(--ui-error-soft);
	border-color: transparent;
}

.override-toggle:hover:not(:disabled) {
	filter: brightness(0.95);
}

.override-toggle:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

/* Sources list */
.sources-list {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
	margin-top: 0.5rem;
}

.source-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.625rem 0.875rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border-muted);
	border-radius: 0.5rem;
}

.source-rank {
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text-muted);
	min-width: 1.5rem;
}

.source-name {
	flex: 1;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.primary-badge {
	display: inline-flex;
	align-items: center;
	padding: 0.125rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
	border-radius: 0.25rem;
}

.priority-controls {
	display: flex;
	gap: 0.25rem;
}

.priority-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 0.375rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.priority-btn:hover:not(:disabled) {
	background: var(--ui-border);
}

.priority-btn:disabled {
	opacity: 0.3;
	cursor: not-allowed;
}

.btn-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
}

/* Save row */
.save-row {
	display: flex;
	justify-content: flex-end;
	padding-top: 0.5rem;
	border-top: 1px solid var(--ui-border-muted);
}

.save-button {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	min-width: 8rem;
	padding: 0.625rem 1.25rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-bg);
	background: var(--ui-primary);
	border: none;
	border-radius: 0.5rem;
	cursor: pointer;
	transition: opacity 0.15s ease;
}

.save-button:hover:not(:disabled) {
	opacity: 0.9;
}

.save-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.spinner {
	width: 1rem;
	height: 1rem;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
