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

// Get effective value for a language (override or default)
function getFallbackEffective(lang: string): boolean {
	const val = localFallbackOverrides.value[lang]
	return val !== undefined ? val : localFallbackDefault.value
}

function getUnsplitEffective(lang: string): boolean {
	const val = localUnsplitOverrides.value[lang]
	return val !== undefined ? val : localUnsplitDefault.value
}

// Cycle through override states: undefined -> true -> false -> undefined
function cycleFallbackOverride(lang: string) {
	const current = localFallbackOverrides.value[lang]
	if (current === undefined) {
		localFallbackOverrides.value[lang] = !localFallbackDefault.value
	}
	else {
		localFallbackOverrides.value[lang] = undefined
	}
}

function cycleUnsplitOverride(lang: string) {
	const current = localUnsplitOverrides.value[lang]
	if (current === undefined) {
		localUnsplitOverrides.value[lang] = !localUnsplitDefault.value
	}
	else {
		localUnsplitOverrides.value[lang] = undefined
	}
}

// Move source up in priority
async function moveSourceUp(sourceId: string) {
	const idx = sortedSources.value.findIndex(s => s.id === sourceId)
	if (idx <= 1) return

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
	<UiPanel
		v-if="sources.length > 1"
		header-muted
	>
		<template #header>
			<div class="header-row">
				<div class="header-title">
					<div class="led active" />
					<span>FALLBACK MATRIX</span>
				</div>
			</div>
		</template>
		<div class="content">
			<!-- Toggle defaults -->
			<div class="defaults">
				<div class="default-row">
					<span class="default-label">SECONDARY FALLBACK</span>
					<UiToggleSwitch
						v-model="localFallbackDefault"
						:disabled="isPending"
						show-label
					/>
				</div>
				<p class="default-desc">
					Fill missing chapters from secondary sources
				</p>

				<div class="default-row">
					<span class="default-label">PREFER UNSPLIT</span>
					<UiToggleSwitch
						v-model="localUnsplitDefault"
						:disabled="isPending"
						show-label
					/>
				</div>
				<p class="default-desc">
					Prefer whole chapters over split versions
				</p>
			</div>

			<!-- Matrix grid -->
			<div class="matrix-section">
				<span class="matrix-label">LANGUAGE OVERRIDES</span>
				<div class="matrix">
					<!-- Header row -->
					<div class="matrix-row matrix-header">
						<div class="matrix-cell matrix-corner" />
						<div
							v-for="lang in LANGUAGES"
							:key="lang"
							class="matrix-cell matrix-col-header"
						>
							{{ lang.toUpperCase().slice(0, 2) }}
						</div>
					</div>
					<!-- Fallback row -->
					<div class="matrix-row">
						<div
							class="matrix-cell matrix-row-header"
							title="Use secondary sources to fill missing chapters"
						>
							FALLBACK
						</div>
						<button
							v-for="lang in LANGUAGES"
							:key="`fb-${lang}`"
							class="matrix-cell matrix-btn"
							:class="{
								active: getFallbackEffective(lang),
								override: localFallbackOverrides[lang] !== undefined,
							}"
							:disabled="isPending"
							:title="`${lang}: ${localFallbackOverrides[lang] !== undefined ? 'Override' : 'Default'} - ${getFallbackEffective(lang) ? 'Enabled' : 'Disabled'}`"
							@click="cycleFallbackOverride(lang)"
						>
							<span
								class="led"
								:class="{ active: getFallbackEffective(lang) }"
							/>
						</button>
					</div>
					<!-- Unsplit row -->
					<div class="matrix-row">
						<div
							class="matrix-cell matrix-row-header"
							title="Prefer whole chapters over split versions"
						>
							UNSPLIT
						</div>
						<button
							v-for="lang in LANGUAGES"
							:key="`us-${lang}`"
							class="matrix-cell matrix-btn"
							:class="{
								active: getUnsplitEffective(lang),
								override: localUnsplitOverrides[lang] !== undefined,
							}"
							:disabled="isPending"
							:title="`${lang}: ${localUnsplitOverrides[lang] !== undefined ? 'Override' : 'Default'} - ${getUnsplitEffective(lang) ? 'Enabled' : 'Disabled'}`"
							@click="cycleUnsplitOverride(lang)"
						>
							<span
								class="led"
								:class="{ active: getUnsplitEffective(lang) }"
							/>
						</button>
					</div>
				</div>
				<p class="matrix-hint">
					Click to toggle override. Circle = uses default.
				</p>
			</div>

			<!-- Source Priority Queue -->
			<div class="priority-section">
				<span class="priority-label">SOURCE PRIORITY QUEUE</span>
				<div class="priority-list">
					<div
						v-for="(source, idx) in sortedSources"
						:key="source.id"
						class="priority-item"
					>
						<span class="priority-rank">{{ idx + 1 }}</span>
						<span
							class="priority-name"
							:title="source.source.name"
						>{{ source.source.name }}</span>
						<div class="priority-bar">
							<div
								class="priority-fill"
								:style="{ width: `${100 - (idx * 15)}%` }"
							/>
						</div>
						<div class="priority-actions">
							<span
								v-if="source.is_primary"
								class="primary-tag"
							>PRI</span>
							<template v-else>
								<button
									class="priority-btn"
									:disabled="isPending || idx <= 1"
									title="Move up"
									@click="moveSourceUp(source.id)"
								>
									<UIcon
										name="i-lucide-chevron-up"
										class="priority-icon"
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
										class="priority-icon"
									/>
								</button>
							</template>
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
					class="save-btn"
					:disabled="isPending"
					@click="savePreferences"
				>
					<UIcon
						v-if="isPending"
						name="i-lucide-loader-2"
						class="btn-icon spin"
					/>
					<span v-else>SAVE PREFERENCES</span>
				</button>
			</div>
		</div>
	</UiPanel>
