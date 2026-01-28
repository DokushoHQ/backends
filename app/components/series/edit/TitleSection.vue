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
const isSourceListExpanded = ref(false)

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
	<div class="title-section">
		<!-- Header with rule and lock toggle -->
		<div class="field-header">
			<span class="field-label">TITLE</span>
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

		<!-- Current value display -->
		<div
			class="value-display"
			:class="{ locked: isLocked }"
		>
			<span class="value-text">{{ serie.title }}</span>
		</div>

		<!-- Edit controls (only when locked) -->
		<template v-if="isLocked">
			<!-- Expandable source list -->
			<div
				v-if="allTitles.length > 0"
				class="source-list-section"
			>
				<button
					class="expand-btn"
					@click="isSourceListExpanded = !isSourceListExpanded"
				>
					<span class="expand-arrow">{{ isSourceListExpanded ? '\u25BC' : '\u25B8' }}</span>
					<span>Select from sources</span>
					<span class="count-badge">{{ allTitles.length }}</span>
				</button>

				<div
					v-if="isSourceListExpanded"
					class="title-list"
				>
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
						<span
							class="led"
							:class="{ active: serie.title === title.value }"
						/>
						<span class="lang-tag">{{ title.lang.toUpperCase() }}</span>
						<span
							v-if="serie.sources.length > 1"
							class="source-tag"
						>{{ title.sourceName }}</span>
						<span class="title-text">{{ title.value }}</span>
						<span
							v-if="title.isAlternate"
							class="alt-tag"
						>ALT</span>
					</button>
				</div>
			</div>

			<!-- Custom input -->
			<div class="custom-input-section">
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
					<div class="terminal-wrapper">
						<span class="terminal-prompt">&gt;</span>
						<input
							v-model="customTitle"
							type="text"
							placeholder="Enter custom title..."
							class="terminal-input"
							:disabled="isPending"
							@keyup.enter="setTitle(customTitle)"
						>
					</div>
					<button
						class="set-btn"
						:disabled="isPending || !customTitle || customTitle === serie.title"
						@click="setTitle(customTitle)"
					>
						<UIcon
							v-if="isPending"
							name="i-lucide-loader-2"
							class="btn-icon spin"
						/>
						<span v-else>SET</span>
					</button>
				</div>
			</div>
		</template>

		<!-- Unlocked hint -->
		<p
			v-else
			class="hint"
		>
			Lock to set custom title. Auto-updates from sources when unlocked.
		</p>
	</div>
</template>

<style scoped>
.title-section {
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

/* Value display */
.value-display {
	padding: 0.75rem 1rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	transition: all 0.2s ease;
}

.value-display.locked {
	border-color: var(--ui-primary);
	box-shadow: inset 0 0 12px color-mix(in oklch, var(--ui-primary) 15%, transparent);
}

.value-text {
	font-family: inherit;
	font-size: var(--font-size-base);
	font-weight: 500;
	color: var(--ui-text);
	word-break: break-word;
}

.value-display.locked .value-text {
	color: var(--ui-primary);
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

.expand-arrow {
	font-size: 0.625rem;
	color: var(--ui-text-dimmed);
	width: 0.625rem;
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

.title-list {
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

.title-option {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.625rem;
	font-family: inherit;
	font-size: var(--font-size-sm);
	color: var(--ui-text);
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	cursor: pointer;
	text-align: left;
	transition: all 0.15s ease;
}

.title-option:hover:not(:disabled) {
	background: var(--ui-bg-muted);
	border-color: var(--ui-text-muted);
}

.title-option.selected {
	border-color: var(--ui-primary);
	background: color-mix(in oklch, var(--ui-primary) 8%, var(--ui-bg-elevated));
}

.title-option.alternate {
	border-style: dashed;
}

.title-option:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.lang-tag {
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	padding: 0.125rem 0.375rem;
	background: var(--ui-bg-muted);
	border-radius: 0.125rem;
	flex-shrink: 0;
}

.source-tag {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	flex-shrink: 0;
	max-width: 6rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.title-text {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.alt-tag {
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-warning);
	padding: 0.125rem 0.375rem;
	background: color-mix(in oklch, var(--ui-warning) 15%, transparent);
	border-radius: 0.125rem;
	flex-shrink: 0;
}

/* Custom input section */
.custom-input-section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.custom-input {
	display: flex;
	gap: 0.5rem;
}

/* Terminal input */
.terminal-wrapper {
	position: relative;
	flex: 1;
}

.terminal-prompt {
	position: absolute;
	left: 0.625rem;
	top: 50%;
	transform: translateY(-50%);
	font-family: inherit;
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-primary);
	pointer-events: none;
	z-index: 1;
}

.terminal-input {
	width: 100%;
	padding: 0.5rem 0.625rem 0.5rem 1.375rem;
	font-family: inherit;
	font-size: var(--font-size-sm);
	color: var(--ui-primary);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	outline: none;
	transition: all 0.15s ease;
}

.terminal-input::placeholder {
	color: var(--ui-text-dimmed);
}

.terminal-input:focus {
	border-color: var(--ui-primary);
	box-shadow: 0 0 0 1px color-mix(in oklch, var(--ui-primary) 20%, transparent);
}

.terminal-input:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

/* Set button */
.set-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 4rem;
	padding: 0.5rem 0.75rem;
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

.set-btn:hover:not(:disabled) {
	background: color-mix(in oklch, var(--ui-primary) 85%, white);
	box-shadow: 0 0 8px color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

.set-btn:disabled {
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

/* Hint */
.hint {
	font-family: inherit;
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	margin: 0;
	font-style: italic;
}
</style>
