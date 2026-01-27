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
		parts.push(override.title)
	}
	return parts.join(" - ")
}
</script>

<template>
	<section
		v-if="overrideData && overrideData.total_count > 0"
		class="edit-section"
	>
		<div class="section-header">
			<div class="section-title">
				<div class="section-icon">
					<UIcon
						name="i-lucide-lock"
						class="icon"
					/>
				</div>
				<div>
					<h2>Manual Overrides</h2>
					<p>Chapters you've manually enabled or disabled</p>
				</div>
			</div>

			<!-- Reset all button in header -->
			<button
				class="reset-button"
				:disabled="isPending"
				@click="resetAll"
			>
				<UIcon
					v-if="isPending"
					name="i-lucide-loader-2"
					class="spinner"
				/>
				<template v-else>
					<UIcon
						name="i-lucide-rotate-ccw"
						class="btn-icon"
					/>
					<span class="reset-text">Reset All</span>
				</template>
			</button>
		</div>

		<div class="section-body">
			<!-- Language tabs -->
			<div class="language-tabs">
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

			<!-- Reset language button -->
			<div
				v-if="filteredOverrides.length > 0"
				class="language-actions"
			>
				<button
					class="reset-language-btn"
					:disabled="isPending"
					@click="resetLanguage"
				>
					<UIcon
						name="i-lucide-rotate-ccw"
						class="btn-icon"
					/>
					Reset {{ activeLanguage }} overrides
				</button>
			</div>

			<!-- Enabled overrides -->
			<div
				v-if="enabledOverrides.length > 0"
				class="overrides-section"
			>
				<div class="section-label">
					<div class="label-badge enabled">
						<UIcon
							name="i-lucide-check"
							class="label-icon"
						/>
					</div>
					<span class="label-text">Manually Enabled</span>
					<span class="label-count">{{ enabledOverrides.length }}</span>
				</div>

				<div class="overrides-list">
					<div
						v-for="(override, index) in enabledOverrides"
						:key="override.id"
						class="override-row enabled"
						:style="{ '--stagger': index }"
					>
						<div class="override-info">
							<span class="override-chapter">{{ formatChapterTitle(override) }}</span>
							<span class="override-meta">
								<span class="meta-source">{{ override.source_name }}</span>
								<span
									v-if="override.groups.length > 0"
									class="meta-groups"
								>
									{{ override.groups.join(", ") }}
								</span>
							</span>
						</div>
						<div class="override-actions">
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
							<div class="override-badge enabled">
								<UIcon
									name="i-lucide-check"
									class="badge-icon"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Disabled overrides -->
			<div
				v-if="disabledOverrides.length > 0"
				class="overrides-section"
			>
				<div class="section-label">
					<div class="label-badge disabled">
						<UIcon
							name="i-lucide-x"
							class="label-icon"
						/>
					</div>
					<span class="label-text">Manually Disabled</span>
					<span class="label-count">{{ disabledOverrides.length }}</span>
				</div>

				<div class="overrides-list">
					<div
						v-for="(override, index) in disabledOverrides"
						:key="override.id"
						class="override-row disabled"
						:style="{ '--stagger': index }"
					>
						<div class="override-info">
							<span class="override-chapter">{{ formatChapterTitle(override) }}</span>
							<span class="override-meta">
								<span class="meta-source">{{ override.source_name }}</span>
								<span
									v-if="override.groups.length > 0"
									class="meta-groups"
								>
									{{ override.groups.join(", ") }}
								</span>
							</span>
						</div>
						<div class="override-actions">
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
							<div class="override-badge disabled">
								<UIcon
									name="i-lucide-x"
									class="badge-icon"
								/>
							</div>
						</div>
					</div>
				</div>
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
	background: color-mix(in oklch, var(--ui-warning) 15%, transparent);
	border-radius: 0.375rem;
}

.section-icon .icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-warning);
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

