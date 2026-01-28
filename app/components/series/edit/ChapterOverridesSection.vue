<script setup lang="ts">
const props = defineProps<{
	serieId: string
}>()

const emit = defineEmits<{
	updated: []
}>()

const toast = useToast()
const isPending = ref(false)
const activeLanguage = ref<string | null>(null)

// Fetch chapter overrides
const { data: overrideData, refresh: refreshOverrides } = await useFetch(
	`/api/v1/serie/${props.serieId}/chapters/overrides`,
)

// Available languages (sorted alphabetically)
const availableLanguages = computed(() => {
	if (!overrideData.value?.count_by_language) return []
	return Object.keys(overrideData.value.count_by_language).sort()
})

// Set initial active language
watch(availableLanguages, (langs) => {
	if (langs.length > 0 && !activeLanguage.value) {
		activeLanguage.value = langs[0] ?? null
	}
}, { immediate: true })

// All overrides for the active language
const filteredOverrides = computed(() => {
	if (!activeLanguage.value || !overrideData.value?.overrides) return []
	return overrideData.value.overrides.filter(
		o => o.language === activeLanguage.value,
	)
})

// Group overrides by enabled/disabled
const enabledOverrides = computed(() =>
	filteredOverrides.value.filter(o => o.manual_override === true),
)

const disabledOverrides = computed(() =>
	filteredOverrides.value.filter(o => o.manual_override === false),
)

// Stats
const totalEnabled = computed(() =>
	overrideData.value?.overrides?.filter(o => o.manual_override === true).length ?? 0,
)

const totalDisabled = computed(() =>
	overrideData.value?.overrides?.filter(o => o.manual_override === false).length ?? 0,
)

// Reset all overrides for the current language
async function resetLanguage() {
	if (isPending.value || !activeLanguage.value) return

	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/chapters/reset-overrides`, {
			method: "POST",
			body: { language: activeLanguage.value },
		})

		toast.add({
			title: "Overrides Reset",
			description: `All overrides for ${activeLanguage.value} have been cleared`,
			color: "success",
		})

		await refreshOverrides()
		emit("updated")
	}
	catch (e) {
		console.error("Failed to reset overrides:", e)
		toast.add({ title: "Reset Failed", color: "error" })
	}
	finally {
		isPending.value = false
	}
}

// Reset all overrides for all languages
async function resetAll() {
	if (isPending.value || !overrideData.value?.total_count) return

	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/chapters/reset-overrides`, {
			method: "POST",
		})

		toast.add({
			title: "All Overrides Reset",
			description: "Auto-dedup will now manage all chapters",
			color: "success",
		})

		await refreshOverrides()
		emit("updated")
	}
	catch (e) {
		console.error("Failed to reset all overrides:", e)
		toast.add({ title: "Reset Failed", color: "error" })
	}
	finally {
		isPending.value = false
	}
}

