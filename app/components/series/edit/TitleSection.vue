<script setup lang="ts">
import type { UISerie, UIMultiLanguage } from "#shared/ui/type/serie"

const props = defineProps<{
	serie: UISerie
}>()

const emit = defineEmits<{
	updated: []
}>()

const isPending = ref(false)
const customTitle = ref(props.serie.title)

// Watch for serie changes to update local state
watch(() => props.serie.title, (newTitle) => {
	customTitle.value = newTitle
})

const isLocked = computed(() => (props.serie.locked_fields ?? []).includes("title"))

// Collect all titles from all sources
const allTitles = computed(() => {
	const titles: { lang: string, value: string, isAlternate: boolean, sourceName: string }[] = []

	for (const source of props.serie.sources) {
		const sourceTitle = source.title as UIMultiLanguage | null
		const alternateTitles = source.alternates_titles as UIMultiLanguage | null

		if (sourceTitle) {
			for (const [lang, values] of Object.entries(sourceTitle)) {
				for (const value of values) {
					if (!titles.some(t => t.value === value)) {
						titles.push({ lang, value, isAlternate: false, sourceName: source.source.name })
					}
				}
			}
		}
		if (alternateTitles) {
			for (const [lang, values] of Object.entries(alternateTitles)) {
				for (const value of values) {
					if (!titles.some(t => t.value === value)) {
						titles.push({ lang, value, isAlternate: true, sourceName: source.source.name })
					}
				}
			}
		}
	}

	return titles
})

async function toggleLock() {
	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serie.id}/field`, {
			method: "POST",
			body: { field: "title", action: isLocked.value ? "unlock" : "lock" },
		})
		emit("updated")
	}
	catch (e: unknown) {
		console.error("Failed to toggle lock:", e)
	}
	finally {
		isPending.value = false
	}
}

async function setTitle(value: string) {
	if (!value) return
	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serie.id}/field`, {
			method: "POST",
			body: { field: "title", action: "update", value },
		})
		emit("updated")
	}
	catch (e: unknown) {
		console.error("Failed to update title:", e)
	}
	finally {
		isPending.value = false
	}
}
</script>

<template>
	<section class="edit-section">
		<div class="section-header">
			<div class="section-title">
				<div class="section-icon">
					<UIcon
						name="i-lucide-type"
						class="icon"
					/>
				</div>
				<div>
					<h2>Title</h2>
					<p>The display name for this series</p>
				</div>
			</div>
			<button
				class="lock-toggle"
				:class="{ locked: isLocked }"
				:disabled="isPending"
				@click="toggleLock"
			>
				<UIcon
					:name="isLocked ? 'i-lucide-lock' : 'i-lucide-lock-open'"
					class="lock-icon"
				/>
				<span>{{ isLocked ? "Locked" : "Auto" }}</span>
			</button>
		</div>

		<div class="section-body">
			<!-- Current value -->
			<div class="current-value">
				<span class="label">Current</span>
				<span class="value">{{ serie.title }}</span>
			</div>

			<!-- Edit controls (only when locked) -->
			<template v-if="isLocked">
				<!-- Available titles -->
				<div
					v-if="allTitles.length > 0"
					class="titles-grid"
				>
					<span class="label">Available from sources</span>
					<div class="title-options">
						<button
							v-for="title in allTitles"
							:key="`${title.sourceName}-${title.lang}-${title.value}`"
							class="title-option"
							:class="{
								selected: serie.title === title.value,
								alternate: title.isAlternate,
							}"
							:disabled="isPending"
							@click="setTitle(title.value)"
						>
							<UIcon
								name="i-lucide-check"
								class="check-icon"
								:class="{ visible: serie.title === title.value }"
							/>
							<span class="lang-tag">{{ title.lang }}</span>
							<span
								v-if="serie.sources.length > 1"
								class="source-tag"
							>{{ title.sourceName }}</span>
							<span class="title-text">{{ title.value }}</span>
						</button>
					</div>
				</div>

				<!-- Custom input -->
				<div class="custom-input">
					<span class="label">Custom title</span>
					<div class="input-row">
						<input
							v-model="customTitle"
							type="text"
							placeholder="Enter custom title..."
							class="text-input"
							:disabled="isPending"
						>
						<button
							class="set-button"
							:disabled="isPending || !customTitle || customTitle === serie.title"
							@click="setTitle(customTitle)"
						>
							<UIcon
								v-if="isPending"
								name="i-lucide-loader-2"
								class="spinner"
							/>
							<template v-else>
								Set
							</template>
						</button>
					</div>
				</div>
			</template>

			<!-- Unlocked hint -->
			<p
				v-else
				class="hint"
			>
				Lock this field to set a custom title. When unlocked, the title updates automatically from sources.
			</p>
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
	background: color-mix(in oklch, var(--ui-info) 15%, transparent);
	border-radius: 0.375rem;
}

.section-icon .icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-info);
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

/* Lock toggle */
.lock-toggle {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem 0.75rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 2rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.lock-toggle:hover:not(:disabled) {
	border-color: var(--ui-text-muted);
}

.lock-toggle.locked {
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
	border-color: transparent;
}

.lock-toggle:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.lock-icon {
	width: 0.875rem;
	height: 0.875rem;
}

/* Section body */
.section-body {
	padding: 1.25rem;
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

/* Labels */
.label {
	display: block;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.03em;
	margin-bottom: 0.5rem;
}

/* Current value */
.current-value {
	padding: 0.875rem 1rem;
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
}

.current-value .label {
	margin-bottom: 0.25rem;
}

.current-value .value {
	font-size: var(--font-size-base);
	font-weight: 500;
	color: var(--ui-text);
	word-break: break-word;
}

/* Title options */
.titles-grid {
	padding-top: 0.25rem;
}

.title-options {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.title-option {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.625rem 0.875rem;
	font-size: var(--font-size-sm);
	text-align: left;
	color: var(--ui-text);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.title-option:hover:not(:disabled) {
	border-color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
}

.title-option.selected {
	border-color: var(--ui-primary);
	background: var(--ui-primary-soft);
}

.title-option.alternate {
	border-style: dashed;
}

.title-option:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.check-icon {
	width: 0.875rem;
	height: 0.875rem;
	color: var(--ui-primary);
	flex-shrink: 0;
	opacity: 0;
}

.check-icon.visible {
	opacity: 1;
}

.lang-tag,
.source-tag {
	font-size: var(--font-size-xs);
	flex-shrink: 0;
}

.lang-tag {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 2.5rem;
	padding: 0.125rem 0.375rem;
	font-weight: 500;
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	border-radius: 0.25rem;
}

.source-tag {
	min-width: 9rem;
	max-width: 9rem;
	color: var(--ui-text-dimmed);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.title-text {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Custom input */
.custom-input {
	padding-top: 0.25rem;
}

.input-row {
	display: flex;
	gap: 0.5rem;
}

.text-input {
	flex: 1;
	padding: 0.625rem 0.875rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	outline: none;
	transition: border-color 0.15s ease;
}

.text-input::placeholder {
	color: var(--ui-text-dimmed);
}

.text-input:focus {
	border-color: var(--ui-primary);
}

.text-input:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.set-button {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 4rem;
	padding: 0.625rem 1rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-bg);
	background: var(--ui-primary);
	border: none;
	border-radius: 0.5rem;
	cursor: pointer;
	transition: opacity 0.15s ease;
}

.set-button:hover:not(:disabled) {
	opacity: 0.9;
}

.set-button:disabled {
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

/* Hint */
.hint {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0;
	line-height: 1.5;
}
</style>
