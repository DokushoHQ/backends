<script setup lang="ts">
import type { SelectedSerie } from "~/composables/useImportCart"

const props = defineProps<{
	serie: SelectedSerie
}>()

const emit = defineEmits<{
	setAction: [action: "import" | "link", linkToSerieId?: string, linkToSerieTitle?: string, linkToSerieCover?: string | null]
	remove: []
	openLibrarySearch: []
	setGroupPrimary: [cartKey: string]
}>()

const showMoreMatches = ref(false)

const topMatch = computed(() => props.serie.similarMatches?.[0])
const additionalMatches = computed(() => props.serie.similarMatches?.slice(1) || [])
const hasMatches = computed(() => (props.serie.similarMatches?.length || 0) > 0)
const hasCartDuplicates = computed(() => (props.serie.cartDuplicates?.length || 0) > 0)
const currentCartKey = computed(() => `${props.serie.sourceId}:${props.serie.externalId}`)

function handleActionChange(value: string) {
	if (value === "import") {
		emit("setAction", "import")
	}
	else if (value === "link-other") {
		emit("openLibrarySearch")
	}
	else if (value.startsWith("link:")) {
		const serieId = value.replace("link:", "")
		const match = props.serie.similarMatches?.find(m => m.serieId === serieId)
		emit("setAction", "link", serieId, match?.title, match?.cover)
	}
}

const selectedValue = computed(() => {
	if (!props.serie.action) return undefined
	if (props.serie.action === "import") return "import"
	if (props.serie.action === "link" && props.serie.linkToSerieId) {
		const isKnownMatch = props.serie.similarMatches?.some(m => m.serieId === props.serie.linkToSerieId)
		if (isKnownMatch) {
			return `link:${props.serie.linkToSerieId}`
		}
		return "link-other"
	}
	return undefined
})

const radioGroupName = computed(() => `action-${props.serie.sourceId}-${props.serie.externalId}`)

const isActionComplete = computed(() => {
	if (props.serie.action === "import") return true
	if (props.serie.action === "link" && props.serie.linkToSerieId) return true
	if (props.serie.linkToCartKey) return true
	return false
})
</script>