// Reset a single chapter override
async function resetChapter(chapterId: string, chapterNumber: number) {
	if (isPending.value) return

	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/chapters/reset-overrides`, {
			method: "POST",
			body: { chapterIds: [chapterId] },
		})

		toast.add({
			title: "Override Reset",
			description: `Ch. ${chapterNumber} is now auto-managed`,
			color: "success",
		})

		await refreshOverrides()
		emit("updated")
	}
	catch (e) {
		console.error("Failed to reset chapter override:", e)
		toast.add({ title: "Reset Failed", color: "error" })
	}
	finally {
		isPending.value = false
	}
}

// Format chapter title for display
function formatChapterTitle(override: typeof filteredOverrides.value[number]): string {
	const parts = [`Ch. ${override.chapter_number}`]
	if (override.title) {
		parts.push(`"${override.title}"`)
	}
	return parts.join(" ")
}
</script>

<template>
	<section
		v-if="overrideData && overrideData.total_count > 0"
		class="section"
	>
		<!-- Section Header -->
		<div class="section-header">
			<span>OVERRIDE REGISTRY</span>
		</div>

		<div class="panel">
			<!-- Stats Bar -->
			<div class="stats-bar">
				<div class="stats-group">
					<div class="stat">
						<div class="led led-success" />
						<span class="stat-label">ENABLED:</span>
						<span class="stat-value">{{ totalEnabled }}</span>
					</div>
					<div class="stat">
						<div class="led led-error" />
						<span class="stat-label">DISABLED:</span>
						<span class="stat-value">{{ totalDisabled }}</span>
					</div>
					<div class="stat">
						<span class="stat-label">TOTAL:</span>
						<span class="stat-value">{{ overrideData.total_count }}</span>
					</div>
				</div>
				<button
					class="btn btn-danger"
					:disabled="isPending"
					@click="resetAll"
				>
					<UIcon
						v-if="isPending"
						name="i-lucide-loader-2"
						class="btn-icon spin"
					/>
					<template v-else>
						<UIcon
							name="i-lucide-rotate-ccw"
							class="btn-icon"
						/>
						<span class="btn-label">RESET ALL</span>
					</template>
				</button>
			</div>

			<!-- Language Tabs -->
			<div class="lang-tabs">
				<button
					v-for="lang in availableLanguages"
					:key="lang"
					class="lang-tab"
					:class="{ active: activeLanguage === lang }"
					@click="activeLanguage = lang"
				>
					<span class="lang-code">{{ lang.toUpperCase() }}</span>
					<span class="lang-count">{{ (overrideData.count_by_language as Record<string, number>)[lang] }}</span>
				</button>
			</div>

			<!-- Panel Body -->
			<div class="panel-body">
				<!-- Reset Language Button -->
				<div
					v-if="filteredOverrides.length > 0"
					class="language-actions"
				>
					<button
						class="btn btn-secondary"
						:disabled="isPending"
						@click="resetLanguage"
					>
						<UIcon
							name="i-lucide-rotate-ccw"
							class="btn-icon"
						/>
						<span>Reset {{ activeLanguage?.toUpperCase() }} overrides</span>
					</button>
				</div>

				<!-- Overrides Table -->
				<div class="overrides-table">
					<!-- Enabled Section -->
					<template v-if="enabledOverrides.length > 0">
						<div class="table-header enabled">
							<div class="led led-success" />
							<span class="table-title">ENABLED</span>
							<span class="table-count">{{ enabledOverrides.length }}</span>
						</div>

						<div
							v-for="override in enabledOverrides"
							:key="override.id"
							class="override-row"
						>
							<div class="override-status enabled">
								<span class="status-icon">+</span>
							</div>
							<div class="override-info">
								<span class="override-chapter">{{ formatChapterTitle(override) }}</span>
								<span class="override-separator">────</span>
								<span class="override-source">{{ override.source_name }}</span>
								<span
									v-if="override.groups.length > 0"
									class="override-groups"
								>
									[{{ override.groups.join(", ") }}]
								</span>
							</div>
							<button
								class="action-btn reset"
								:disabled="isPending"
								title="Reset to auto-managed"
								@click="resetChapter(override.id, override.chapter_number)"
							>
								<UIcon
									name="i-lucide-rotate-ccw"
									class="action-icon"
								/>
							</button>
						</div>
					</template>

					<!-- Disabled Section -->
					<template v-if="disabledOverrides.length > 0">
						<div class="table-header disabled">
							<div class="led led-error" />
							<span class="table-title">DISABLED</span>
							<span class="table-count">{{ disabledOverrides.length }}</span>
						</div>

						<div
							v-for="override in disabledOverrides"
							:key="override.id"
							class="override-row"
						>
							<div class="override-status disabled">
								<span class="status-icon">−</span>
							</div>
							<div class="override-info">
								<span class="override-chapter">{{ formatChapterTitle(override) }}</span>
								<span class="override-separator">────</span>
								<span class="override-source">{{ override.source_name }}</span>
								<span
									v-if="override.groups.length > 0"
									class="override-groups"
								>
									[{{ override.groups.join(", ") }}]
								</span>
							</div>
							<button
								class="action-btn reset"
								:disabled="isPending"
								title="Reset to auto-managed"
								@click="resetChapter(override.id, override.chapter_number)"
							>
								<UIcon
									name="i-lucide-rotate-ccw"
									class="action-icon"
								/>
							</button>
						</div>
					</template>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
/* Section Header */
.section {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.section-header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	font-family: inherit;
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.1em;
}

.section-header::before {
	content: "──";
	color: var(--ui-text-dimmed);
}

.section-header::after {
	content: "";
	flex: 1;
	height: 1px;
	background: linear-gradient(90deg, var(--ui-text-dimmed), transparent);
}

/* Panel */
.panel {
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.375rem;
	overflow: hidden;
}

/* Stats Bar */
.stats-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.625rem 0.875rem;
	background: var(--ui-bg-muted);
	border-bottom: 1px solid var(--ui-border);
}

.stats-group {
	display: flex;
	align-items: center;
	gap: 1rem;
	flex-wrap: wrap;
}

.stat {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	font-family: inherit;
	font-size: var(--font-size-xs);
}

.stat-label {
	color: var(--ui-text-dimmed);
	letter-spacing: 0.05em;
}

.stat-value {
	font-weight: 600;
	color: var(--ui-text);
}

/* LED Indicators */
.led {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	flex-shrink: 0;
}

.led-success {
	background: var(--ui-success);
	box-shadow: 0 0 4px color-mix(in oklch, var(--ui-success) 50%, transparent);
}

.led-error {
	background: var(--ui-error);
	box-shadow: 0 0 4px color-mix(in oklch, var(--ui-error) 50%, transparent);
}

/* Language Tabs */
.lang-tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 0;
	padding: 0;
	background: var(--ui-bg);
	border-bottom: 1px solid var(--ui-border);
}

.lang-tab {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.5rem 0.75rem;
	font-family: inherit;
	font-size: var(--font-size-sm);
	font-weight: 600;
	letter-spacing: 0.05em;
	color: var(--ui-text-dimmed);
	background: transparent;
	border: none;
	border-bottom: 2px solid transparent;
	cursor: pointer;
	transition: all 0.15s ease;
}

.lang-tab:hover:not(.active) {
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
}

.lang-tab.active {
	color: var(--ui-warning);
	background: var(--ui-bg-elevated);
	border-bottom-color: var(--ui-warning);
}

.lang-code {
	display: block;
}

.lang-count {
	font-size: 0.5625rem;
	font-weight: 700;
	padding: 0.0625rem 0.25rem;
	background: var(--ui-bg-muted);
	border-radius: 0.25rem;
}

.lang-tab.active .lang-count {
	background: color-mix(in oklch, var(--ui-warning) 20%, transparent);
	color: var(--ui-warning);
}

/* Panel Body */
.panel-body {
	padding: 0.875rem;
	display: flex;
	flex-direction: column;
	gap: 0.875rem;
}

/* Language Actions */
.language-actions {
	display: flex;
	justify-content: flex-end;
}

/* Button Styles */
.btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	padding: 0.375rem 0.625rem;
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	letter-spacing: 0.05em;
	border-radius: 0.25rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.btn-secondary {
	color: var(--ui-text-muted);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
}

.btn-secondary:hover:not(:disabled) {
	color: var(--ui-text);
	border-color: var(--ui-text-dimmed);
}

.btn-danger {
	color: var(--ui-error);
	background: transparent;
	border: 1px solid var(--ui-error);
}

.btn-danger:hover:not(:disabled) {
	background: color-mix(in oklch, var(--ui-error) 15%, transparent);
	box-shadow: 0 0 8px color-mix(in oklch, var(--ui-error) 30%, transparent);
}

.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-icon {
	width: 0.75rem;
	height: 0.75rem;
}

.btn-label {
	display: none;
}

@media (min-width: 480px) {
	.btn-label {
		display: inline;
	}
}

.spin {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Overrides Table */
.overrides-table {
	display: flex;
	flex-direction: column;
	gap: 0;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	overflow: hidden;
}

.table-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	letter-spacing: 0.1em;
	border-bottom: 1px solid var(--ui-border);
}

.table-header.enabled {
	background: color-mix(in oklch, var(--ui-success) 8%, transparent);
	color: var(--ui-success);
}

.table-header.disabled {
	background: color-mix(in oklch, var(--ui-error) 8%, transparent);
	color: var(--ui-error);
}

.table-title {
	flex: 1;
}

.table-count {
	font-weight: 500;
	color: var(--ui-text-dimmed);
	padding: 0.0625rem 0.375rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
}

/* Override Row */
.override-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
	font-family: inherit;
	font-size: var(--font-size-sm);
	background: var(--ui-bg-elevated);
	border-bottom: 1px solid var(--ui-border);
	transition: all 0.15s ease;
}

.override-row:last-child {
	border-bottom: none;
}

.override-row:hover {
	background: var(--ui-bg-muted);
}

/* Override Status */
.override-status {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.25rem;
	height: 1.25rem;
	border-radius: 0.25rem;
	flex-shrink: 0;
}

.override-status.enabled {
	background: color-mix(in oklch, var(--ui-success) 15%, transparent);
	border: 1px solid var(--ui-success);
}

.override-status.disabled {
	background: color-mix(in oklch, var(--ui-error) 15%, transparent);
	border: 1px solid var(--ui-error);
}

.status-icon {
	font-weight: 700;
	font-size: 0.875rem;
	line-height: 1;
}

.override-status.enabled .status-icon {
	color: var(--ui-success);
}

.override-status.disabled .status-icon {
	color: var(--ui-error);
}

/* Override Info */
.override-info {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 0.5rem;
	min-width: 0;
	overflow: hidden;
}

.override-chapter {
	color: var(--ui-text);
	white-space: nowrap;
	flex-shrink: 0;
}

.override-separator {
	color: var(--ui-text-dimmed);
	flex-shrink: 0;
}

@media (max-width: 640px) {
	.override-separator {
		display: none;
	}
}

.override-source {
	color: var(--ui-primary);
	white-space: nowrap;
	flex-shrink: 0;
}

.override-groups {
	color: var(--ui-text-dimmed);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Action Button */
.action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.375rem;
	height: 1.375rem;
	background: transparent;
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	cursor: pointer;
	flex-shrink: 0;
	opacity: 0.5;
	transition: all 0.15s ease;
}

.override-row:hover .action-btn {
	opacity: 1;
}

.action-btn:disabled {
	opacity: 0.3 !important;
	cursor: not-allowed;
}

.action-btn.reset:hover:not(:disabled) {
	color: var(--ui-warning);
	border-color: var(--ui-warning);
	background: color-mix(in oklch, var(--ui-warning) 15%, transparent);
	box-shadow: 0 0 6px color-mix(in oklch, var(--ui-warning) 30%, transparent);
}

.action-icon {
	width: 0.625rem;
	height: 0.625rem;
	color: var(--ui-text-muted);
}

.action-btn:hover:not(:disabled) .action-icon {
	color: inherit;
}
</style>
