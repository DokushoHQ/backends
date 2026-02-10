<script setup lang="ts">
import type { RecentSerie } from "~/composables/useImportReview"

const open = defineModel<boolean>("open", { default: false })

defineProps<{
	searchQuery: string
	searchResults: RecentSerie[]
	recentSeries: RecentSerie[]
	loadingSearch: boolean
	loadingRecent: boolean
}>()

const emit = defineEmits<{
	"update:searchQuery": [value: string]
	"search": [query: string]
	"select": [serieId: string, serieTitle: string, serieCover: string | null]
	"close": []
}>()

const localQuery = ref("")
const searchTimeout = ref<NodeJS.Timeout | null>(null)
const searchFocused = ref(false)

function handleInput(value: string) {
	localQuery.value = value
	emit("update:searchQuery", value)

	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value)
	}
	searchTimeout.value = setTimeout(() => {
		emit("search", value)
	}, 300)
}

function clearSearch() {
	localQuery.value = ""
	emit("update:searchQuery", "")
}

watch(open, (isOpen) => {
	if (!isOpen) {
		localQuery.value = ""
		if (searchTimeout.value) {
			clearTimeout(searchTimeout.value)
		}
	}
})
</script>

<template>
	<USlideover
		v-model:open="open"
		side="right"
		:ui="{ content: 'sm:max-w-md' }"
	>
		<template #content>
			<div class="sheet-container">
				<!-- Header -->
				<div class="sheet-header">
					<div class="header-content">
						<div class="header-icon">
							<UIcon
								name="i-lucide-library"
								class="icon"
							/>
						</div>
						<div>
							<h3 class="header-title">
								Link to Existing
							</h3>
							<p class="header-subtitle">
								Search your library
							</p>
						</div>
					</div>
					<button
						class="close-btn"
						type="button"
						@click="emit('close')"
					>
						<UIcon
							name="i-lucide-x"
							class="close-icon"
						/>
					</button>
				</div>

				<!-- Search -->
				<div class="search-section">
					<div
						class="search-wrapper"
						:class="{ 'is-focused': searchFocused, 'is-searching': loadingSearch }"
					>
						<UIcon
							name="i-lucide-search"
							class="search-icon"
						/>
						<input
							v-model="localQuery"
							type="text"
							class="search-input"
							placeholder="Search by title..."
							@input="handleInput(($event.target as HTMLInputElement).value)"
							@focus="searchFocused = true"
							@blur="searchFocused = false"
						>
						<button
							v-if="localQuery"
							class="clear-btn"
							type="button"
							@click="clearSearch"
						>
							<UIcon
								name="i-lucide-x"
								class="clear-icon"
							/>
						</button>
					</div>
					<div
						v-if="loadingSearch"
						class="search-progress"
					/>
				</div>

				<!-- Content -->
				<div class="sheet-content">
					<!-- Search Results -->
					<template v-if="localQuery.trim()">
						<div
							v-if="loadingSearch"
							class="loading-state"
						>
							<UIcon
								name="i-lucide-loader-2"
								class="loading-spinner"
							/>
							<span class="loading-text">Searching...</span>
						</div>

						<div
							v-else-if="searchResults.length === 0"
							class="empty-state"
						>
							<UIcon
								name="i-lucide-search-x"
								class="empty-icon"
							/>
							<p class="empty-title">
								No results found
							</p>
							<p class="empty-hint">
								Try a different search term
							</p>
						</div>

						<div
							v-else
							class="results-list"
						>
							<button
								v-for="serie in searchResults"
								:key="serie.id"
								class="serie-item"
								@click="emit('select', serie.id, serie.title, serie.cover)"
							>
								<div class="serie-cover">
									<NuxtImg
										v-if="serie.cover"
										:src="serie.cover"
										provider="smart"
										:alt="serie.title"
										class="cover-image"
									/>
									<UIcon
										v-else
										name="i-lucide-book-open"
										class="cover-placeholder"
									/>
								</div>
								<div class="serie-info">
									<span class="serie-title">{{ serie.title }}</span>
									<span class="serie-meta">{{ serie.sources.join(', ') }}</span>
								</div>
								<div class="select-indicator">
									<UIcon
										name="i-lucide-plus"
										class="select-icon"
									/>
								</div>
							</button>
						</div>
					</template>

					<!-- Recent Series -->
					<template v-else>
						<div class="section-header">
							<UIcon
								name="i-lucide-clock"
								class="section-icon"
							/>
							<span class="section-title">Recently Imported</span>
						</div>

						<div
							v-if="loadingRecent"
							class="loading-state"
						>
							<UIcon
								name="i-lucide-loader-2"
								class="loading-spinner"
							/>
							<span class="loading-text">Loading...</span>
						</div>

						<div
							v-else-if="recentSeries.length === 0"
							class="empty-state"
						>
							<UIcon
								name="i-lucide-inbox"
								class="empty-icon"
							/>
							<p class="empty-title">
								No recent imports
							</p>
							<p class="empty-hint">
								Import some series first
							</p>
						</div>

						<div
							v-else
							class="results-list"
						>
							<button
								v-for="serie in recentSeries"
								:key="serie.id"
								class="serie-item"
								@click="emit('select', serie.id, serie.title, serie.cover)"
							>
								<div class="serie-cover">
									<NuxtImg
										v-if="serie.cover"
										:src="serie.cover"
										provider="smart"
										:alt="serie.title"
										class="cover-image"
									/>
									<UIcon
										v-else
										name="i-lucide-book-open"
										class="cover-placeholder"
									/>
								</div>
								<div class="serie-info">
									<span class="serie-title">{{ serie.title }}</span>
									<span class="serie-meta">
										{{ serie.sources.join(', ') }}
										<span class="meta-separator">&bull;</span>
										{{ serie.chapterCount }} chapters
									</span>
								</div>
								<div class="select-indicator">
									<UIcon
										name="i-lucide-plus"
										class="select-icon"
									/>
								</div>
							</button>
						</div>
					</template>
				</div>
			</div>
		</template>
	</USlideover>