/* Reset button in header */
.reset-button {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem 0.625rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: transparent;
	border: 1px solid var(--ui-border);
	border-radius: 0.375rem;
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.reset-button:hover:not(:disabled) {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
	border-color: var(--ui-border);
}

.reset-button:active:not(:disabled) {
	transform: scale(0.97);
}

.reset-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-icon {
	width: 0.75rem;
	height: 0.75rem;
}

.reset-text {
	display: none;
}

@media (min-width: 480px) {
	.reset-text {
		display: inline;
	}
}

.spinner {
	width: 0.875rem;
	height: 0.875rem;
	animation: spin 0.8s linear infinite;
}

/* Section body */
.section-body {
	padding: 1rem 1.25rem 1.25rem;
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

/* Language tabs */
.language-tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
	padding: 0.25rem;
	background: var(--ui-bg);
	border-radius: 0.5rem;
	border: 1px solid var(--ui-border-muted);
}

.lang-tab {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem 0.625rem;
	font-size: var(--font-size-xs);
	font-weight: 600;
	letter-spacing: 0.025em;
	color: var(--ui-text-muted);
	background: transparent;
	border: none;
	border-radius: 0.375rem;
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.lang-tab:hover:not(.active) {
	background: var(--ui-bg-muted);
	color: var(--ui-text);
}

.lang-tab.active {
	color: var(--ui-warning);
	background: color-mix(in oklch, var(--ui-warning) 15%, transparent);
	box-shadow: 0 1px 2px color-mix(in oklch, var(--ui-warning) 15%, transparent);
}

.lang-code {
	display: block;
}

.lang-count {
	font-size: 0.625rem;
	font-weight: 700;
	padding: 0.0625rem 0.25rem;
	background: var(--ui-bg-muted);
	border-radius: 0.25rem;
}

.lang-tab.active .lang-count {
	background: color-mix(in oklch, var(--ui-warning) 25%, transparent);
	color: var(--ui-warning);
}

/* Language actions */
.language-actions {
	display: flex;
	justify-content: flex-end;
}

.reset-language-btn {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem 0.625rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.375rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.reset-language-btn:hover:not(:disabled) {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

.reset-language-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

/* Overrides section */
.overrides-section {
	display: flex;
	flex-direction: column;
	gap: 0.625rem;
}

.section-label {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.label-badge {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.375rem;
	height: 1.375rem;
	border-radius: 0.25rem;
}

.label-badge.enabled {
	background: var(--ui-success-soft);
}

.label-badge.disabled {
	background: var(--ui-error-soft);
}

.label-badge .label-icon {
	width: 0.75rem;
	height: 0.75rem;
}

.label-badge.enabled .label-icon {
	color: var(--ui-success);
}

.label-badge.disabled .label-icon {
	color: var(--ui-error);
}

.label-text {
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.label-count {
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-dimmed);
	padding: 0.0625rem 0.375rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border-muted);
	border-radius: 9999px;
}

/* Overrides list */
.overrides-list {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

/* Override row */
.override-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.625rem 0.75rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border-muted);
	border-radius: 0.5rem;
	transition: all 0.15s ease;
	animation: fadeSlideIn 0.25s ease-out backwards;
	animation-delay: calc(var(--stagger, 0) * 30ms);
}

@keyframes fadeSlideIn {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.override-row:hover {
	background: var(--ui-bg-muted);
	border-color: var(--ui-border);
}

/* Override info */
.override-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
	min-width: 0;
}

.override-chapter {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.override-meta {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

.meta-source {
	font-weight: 500;
}

.meta-groups {
	opacity: 0.7;
}

/* Override actions */
.override-actions {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex-shrink: 0;
}

.action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.5rem;
	height: 1.5rem;
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border-muted);
	border-radius: 0.25rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.action-btn:hover:not(:disabled) {
	background: var(--ui-bg-elevated);
	border-color: var(--ui-border);
}

.action-btn:active:not(:disabled) {
	transform: scale(0.95);
}

.action-btn:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.action-icon {
	width: 0.75rem;
	height: 0.75rem;
	color: var(--ui-text-muted);
}

/* Override badge */
.override-badge {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.5rem;
	height: 1.5rem;
	border-radius: 0.375rem;
	flex-shrink: 0;
}

.override-badge.enabled {
	background: var(--ui-success-soft);
}

.override-badge.disabled {
	background: var(--ui-error-soft);
}

.badge-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.override-badge.enabled .badge-icon {
	color: var(--ui-success);
}

.override-badge.disabled .badge-icon {
	color: var(--ui-error);
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
