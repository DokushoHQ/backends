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
const isExpanded = ref(false)
const isSourceListExpanded = ref(false)

// Watch for serie changes to update local state
watch(() => props.serie.synopsis, (newSynopsis) => {
	customSynopsis.value = newSynopsis ?? ""
})

const isLocked = computed(() => (props.serie.locked_fields ?? []).includes("synopsis"))

// Collect all synopsis options from all sources
const synopsisOptions = computed(() => {
	const options: { key: string, lang: string, value: string, sourceName: string, preview: string }[] = []

	for (const source of props.serie.sources) {
		const sourceSynopsis = source.synopsis as UIMultiLanguage | null
		if (sourceSynopsis) {
			for (const [lang, values] of Object.entries(sourceSynopsis)) {
				const value = values?.[0]
				if (value) {
					const key = `${source.source.name}-${lang}`
					if (!options.some(s => s.value === value)) {
						options.push({
							key,
							lang,
							value,
							sourceName: source.source.name,
							preview: value.slice(0, 100) + (value.length > 100 ? "..." : ""),
						})
					}
				}
			}
		}
	}

	return options
})

// Synopsis preview (first 150 chars)
const synopsisPreview = computed(() => {
	if (!props.serie.synopsis) return null
	if (props.serie.synopsis.length <= 150) return props.serie.synopsis
	return props.serie.synopsis.slice(0, 150) + "..."
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
	<div class="synopsis-section">
		<!-- Header with rule and lock toggle -->
		<div class="field-header">
			<span class="field-label">SYNOPSIS</span>
			<div class="field-rule" />
			<button
				class="lock-btn"
				:class="{ locked: isLocked }"
				:disabled="isPending"
				@click="toggleLock"
			>
				<span
					class="led"
					:class="{ active: isLocked }"
				/>
				<span>{{ isLocked ? 'LOCKED' : 'AUTO' }}</span>
			</button>
		</div>

		<!-- Collapsible current value -->
		<div class="collapsible">
			<button
				class="collapsible-header"
				:class="{ expanded: isExpanded }"
				@click="isExpanded = !isExpanded"
			>
				<div class="collapsible-left">
					<span class="expand-arrow">{{ isExpanded ? '\u25BC' : '\u25B8' }}</span>
					<span class="collapsible-label">Current Value</span>
				</div>
				<span
					v-if="!serie.synopsis"
					class="empty-tag"
				>EMPTY</span>
			</button>

			<div
				v-if="!isExpanded && synopsisPreview"
				class="preview"
			>
				<span class="preview-text">{{ synopsisPreview }}</span>
			</div>

			<div
				v-if="isExpanded"
				class="collapsible-body"
				:class="{ locked: isLocked }"
			>
				<UiMarkdown
					v-if="serie.synopsis"
					:content="serie.synopsis"
					class="synopsis-content"
				/>
				<p
					v-else
					class="empty-text"
				>
					No synopsis set
				</p>
			</div>
		</div>

		<!-- Edit controls (only when locked) -->
		<template v-if="isLocked">
			<!-- Source options -->
			<div
				v-if="synopsisOptions.length > 0"
				class="source-list-section"
			>
				<button
					class="expand-btn"
					@click="isSourceListExpanded = !isSourceListExpanded"
				>
					<span class="expand-arrow">{{ isSourceListExpanded ? '\u25BC' : '\u25B8' }}</span>
					<span>Select from sources</span>
					<span class="count-badge">{{ synopsisOptions.length }}</span>
				</button>

				<div
					v-if="isSourceListExpanded"
					class="source-options"
				>
					<button
						v-for="option in synopsisOptions"
						:key="option.key"
						class="source-option"
						:class="{ selected: serie.synopsis === option.value }"
						:disabled="isPending"
						@click="setSynopsis(option.value)"
					>
						<span
							class="led"
							:class="{ active: serie.synopsis === option.value }"
						/>
						<div class="option-info">
							<div class="option-header">
								<span class="lang-tag">{{ option.lang.toUpperCase() }}</span>
								<span
									v-if="serie.sources.length > 1"
									class="source-tag"
								>{{ option.sourceName }}</span>
							</div>
							<span class="option-preview">{{ option.preview }}</span>
						</div>
					</button>
				</div>
			</div>

			<!-- Custom textarea -->
			<div class="custom-section">
				<button
					class="expand-btn"
					:class="{ active: !isSourceListExpanded }"
					@click="isSourceListExpanded = false"
				>
					<span class="expand-arrow">{{ !isSourceListExpanded ? '\u25BC' : '\u25B8' }}</span>
					<span>Enter custom value</span>
				</button>

				<div
					v-if="!isSourceListExpanded"
					class="custom-input"
				>
					<textarea
						v-model="customSynopsis"
						placeholder="Enter custom synopsis..."
						class="textarea"
						:disabled="isPending"
						rows="5"
					/>
					<div class="textarea-actions">
						<button
							class="save-btn"
							:disabled="isPending || customSynopsis === (serie.synopsis ?? '')"
							@click="setSynopsis(customSynopsis)"
						>
							<UIcon
								v-if="isPending"
								name="i-lucide-loader-2"
								class="btn-icon spin"
							/>
							<span v-else>SAVE</span>
						</button>
						<button
							v-if="serie.synopsis"
							class="clear-btn"
							:disabled="isPending"
							@click="setSynopsis('')"
						>
							CLEAR
						</button>
					</div>
				</div>
			</div>
		</template>

		<!-- Unlocked hint -->
		<p
			v-else
			class="hint"
		>
			Lock to set custom synopsis. Auto-updates from sources when unlocked.
		</p>
	</div>
</template>

<style scoped>
.synopsis-section {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

/* Field header with rule */
.field-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.field-label {
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	letter-spacing: 0.1em;
	flex-shrink: 0;
}

.field-rule {
	flex: 1;
	height: 1px;
	background: linear-gradient(90deg, var(--ui-text-dimmed), transparent);
}

.lock-btn {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.25rem 0.5rem;
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	cursor: pointer;
	transition: all 0.15s ease;
	flex-shrink: 0;
}

.lock-btn:hover:not(:disabled) {
	border-color: var(--ui-text-muted);
}

.lock-btn.locked {
	color: var(--ui-primary);
	border-color: var(--ui-primary);
	background: color-mix(in oklch, var(--ui-primary) 10%, transparent);
}

.lock-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

/* LED indicator */
.led {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--ui-text-dimmed);
	flex-shrink: 0;
	transition: all 0.2s ease;
}

.led.active {
	background: var(--ui-primary);
	box-shadow: 0 0 4px color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

/* Collapsible panel */
.collapsible {
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	overflow: hidden;
}

.collapsible-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 0.625rem 0.875rem;
	font-family: inherit;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	background: transparent;
	border: none;
	cursor: pointer;
	text-align: left;
	transition: background-color 0.15s ease;
}

.collapsible-header:hover {
	background: var(--ui-bg-muted);
}

.collapsible-left {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.expand-arrow {
	font-size: 0.625rem;
	color: var(--ui-text-dimmed);
	width: 0.625rem;
}

.collapsible-label {
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	font-size: var(--font-size-xs);
}

.empty-tag {
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-dimmed);
	padding: 0.125rem 0.375rem;
	background: var(--ui-bg-muted);
	border-radius: 0.125rem;
	letter-spacing: 0.05em;
}

.preview {
	padding: 0 0.875rem 0.625rem;
}

.preview-text {
	font-family: inherit;
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	line-height: 1.5;
}

.collapsible-body {
	padding: 0.875rem;
	border-top: 1px solid var(--ui-border);
	max-height: 12rem;
	overflow-y: auto;
}

.collapsible-body.locked {
	border-top-color: var(--ui-primary);
	box-shadow: inset 0 0 12px color-mix(in oklch, var(--ui-primary) 15%, transparent);
}

.synopsis-content {
	font-family: inherit;
	font-size: var(--font-size-sm);
	color: var(--ui-text);
	line-height: 1.6;
}

.empty-text {
	font-family: inherit;
	font-size: var(--font-size-sm);
	color: var(--ui-text-dimmed);
	font-style: italic;
	margin: 0;
}

/* Expand button */
.expand-btn {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	width: 100%;
	padding: 0.5rem 0.75rem;
	font-family: inherit;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	cursor: pointer;
	text-align: left;
	transition: all 0.15s ease;
}

.expand-btn:hover {
	background: var(--ui-bg-muted);
	border-color: var(--ui-text-muted);
}

.count-badge {
	margin-left: auto;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-dimmed);
	padding: 0.125rem 0.375rem;
	background: var(--ui-bg-muted);
	border-radius: 0.125rem;
}

/* Source list section */
.source-list-section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.source-options {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	max-height: 16rem;
	overflow-y: auto;
	padding: 0.25rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
}

.source-option {
	display: flex;
	align-items: flex-start;
	gap: 0.5rem;
	padding: 0.625rem;
	font-family: inherit;
	color: var(--ui-text);
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	cursor: pointer;
	text-align: left;
	transition: all 0.15s ease;
}

.source-option:hover:not(:disabled) {
	background: var(--ui-bg-muted);
	border-color: var(--ui-text-muted);
}

.source-option.selected {
	border-color: var(--ui-primary);
	background: color-mix(in oklch, var(--ui-primary) 8%, var(--ui-bg-elevated));
}

.source-option:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.source-option .led {
	margin-top: 0.25rem;
}

.option-info {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	min-width: 0;
	flex: 1;
}

.option-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.lang-tag {
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	padding: 0.125rem 0.375rem;
	background: var(--ui-bg-muted);
	border-radius: 0.125rem;
}

.source-tag {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
}

.option-preview {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	line-height: 1.4;
}

/* Custom section */
.custom-section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.custom-input {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.textarea {
	width: 100%;
	padding: 0.75rem;
	font-family: inherit;
	font-size: var(--font-size-sm);
	color: var(--ui-text);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	outline: none;
	resize: vertical;
	min-height: 6rem;
	line-height: 1.6;
	transition: all 0.15s ease;
}

.textarea::placeholder {
	color: var(--ui-text-dimmed);
}

.textarea:focus {
	border-color: var(--ui-primary);
	box-shadow: 0 0 0 1px color-mix(in oklch, var(--ui-primary) 20%, transparent);
}

.textarea:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.textarea-actions {
	display: flex;
	gap: 0.5rem;
}

.save-btn,
.clear-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0.5rem 0.75rem;
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	border-radius: 0.25rem;
	cursor: pointer;
	letter-spacing: 0.05em;
	transition: all 0.15s ease;
}

.save-btn:disabled,
.clear-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.save-btn {
	color: var(--ui-bg);
	background: var(--ui-primary);
	border: 1px solid var(--ui-primary);
}

.save-btn:hover:not(:disabled) {
	background: color-mix(in oklch, var(--ui-primary) 85%, white);
	box-shadow: 0 0 8px color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

.clear-btn {
	color: var(--ui-text-muted);
	background: transparent;
	border: 1px solid var(--ui-border);
}

.clear-btn:hover:not(:disabled) {
	color: var(--ui-text);
	border-color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
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

/* Hint */
.hint {
	font-family: inherit;
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	margin: 0;
	font-style: italic;
}
</style>
