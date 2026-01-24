<script setup lang="ts">
import type { UISerie, UIMultiLanguage } from "#shared/ui/type/serie"

const props = defineProps<{
	serie: UISerie
}>()

const emit = defineEmits<{
	updated: []
}>()

const isPending = ref(false)
const customSynopsis = ref(props.serie.synopsis ?? "")

// Watch for serie changes to update local state
watch(() => props.serie.synopsis, (newSynopsis) => {
	customSynopsis.value = newSynopsis ?? ""
})

const isLocked = computed(() => (props.serie.locked_fields ?? []).includes("synopsis"))

// Collect all synopsis options from all sources
const synopsisOptions = computed(() => {
	const options: { key: string, lang: string, value: string, sourceName: string }[] = []

	for (const source of props.serie.sources) {
		const sourceSynopsis = source.synopsis as UIMultiLanguage | null
		if (sourceSynopsis) {
			for (const [lang, values] of Object.entries(sourceSynopsis)) {
				const value = values?.[0]
				if (value) {
					const key = `${source.source.name}-${lang}`
					if (!options.some(s => s.value === value)) {
						options.push({ key, lang, value, sourceName: source.source.name })
					}
				}
			}
		}
	}

	return options
})

async function toggleLock() {
	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serie.id}/field`, {
			method: "POST",
			body: { field: "synopsis", action: isLocked.value ? "unlock" : "lock" },
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

async function setSynopsis(value: string) {
	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serie.id}/field`, {
			method: "POST",
			body: { field: "synopsis", action: "update", value: value || null },
		})
		emit("updated")
	}
	catch (e: unknown) {
		console.error("Failed to update synopsis:", e)
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
						name="i-lucide-align-left"
						class="icon"
					/>
				</div>
				<div>
					<h2>Synopsis</h2>
					<p>The description shown for this series</p>
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
				<UiMarkdown
					v-if="serie.synopsis"
					:content="serie.synopsis"
					class="synopsis-text"
				/>
				<p
					v-else
					class="empty-text"
				>
					No synopsis set
				</p>
			</div>

			<!-- Edit controls (only when locked) -->
			<template v-if="isLocked">
				<!-- Source options -->
				<div
					v-if="synopsisOptions.length > 0"
					class="source-options"
				>
					<span class="label">Select from sources</span>
					<div class="options-row">
						<button
							v-for="option in synopsisOptions"
							:key="option.key"
							class="source-option"
							:class="{ selected: serie.synopsis === option.value }"
							:title="option.value.slice(0, 300) + (option.value.length > 300 ? '...' : '')"
							:disabled="isPending"
							@click="setSynopsis(option.value)"
						>
							<UIcon
								name="i-lucide-check"
								class="check-icon"
								:class="{ visible: serie.synopsis === option.value }"
							/>
							<span class="option-lang">{{ option.lang }}</span>
							<span
								v-if="serie.sources.length > 1"
								class="option-source"
							>{{ option.sourceName }}</span>
						</button>
					</div>
				</div>

				<!-- Custom textarea -->
				<div class="custom-input">
					<span class="label">Custom synopsis</span>
					<textarea
						v-model="customSynopsis"
						placeholder="Enter custom synopsis..."
						class="text-area"
						:disabled="isPending"
						rows="5"
					/>
					<div class="textarea-actions">
						<button
							class="set-button"
							:disabled="isPending || customSynopsis === (serie.synopsis ?? '')"
							@click="setSynopsis(customSynopsis)"
						>
							<UIcon
								v-if="isPending"
								name="i-lucide-loader-2"
								class="spinner"
							/>
							<template v-else>
								Save Synopsis
							</template>
						</button>
						<button
							v-if="serie.synopsis"
							class="clear-button"
							:disabled="isPending"
							@click="setSynopsis('')"
						>
							Clear
						</button>
					</div>
				</div>
			</template>

			<!-- Unlocked hint -->
			<p
				v-else
				class="hint"
			>
				Lock this field to set a custom synopsis. When unlocked, the synopsis updates automatically from sources.
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
	background: color-mix(in oklch, var(--ui-success) 15%, transparent);
	border-radius: 0.375rem;
}

.section-icon .icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-success);
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
	margin-bottom: 0.5rem;
}

.synopsis-text {
	font-size: var(--font-size-sm);
	max-height: 8rem;
	overflow-y: auto;
}

.empty-text {
	font-size: var(--font-size-sm);
	color: var(--ui-text-dimmed);
	font-style: italic;
	margin: 0;
}

/* Source options */
.source-options {
	padding-top: 0.25rem;
}

.options-row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

.source-option {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.5rem 0.75rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.source-option:hover:not(:disabled) {
	border-color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
}

.source-option.selected {
	border-color: var(--ui-primary);
	background: var(--ui-primary-soft);
}

.source-option:disabled {
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

.option-lang {
	font-weight: 500;
}

.option-source {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
}

/* Custom input */
.custom-input {
	padding-top: 0.25rem;
}

.text-area {
	width: 100%;
	padding: 0.75rem 0.875rem;
	font-size: var(--font-size-sm);
	font-family: inherit;
	color: var(--ui-text);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	outline: none;
	resize: vertical;
	min-height: 6rem;
	transition: border-color 0.15s ease;
}

.text-area::placeholder {
	color: var(--ui-text-dimmed);
}

.text-area:focus {
	border-color: var(--ui-primary);
}

.text-area:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.textarea-actions {
	display: flex;
	gap: 0.5rem;
	margin-top: 0.75rem;
}

.set-button,
.clear-button {
	padding: 0.625rem 1rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	border-radius: 0.5rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.set-button:disabled,
.clear-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.set-button {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	color: var(--ui-bg);
	background: var(--ui-primary);
	border: none;
}

.set-button:hover:not(:disabled) {
	opacity: 0.9;
}

.clear-button {
	color: var(--ui-text-muted);
	background: transparent;
	border: 1px solid var(--ui-border);
}

.clear-button:hover:not(:disabled) {
	border-color: var(--ui-text-muted);
	color: var(--ui-text);
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
