<script setup lang="ts">
import type { UIChapter, UIChapterItem } from "#shared/ui/type/chapter"

interface ChapterAvailability {
	language: string
	missing_chapters: number[]
	missing_count: number
	available_count: number
	ready_count: number
	auto_enabled_count: number
}

const props = defineProps<{
	chapters: UIChapter[]
	availability: ChapterAvailability[]
	isAdmin: boolean
	serieId: string
	loading: boolean
}>()

defineEmits<{
	chaptersDeleted: []
	chaptersAcknowledged: []
}>()

// Derive languages from chapters data
const languages = computed(() => {
	const langMap = new Map<string, number>()
	for (const chapter of props.chapters) {
		langMap.set(chapter.language, (langMap.get(chapter.language) ?? 0) + 1)
	}
	return Array.from(langMap.entries())
		.map(([lang, count]) => ({ lang, count }))
		.sort((a, b) => b.count - a.count) // Sort by count descending
})

// Selected language (default to first/most common)
const selectedLanguage = ref<string | null>(null)

// Initialize selected language when languages are available
watch(languages, (langs) => {
	const firstLang = langs[0]
	if (firstLang && !selectedLanguage.value) {
		selectedLanguage.value = firstLang.lang
	}
}, { immediate: true })

// Get availability data for selected language
const selectedAvailability = computed(() => {
	if (!selectedLanguage.value) return null
	return props.availability.find(a => a.language === selectedLanguage.value)
})

// Filter chapters by selected language
const filteredChapters = computed(() => {
	if (!selectedLanguage.value) return []
	return props.chapters.filter(c => c.language === selectedLanguage.value)
})

// Transform to UIChapterItem format for ChapterTable
const chapterItems = computed<UIChapterItem[]>(() => {
	return filteredChapters.value.map(c => ({ type: "chapter" as const, data: c }))
})

// Missing chapters for selected language
const missingChapters = computed(() => {
	return selectedAvailability.value?.missing_chapters ?? []
})

// Enabled/disabled counts for selected language
const enabledCount = computed(() => filteredChapters.value.filter(c => c.enabled).length)
const disabledCount = computed(() => filteredChapters.value.filter(c => !c.enabled).length)

// Collapsible sections state
const missingExpanded = ref(false)
const chaptersExpanded = ref(true)

// Description for card header
const description = computed(() => {
	if (props.loading) return "Loading chapters..."
	const total = props.chapters.length
	const langs = languages.value.length
	return `${total} total across ${langs} language${langs !== 1 ? "s" : ""}`
})
</script>

<template>
	<UiContentCard
		title="Chapters"
		:description="description"
		icon="i-lucide-layers"
		color="purple"
	>
		<div
			v-if="loading"
			class="loading-state"
		>
			<UIcon
				name="i-lucide-loader-2"
				class="loading-spinner"
			/>
		</div>

		<template v-else>
			<!-- Language Tabs -->
			<div class="language-tabs">
				<button
					v-for="{ lang, count } in languages"
					:key="lang"
					class="language-tab"
					:class="{ active: selectedLanguage === lang }"
					@click="selectedLanguage = lang"
				>
					<span class="lang-code">{{ lang }}</span>
					<span class="lang-count">{{ count }}</span>
				</button>
			</div>

			<!-- Missing Chapters Section -->
			<div
				v-if="missingChapters.length > 0"
				class="missing-section"
			>
				<button
					class="section-header collapsible"
					@click="missingExpanded = !missingExpanded"
				>
					<div class="section-header-left">
						<UIcon
							name="i-lucide-alert-triangle"
							class="section-icon warning"
						/>
						<span class="section-title">Missing Chapters</span>
						<UBadge
							variant="subtle"
							color="warning"
							size="sm"
						>
							{{ missingChapters.length }}
						</UBadge>
					</div>
					<UIcon
						:name="missingExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
						class="collapse-icon"
					/>
				</button>

				<div
					v-if="missingExpanded"
					class="missing-chips"
				>
					<span
						v-for="num in missingChapters"
						:key="num"
						class="missing-chip"
					>
						{{ num }}
					</span>
				</div>
			</div>

			<!-- Available Chapters Section -->
			<div class="chapters-section">
				<button
					class="section-header collapsible"
					@click="chaptersExpanded = !chaptersExpanded"
				>
					<div class="section-header-left">
						<UIcon
							name="i-lucide-book-open"
							class="section-icon"
						/>
						<span class="section-title">Available Chapters</span>
						<UBadge
							variant="subtle"
							size="sm"
						>
							{{ filteredChapters.length }}
						</UBadge>
						<span
							v-if="disabledCount > 0"
							class="disabled-note"
						>
							({{ enabledCount }} enabled, {{ disabledCount }} disabled)
						</span>
					</div>
					<UIcon
						:name="chaptersExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
						class="collapse-icon"
					/>
				</button>

				<div
					v-if="chaptersExpanded"
					class="chapters-table-wrapper"
				>
					<SeriesChapterTable
						:items="chapterItems"
						:is-admin="isAdmin"
						:serie-id="serieId"
						@chapters-deleted="$emit('chaptersDeleted')"
						@chapters-acknowledged="$emit('chaptersAcknowledged')"
					/>
				</div>
			</div>
		</template>
	</UiContentCard>
</template>

<style scoped>
.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rem;
}

.loading-spinner {
	width: 2rem;
	height: 2rem;
	color: var(--ui-text-muted);
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Language Tabs */
.language-tabs {
	display: flex;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	border-bottom: 1px solid var(--ui-border);
	overflow-x: auto;
}

.language-tab {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
	border-radius: 0.375rem;
	border: 1px solid var(--ui-border);
	background: transparent;
	color: var(--ui-text-muted);
	font-size: var(--font-size-sm);
	font-weight: 500;
	cursor: pointer;
	transition: all 0.15s ease;
	white-space: nowrap;
}

.language-tab:hover {
	background: var(--ui-bg-muted);
	color: var(--ui-text);
}

.language-tab.active {
	background: color-mix(in oklch, var(--color-purple) 15%, transparent);
	border-color: var(--color-purple);
	color: var(--color-purple);
}

.lang-code {
	text-transform: uppercase;
}

.lang-count {
	padding: 0.125rem 0.375rem;
	border-radius: 9999px;
	background: var(--ui-bg-muted);
	font-size: var(--font-size-xs);
}

.language-tab.active .lang-count {
	background: color-mix(in oklch, var(--color-purple) 25%, transparent);
}

/* Section Headers */
.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 0.75rem 1rem;
	border: none;
	background: transparent;
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.section-header:hover {
	background: var(--ui-bg-muted);
}

.section-header-left {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.section-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
}

.section-icon.warning {
	color: var(--ui-warning);
}

.section-title {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.disabled-note {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

.collapse-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
}

/* Missing Chips */
.missing-section {
	border-bottom: 1px solid var(--ui-border);
}

.missing-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
	padding: 0.5rem 1rem 1rem;
}

.missing-chip {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 2rem;
	padding: 0.25rem 0.5rem;
	border-radius: 0.25rem;
	background: color-mix(in oklch, var(--ui-warning) 15%, transparent);
	color: var(--ui-warning);
	font-size: var(--font-size-xs);
	font-weight: 500;
}

/* Chapters Section */
.chapters-section {
	display: flex;
	flex-direction: column;
}

.chapters-table-wrapper {
	border-top: 1px solid var(--ui-border);
}
</style>