<template>
	<div
		class="review-card"
		:class="{ 'has-warning': hasMatches || hasCartDuplicates }"
	>
		<!-- Accent bar -->
		<div class="card-accent" />

		<!-- Main content area -->
		<div class="card-body">
			<!-- Header: Cover + Title + Remove -->
			<div class="card-header">
				<div class="cover-frame">
					<NuxtImg
						v-if="serie.cover"
						:src="serie.cover"
						provider="smart"
						:alt="serie.title"
						class="cover-image"
					/>
					<div
						v-else
						class="cover-placeholder"
					>
						<UIcon
							name="i-lucide-book-open"
							class="placeholder-icon"
						/>
					</div>
					<!-- Status indicator on cover -->
					<div
						class="cover-status"
						:class="{
							'status-warning': hasMatches || hasCartDuplicates,
							'status-success': !hasMatches && !hasCartDuplicates && !serie.loadingSimilarity,
							'status-loading': serie.loadingSimilarity,
						}"
					>
						<UIcon
							v-if="serie.loadingSimilarity"
							name="i-lucide-loader-2"
							class="status-icon status-icon--spin"
						/>
						<UIcon
							v-else-if="hasCartDuplicates"
							name="i-lucide-copy"
							class="status-icon"
						/>
						<UIcon
							v-else-if="hasMatches"
							name="i-lucide-alert-triangle"
							class="status-icon"
						/>
						<UIcon
							v-else
							name="i-lucide-check"
							class="status-icon"
						/>
					</div>
				</div>

				<div class="header-content">
					<h3 class="serie-title">
						{{ serie.title }}
					</h3>
					<div class="serie-meta">
						<span class="source-badge">{{ serie.sourceName }}</span>
						<span
							v-if="serie.isPrimaryInGroup"
							class="primary-badge"
						>
							Primary
						</span>
					</div>
				</div>

				<button
					class="remove-btn"
					type="button"
					@click="emit('remove')"
				>
					<UIcon
						name="i-lucide-x"
						class="remove-icon"
					/>
				</button>
			</div>

			<!-- Status message -->
			<div
				v-if="!serie.loadingSimilarity"
				class="status-message"
			>
				<template v-if="hasCartDuplicates">
					<span class="status-text status-text--warning">
						Same series from {{ serie.cartDuplicates!.length + 1 }} sources
					</span>
				</template>
				<template v-else-if="hasMatches">
					<span class="status-text status-text--warning">
						Similar series found in library
					</span>
				</template>
				<template v-else>
					<span class="status-text status-text--success">
						No similar series found
					</span>
				</template>
			</div>

			<div
				v-else
				class="status-message"
			>
				<span class="status-text status-text--loading">
					Checking for duplicates...
				</span>
			</div>

			<!-- Actions -->
			<div
				v-if="!serie.loadingSimilarity"
				class="actions-section"
			>
				<!-- Cart duplicates: Primary selection -->
				<div
					v-if="hasCartDuplicates"
					class="source-selection"
				>
					<p class="selection-label">
						Choose primary source:
					</p>
					<div class="source-options">
						<label
							class="source-option"
							:class="{ 'is-selected': serie.isPrimaryInGroup }"
						>
							<input
								type="radio"
								:name="`primary-mobile-${currentCartKey}`"
								:checked="serie.isPrimaryInGroup"
								class="sr-only"
								@change="emit('setGroupPrimary', currentCartKey)"
							>
							<span class="option-radio" />
							<span class="option-content">
								<span class="option-label">{{ serie.sourceName }}</span>
								<span class="option-hint">Current</span>
							</span>
						</label>

						<label
							v-for="dup in serie.cartDuplicates"
							:key="dup.cartKey"
							class="source-option"
							:class="{ 'is-selected': serie.linkToCartKey === dup.cartKey }"
						>
							<input
								type="radio"
								:name="`primary-mobile-${currentCartKey}`"
								:checked="serie.linkToCartKey === dup.cartKey"
								class="sr-only"
								@change="emit('setGroupPrimary', dup.cartKey)"
							>
							<span class="option-radio" />
							<span class="option-content">
								<span class="option-label">{{ dup.sourceName }}</span>
								<span class="option-hint">{{ Math.round(dup.similarity * 100) }}% match</span>
							</span>
						</label>
					</div>
				</div>

				<!-- Regular action options -->
				<div
					v-else
					class="action-options"
				>
					<!-- Import as new -->
					<label
						class="action-option"
						:class="{ 'is-selected': selectedValue === 'import' }"
					>
						<input
							type="radio"
							:name="radioGroupName"
							value="import"
							:checked="selectedValue === 'import'"
							class="sr-only"
							@change="handleActionChange('import')"
						>
						<span class="option-radio" />
						<span class="option-label">Import as new</span>
					</label>

					<!-- Link to match -->
					<label
						v-if="topMatch"
						class="action-option"
						:class="{ 'is-selected': selectedValue === `link:${topMatch.serieId}` }"
					>
						<input
							type="radio"
							:name="radioGroupName"
							:value="`link:${topMatch.serieId}`"
							:checked="selectedValue === `link:${topMatch.serieId}`"
							class="sr-only"
							@change="handleActionChange(`link:${topMatch.serieId}`)"
						>
						<span class="option-radio" />
						<span class="option-content">
							<span class="option-label-row">
								<span class="option-label">Link to existing</span>
								<span class="option-match">{{ Math.round(topMatch.similarity * 100) }}%</span>
							</span>
							<span class="option-title">{{ topMatch.title }}</span>
						</span>
					</label>

					<!-- Link to other -->
					<label
						class="action-option"
						:class="{ 'is-selected': selectedValue === 'link-other' }"
					>
						<input
							type="radio"
							:name="radioGroupName"
							value="link-other"
							:checked="selectedValue === 'link-other'"
							class="sr-only"
							@change="handleActionChange('link-other')"
						>
						<span class="option-radio" />
						<span class="option-label">Link to other</span>
						<button
							class="search-link"
							type="button"
							@click.prevent="emit('openLibrarySearch')"
						>
							Search...
						</button>
					</label>

					<!-- More matches -->
					<button
						v-if="additionalMatches.length > 0 && !showMoreMatches"
						class="more-matches-btn"
						type="button"
						@click="showMoreMatches = true"
					>
						<UIcon
							name="i-lucide-plus"
							class="more-icon"
						/>
						{{ additionalMatches.length }} more matches
					</button>

					<!-- Additional matches -->
					<template v-if="showMoreMatches">
						<label
							v-for="match in additionalMatches"
							:key="match.serieId"
							class="action-option"
							:class="{ 'is-selected': selectedValue === `link:${match.serieId}` }"
						>
							<input
								type="radio"
								:name="radioGroupName"
								:value="`link:${match.serieId}`"
								:checked="selectedValue === `link:${match.serieId}`"
								class="sr-only"
								@change="handleActionChange(`link:${match.serieId}`)"
							>
							<span class="option-radio" />
							<span class="option-content">
								<span class="option-label-row">
									<span class="option-label">Link to existing</span>
									<span class="option-match">{{ Math.round(match.similarity * 100) }}%</span>
								</span>
								<span class="option-title">{{ match.title }}</span>
							</span>
						</label>
					</template>
				</div>

				<!-- Validation error -->
				<div
					v-if="!hasCartDuplicates && !isActionComplete"
					class="validation-error"
				>
					<UIcon
						name="i-lucide-alert-circle"
						class="error-icon"
					/>
					{{ serie.action === 'link' && !serie.linkToSerieId ? 'Select a series to link' : 'Select an action' }}
				</div>

				<!-- Linked preview -->
				<div
					v-if="!hasCartDuplicates && serie.action === 'link' && serie.linkToSerieId && serie.linkToSerieTitle"
					class="linked-preview"
				>
					<div class="preview-cover">
						<NuxtImg
							v-if="serie.linkToSerieCover"
							:src="serie.linkToSerieCover"
							provider="smart"
							:alt="serie.linkToSerieTitle"
							class="preview-image"
						/>
						<UIcon
							v-else
							name="i-lucide-book-open"
							class="preview-placeholder"
						/>
					</div>
					<div class="preview-info">
						<span class="preview-label">Will link to</span>
						<span class="preview-title">{{ serie.linkToSerieTitle }}</span>
					</div>
					<button
						class="preview-change"
						type="button"
						@click="emit('openLibrarySearch')"
					>
						Change
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.review-card {
	position: relative;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	overflow: hidden;
}