</template>

<style scoped>
/* Header */
.header-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
}

.header-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text-muted);
	letter-spacing: 0.05em;
}

/* Content layout */
.content {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

/* Defaults section */
.defaults {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.default-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
}

.default-label {
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text);
	letter-spacing: 0.05em;
}

.default-desc {
	font-family: inherit;
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	margin: 0 0 0.75rem 0;
}

/* Matrix section */
.matrix-section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.matrix-label {
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	letter-spacing: 0.1em;
}

.matrix {
	display: flex;
	flex-direction: column;
	background: var(--ui-border);
	gap: 1px;
	border-radius: 0.25rem;
	overflow: hidden;
}

.matrix-row {
	display: flex;
	gap: 1px;
}

.matrix-cell {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0.375rem;
	background: var(--ui-bg-elevated);
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	min-width: 2rem;
	min-height: 1.75rem;
}

.matrix-corner {
	background: var(--ui-bg);
	min-width: 5rem;
}

.matrix-col-header,
.matrix-row-header {
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	letter-spacing: 0.05em;
}

.matrix-row-header {
	min-width: 5rem;
	cursor: help;
}

.matrix-btn {
	cursor: pointer;
	border: none;
	transition: all 0.15s ease;
}

.matrix-btn:hover:not(:disabled) {
	background: var(--ui-bg-muted);
}

.matrix-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.matrix-btn.override {
	background: color-mix(in oklch, var(--ui-primary) 10%, var(--ui-bg-elevated));
}

/* LED */
.led {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--ui-text-dimmed);
	transition: all 0.2s ease;
}

.led.active {
	background: var(--ui-primary);
	box-shadow: 0 0 4px color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

.matrix-hint {
	font-family: inherit;
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	margin: 0;
	font-style: italic;
}

/* Priority section */
.priority-section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.priority-label {
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	letter-spacing: 0.1em;
}

.priority-list {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
}

.priority-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.625rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
}

.priority-rank {
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	min-width: 1rem;
}

.priority-bar {
	flex: 1;
	height: 0.375rem;
	background: var(--ui-bg-muted);
	border-radius: 0.125rem;
	overflow: hidden;
}

.priority-fill {
	height: 100%;
	background: linear-gradient(90deg, var(--ui-primary), var(--ui-primary));
	border-radius: 0.125rem;
	transition: width 0.3s ease;
}

.priority-name {
	font-family: inherit;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	width: 10rem;
	flex-shrink: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.primary-tag {
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-primary);
	padding: 0.125rem 0.375rem;
	background: color-mix(in oklch, var(--ui-primary) 15%, transparent);
	border-radius: 0.125rem;
	letter-spacing: 0.05em;
}

.priority-actions {
	display: flex;
	gap: 0.25rem;
	width: 3.5rem;
	flex-shrink: 0;
	justify-content: flex-end;
}

.priority-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.25rem;
	height: 1.25rem;
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
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

.priority-icon {
	width: 0.75rem;
	height: 0.75rem;
	color: var(--ui-text-muted);
}

/* Save row */
.save-row {
	display: flex;
	justify-content: flex-end;
	padding-top: 0.5rem;
	border-top: 1px solid var(--ui-border);
}

.save-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	padding: 0.5rem 1rem;
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-bg);
	background: var(--ui-primary);
	border: 1px solid var(--ui-primary);
	border-radius: 0.25rem;
	cursor: pointer;
	letter-spacing: 0.05em;
	transition: all 0.15s ease;
}

.save-btn:hover:not(:disabled) {
	background: color-mix(in oklch, var(--ui-primary) 85%, white);
	box-shadow: 0 0 8px color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

.save-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.spin {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