</template>

<style scoped>
.sheet-container {
	display: flex;
	flex-direction: column;
	height: 100%;
	background: var(--ui-bg);
}

/* Header */
.sheet-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1.25rem 1rem;
	border-bottom: 1px solid var(--ui-border);
	background: var(--ui-bg-elevated);
}

.header-content {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.header-icon {
	width: 2.5rem;
	height: 2.5rem;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--ui-primary-soft);
	border-radius: 0.5rem;
}

.header-icon .icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-primary);
}

.header-title {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
}

.header-subtitle {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin: 0;
}

.close-btn {
	width: 2rem;
	height: 2rem;
	display: flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
	border-radius: 0.375rem;
	cursor: pointer;
	color: var(--ui-text-muted);
	transition: all 0.15s ease;
}

.close-btn:hover {
	background: var(--ui-bg-muted);
	color: var(--ui-text);
}

.close-icon {
	width: 1.125rem;
	height: 1.125rem;
}

/* Search */
.search-section {
	padding: 1rem;
	border-bottom: 1px solid var(--ui-border);
	position: relative;
}

.search-wrapper {
	display: flex;
	align-items: center;
	gap: 0.625rem;
	padding: 0 0.875rem;
	height: 2.75rem;
	background: var(--ui-bg-muted);
	border: 1px solid transparent;
	border-radius: 0.5rem;
	transition: all 0.2s ease;
}

.search-wrapper:hover {
	background: var(--ui-bg-elevated);
	border-color: var(--ui-border);
}

.search-wrapper.is-focused {
	background: var(--ui-bg-elevated);
	border-color: var(--ui-primary);
	box-shadow: 0 0 0 3px var(--ui-primary-soft);
}

.search-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-dimmed);
	flex-shrink: 0;
	transition: color 0.2s ease;
}

.search-wrapper.is-focused .search-icon {
	color: var(--ui-primary);
}

.search-wrapper.is-searching .search-icon {
	animation: pulse 1s ease infinite;
}

@keyframes pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.4; }
}

.search-input {
	flex: 1;
	min-width: 0;
	height: 100%;
	padding: 0;
	font-size: var(--font-size-sm);
	color: var(--ui-text);
	background: transparent;
	border: none;
	outline: none;
}

.search-input::placeholder {
	color: var(--ui-text-dimmed);
}

.clear-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.375rem;
	height: 1.375rem;
	padding: 0;
	background: var(--ui-bg-muted);
	border: none;
	border-radius: 50%;
	cursor: pointer;
	flex-shrink: 0;
	transition: all 0.15s ease;
}

.clear-btn:hover {
	background: color-mix(in oklch, var(--ui-text-muted) 25%, transparent);
}

.clear-icon {
	width: 0.75rem;
	height: 0.75rem;
	color: var(--ui-text-muted);
}

.search-progress {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 2px;
	background: linear-gradient(90deg, transparent, var(--ui-primary), transparent);
	background-size: 200% 100%;
	animation: progress 1.5s ease infinite;
}

@keyframes progress {
	0% { background-position: 200% 0; }
	100% { background-position: -200% 0; }
}

/* Content */
.sheet-content {
	flex: 1;
	overflow-y: auto;
	min-height: 0;
}

/* Section Header */
.section-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	background: var(--ui-bg-muted);
	border-bottom: 1px solid var(--ui-border);
}

.section-icon {
	width: 0.875rem;
	height: 0.875rem;
	color: var(--ui-text-muted);
}

.section-title {
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.03em;
}

/* Loading State */
.loading-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 3rem 1rem;
	gap: 0.75rem;
}

.loading-spinner {
	width: 1.5rem;
	height: 1.5rem;
	color: var(--ui-primary);
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.loading-text {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

/* Empty State */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 3rem 1rem;
	text-align: center;
}

.empty-icon {
	width: 2.5rem;
	height: 2.5rem;
	color: var(--ui-text-dimmed);
	opacity: 0.5;
	margin-bottom: 0.75rem;
}

.empty-title {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text-muted);
	margin: 0;
}

.empty-hint {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	margin: 0.25rem 0 0;
}

/* Results List */
.results-list {
	display: flex;
	flex-direction: column;
}

.serie-item {
	display: flex;
	align-items: center;
	gap: 0.875rem;
	padding: 0.875rem 1rem;
	background: transparent;
	border: none;
	border-bottom: 1px solid var(--ui-border);
	cursor: pointer;
	text-align: left;
	transition: background-color 0.15s ease;
}

.serie-item:hover {
	background: var(--ui-bg-muted);
}

.serie-item:active {
	background: var(--ui-bg-elevated);
}

.serie-cover {
	flex-shrink: 0;
	width: 2.75rem;
	height: 4rem;
	border-radius: 0.375rem;
	overflow: hidden;
	background: var(--ui-bg-muted);
	display: flex;
	align-items: center;
	justify-content: center;
}

.cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.cover-placeholder {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-text-dimmed);
}

.serie-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.serie-title {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.serie-meta {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

.meta-separator {
	margin: 0 0.25rem;
	opacity: 0.5;
}

.select-indicator {
	flex-shrink: 0;
	width: 2rem;
	height: 2rem;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--ui-bg-muted);
	border-radius: 50%;
	transition: all 0.15s ease;
}

.serie-item:hover .select-indicator {
	background: var(--ui-primary);
	color: white;
}

.select-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
}

.serie-item:hover .select-icon {
	color: white;
}
</style>