/* Accent bar - left edge indicator */
.card-accent {
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: 3px;
	background: var(--ui-success);
	transition: background-color 0.2s ease;
}

.review-card.has-warning .card-accent {
	background: var(--ui-warning);
}

.card-body {
	padding: 1rem;
	padding-left: 1.25rem;
}

/* Header */
.card-header {
	display: flex;
	align-items: flex-start;
	gap: 0.875rem;
}

.cover-frame {
	position: relative;
	flex-shrink: 0;
	width: 3.5rem;
	height: 5rem;
	border-radius: 0.375rem;
	overflow: hidden;
	background: var(--ui-bg-muted);
}

.cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.cover-placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(
		145deg,
		var(--ui-bg-muted) 0%,
		color-mix(in oklch, var(--ui-bg-muted) 80%, var(--ui-border)) 100%
	);
}

.placeholder-icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-text-dimmed);
}

.cover-status {
	position: absolute;
	bottom: -0.25rem;
	right: -0.25rem;
	width: 1.375rem;
	height: 1.375rem;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2px solid var(--ui-bg-elevated);
}

.cover-status.status-success {
	background: var(--ui-success);
	color: white;
}

.cover-status.status-warning {
	background: var(--ui-warning);
	color: white;
}

.cover-status.status-loading {
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}

.status-icon {
	width: 0.75rem;
	height: 0.75rem;
}

