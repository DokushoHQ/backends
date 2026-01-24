<script setup lang="ts">
import type { SelectedSerie } from "~/composables/useImportCart"

const props = defineProps<{
	serie: SelectedSerie
	selected: boolean
}>()

defineEmits<{
	click: []
}>()

const hasMatches = computed(() => (props.serie.similarMatches?.length || 0) > 0)
const hasCartDuplicates = computed(() => (props.serie.cartDuplicates?.length || 0) > 0)

const isConfigured = computed(() => {
	if (props.serie.action === "import") return true
	if (props.serie.action === "link" && props.serie.linkToSerieId) return true
	if (props.serie.linkToCartKey) return true
	return false
})

const status = computed(() => {
	if (props.serie.loadingSimilarity) return "loading"
	if (isConfigured.value) return "configured"
	if (hasCartDuplicates.value) return "cart-duplicate"
	if (hasMatches.value) return "needs-attention"
	return "pending"
})
</script>

<template>
	<div
		role="button"
		tabindex="0"
		class="review-compact-card"
		:class="{
			'is-selected': selected,
			'is-configured': status === 'configured',
			'needs-attention': status === 'needs-attention' || status === 'cart-duplicate',
		}"
		@click="$emit('click')"
		@keydown.enter="$emit('click')"
		@keydown.space.prevent="$emit('click')"
	>
		<SeriesCardBase
			:title="serie.title"
			:cover="serie.cover"
			:accent-color="status === 'needs-attention' || status === 'cart-duplicate' ? 'error' : 'primary'"
			:show-accent="selected || status === 'configured'"
		>
			<template #badge>
				<!-- Status badge -->
				<div
					class="status-badge"
					:class="{
						'status-badge--configured': status === 'configured',
						'status-badge--warning': status === 'needs-attention' || status === 'cart-duplicate',
						'status-badge--loading': status === 'loading',
						'status-badge--pending': status === 'pending',
					}"
				>
					<UIcon
						v-if="status === 'loading'"
						name="i-lucide-loader-2"
						class="badge-icon badge-icon--spin"
					/>
					<UIcon
						v-else-if="status === 'configured'"
						name="i-lucide-check"
						class="badge-icon"
					/>
					<UIcon
						v-else-if="status === 'cart-duplicate'"
						name="i-lucide-copy"
						class="badge-icon"
					/>
					<UIcon
						v-else-if="status === 'needs-attention'"
						name="i-lucide-alert-triangle"
						class="badge-icon"
					/>
					<UIcon
						v-else
						name="i-lucide-circle-dashed"
						class="badge-icon"
					/>
				</div>
				<!-- Primary badge for cart duplicates -->
				<div
					v-if="serie.isPrimaryInGroup"
					class="primary-badge"
				>
					Primary
				</div>
			</template>

			<template #badge-bottom>
				<!-- Source badge -->
				<div class="source-badge">
					{{ serie.sourceName }}
				</div>
			</template>
		</SeriesCardBase>
	</div>
</template>

<style scoped>
.review-compact-card {
	display: block;
	cursor: pointer;
}

.review-compact-card:hover :deep(.series-card-base) {
	transform: translateY(-6px) scale(1.02);
	box-shadow:
		0 12px 28px -8px color-mix(in oklch, var(--ui-text) 15%, transparent),
		0 4px 12px -4px color-mix(in oklch, var(--ui-text) 8%, transparent);
}

.review-compact-card:active :deep(.series-card-base) {
	transform: translateY(-2px) scale(1.01);
	transition-duration: 0.1s;
}

.review-compact-card:hover :deep(.cover-image) {
	transform: scale(1.08);
}

.review-compact-card:hover :deep(.spine-accent) {
	height: 100%;
}

.review-compact-card.is-selected :deep(.series-card-base) {
	border-color: var(--ui-primary);
	box-shadow: 0 0 0 2px var(--ui-primary-soft);
}

.review-compact-card.needs-attention.is-selected :deep(.series-card-base) {
	border-color: var(--ui-warning);
	box-shadow: 0 0 0 2px color-mix(in oklch, var(--ui-warning) 20%, transparent);
}

/* Focus state for accessibility */
.review-compact-card:focus-visible {
	outline: 2px solid var(--ui-primary);
	outline-offset: 2px;
}

/* Status badge */
.status-badge {
	position: absolute;
	top: 0.5rem;
	right: calc(0.75rem + 0.25rem);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.5rem;
	height: 1.5rem;
	border-radius: 50%;
	box-shadow: 0 2px 4px color-mix(in oklch, var(--ui-text) 20%, transparent);
}

.badge-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.badge-icon--spin {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.status-badge--configured {
	background: var(--ui-success);
	color: white;
}

.status-badge--warning {
	background: var(--ui-warning);
	color: white;
}

.status-badge--loading {
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}

.status-badge--pending {
	background: var(--ui-bg-muted);
	color: var(--ui-text-dimmed);
}

/* Primary badge */
.primary-badge {
	position: absolute;
	top: 0.5rem;
	left: 0.5rem;
	padding: 0.125rem 0.375rem;
	font-size: 0.5625rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: white;
	background: var(--ui-primary);
	border-radius: 0.25rem;
	box-shadow: 0 2px 4px color-mix(in oklch, var(--ui-text) 20%, transparent);
}

/* Source badge */
.source-badge {
	position: absolute;
	bottom: 0.5rem;
	left: 0.5rem;
	padding: 0.25rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: white;
	background: color-mix(in oklch, black 60%, transparent);
	backdrop-filter: blur(4px);
	border-radius: 0.25rem;
}
</style>