.status-icon--spin {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.header-content {
	flex: 1;
	min-width: 0;
	padding-top: 0.125rem;
}

.serie-title {
	font-size: var(--font-size-base);
	font-weight: 600;
	color: var(--ui-text);
	line-height: 1.35;
	margin: 0;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.serie-meta {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-top: 0.375rem;
}

.source-badge {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

.primary-badge {
	font-size: 0.625rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	padding: 0.125rem 0.375rem;
	background: var(--ui-primary);
	color: white;
	border-radius: 0.25rem;
}

.remove-btn {
	flex-shrink: 0;
	width: 1.75rem;
	height: 1.75rem;
	display: flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
	border-radius: 0.375rem;
	cursor: pointer;
	color: var(--ui-text-dimmed);
	transition: all 0.15s ease;
}

.remove-btn:hover {
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

.remove-icon {
	width: 1rem;
	height: 1rem;
}

/* Status message */
.status-message {
	margin-top: 0.75rem;
	padding-top: 0.75rem;
	border-top: 1px solid var(--ui-border);
}

.status-text {
	font-size: var(--font-size-sm);
	font-weight: 500;
}

.status-text--success {
	color: var(--ui-success);
}

.status-text--warning {
	color: var(--ui-warning);
}

.status-text--loading {
	color: var(--ui-text-muted);
}

/* Actions section */
.actions-section {
	margin-top: 0.875rem;
}

.source-selection,
.action-options {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.selection-label {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin: 0 0 0.25rem;
}

/* Action/Source options */
.action-option,
.source-option {
	display: flex;
	align-items: center;
	gap: 0.625rem;
	padding: 0.625rem 0.75rem;
	background: var(--ui-bg-muted);
	border: 1px solid transparent;
	border-radius: 0.375rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.action-option:hover,
.source-option:hover {
	border-color: var(--ui-border);
}

.action-option.is-selected,
.source-option.is-selected {
	background: var(--ui-primary-soft);
	border-color: var(--ui-primary);
}

.option-radio {
	flex-shrink: 0;
	width: 1rem;
	height: 1rem;
	border: 2px solid var(--ui-border);
	border-radius: 50%;
	position: relative;
	transition: all 0.15s ease;
}

.action-option.is-selected .option-radio,
.source-option.is-selected .option-radio {
	border-color: var(--ui-primary);
}

.action-option.is-selected .option-radio::after,
.source-option.is-selected .option-radio::after {
	content: "";
	position: absolute;
	inset: 3px;
	background: var(--ui-primary);
	border-radius: 50%;
}

.option-content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
}

.option-label-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
}

.option-label {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	line-height: 1.3;
}

.option-match {
	flex-shrink: 0;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
	padding: 0.125rem 0.375rem;
	border-radius: 0.25rem;
}

.option-title {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.option-hint {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

.search-link {
	margin-left: auto;
	padding: 0.25rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-primary);
	background: transparent;
	border: 1px solid var(--ui-primary);
	border-radius: 0.25rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.search-link:hover {
	background: var(--ui-primary);
	color: white;
}

.more-matches-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	padding: 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: transparent;
	border: 1px dashed var(--ui-border);
	border-radius: 0.375rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.more-matches-btn:hover {
	border-color: var(--ui-primary);
	color: var(--ui-primary);
}

.more-icon {
	width: 0.875rem;
	height: 0.875rem;
}

/* Validation error */
.validation-error {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	margin-top: 0.75rem;
	padding: 0.5rem 0.625rem;
	font-size: var(--font-size-sm);
	color: var(--ui-error);
	background: var(--ui-error-soft);
	border-radius: 0.375rem;
}

.error-icon {
	width: 0.875rem;
	height: 0.875rem;
	flex-shrink: 0;
}

/* Linked preview */
.linked-preview {
	display: flex;
	align-items: center;
	gap: 0.625rem;
	margin-top: 0.75rem;
	padding: 0.625rem;
	background: color-mix(in oklch, var(--ui-success) 8%, transparent);
	border: 1px solid color-mix(in oklch, var(--ui-success) 25%, transparent);
	border-radius: 0.375rem;
}

.preview-cover {
	flex-shrink: 0;
	width: 2rem;
	height: 2.75rem;
	border-radius: 0.25rem;
	overflow: hidden;
	background: var(--ui-bg-muted);
	display: flex;
	align-items: center;
	justify-content: center;
}

.preview-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.preview-placeholder {
	width: 0.875rem;
	height: 0.875rem;
	color: var(--ui-text-dimmed);
}

.preview-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
}

.preview-label {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

.preview-title {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.preview-change {
	flex-shrink: 0;
	padding: 0.25rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.preview-change:hover {
	border-color: var(--ui-text-muted);
	color: var(--ui-text);
}

/* Utility */
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border-width: 0;
}
</style>
