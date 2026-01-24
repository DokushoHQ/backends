<script setup lang="ts">
// Minimal chapter interface for health panel - matches API response structure
interface ChapterWithHealth {
	id: string
	chapter_number: number | null
	volume_number: number | null
	title: string | null
	page_fetch_status: string
	source: { name: string }
}

interface Props {
	serieId: string
	healthCounts: {
		pending: number
		inProgress: number
		success: number
		partial: number
		failed: number
		permanentlyFailed: number
		incomplete: number
	}
	chapters: ChapterWithHealth[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
	retried: []
}>()

const toast = useToast()
const expanded = ref(false)
const retryingChapter = ref<string | null>(null)
const retryingAll = ref(false)

// Filter to chapters with issues
const issueChapters = computed(() =>
	props.chapters.filter(c =>
		c.page_fetch_status && ["Partial", "Failed", "Incomplete", "Pending"].includes(c.page_fetch_status),
	).slice(0, 10),
)

// Calculate totals
const total = computed(() =>
	props.healthCounts.pending
	+ props.healthCounts.inProgress
	+ props.healthCounts.success
	+ props.healthCounts.partial
	+ props.healthCounts.failed
	+ props.healthCounts.permanentlyFailed
	+ props.healthCounts.incomplete,
)

const successCount = computed(() => props.healthCounts.success)

const issueCount = computed(() =>
	props.healthCounts.partial
	+ props.healthCounts.failed
	+ props.healthCounts.incomplete
	+ props.healthCounts.pending,
)

const hasIssues = computed(() => issueCount.value > 0)

const healthPercent = computed(() => {
	if (total.value === 0) return 100
	return Math.round((successCount.value / total.value) * 100)
})

// Status cards configuration
const statusCards = computed(() => {
	const cards = []

	if (props.healthCounts.success > 0) {
		cards.push({ key: "success", label: "Ready", count: props.healthCounts.success, icon: "i-lucide-check-circle" })
	}
	if (props.healthCounts.pending > 0) {
		cards.push({ key: "pending", label: "Pending", count: props.healthCounts.pending, icon: "i-lucide-clock" })
	}
	if (props.healthCounts.inProgress > 0) {
		cards.push({ key: "inProgress", label: "Loading", count: props.healthCounts.inProgress, icon: "i-lucide-loader-2" })
	}
	if (props.healthCounts.partial > 0) {
		cards.push({ key: "partial", label: "Partial", count: props.healthCounts.partial, icon: "i-lucide-alert-triangle" })
	}
	if (props.healthCounts.failed > 0) {
		cards.push({ key: "failed", label: "Failed", count: props.healthCounts.failed, icon: "i-lucide-x-circle" })
	}
	if (props.healthCounts.incomplete > 0) {
		cards.push({ key: "incomplete", label: "Incomplete", count: props.healthCounts.incomplete, icon: "i-lucide-alert-circle" })
	}
	if (props.healthCounts.permanentlyFailed > 0) {
		cards.push({ key: "permanentlyFailed", label: "Blocked", count: props.healthCounts.permanentlyFailed, icon: "i-lucide-ban" })
	}

	return cards
})

const statusIcon: Record<string, string> = {
	Success: "i-lucide-check",
	Pending: "i-lucide-clock",
	InProgress: "i-lucide-loader-2",
	Partial: "i-lucide-alert-triangle",
	Failed: "i-lucide-x",
	PermanentlyFailed: "i-lucide-ban",
	Incomplete: "i-lucide-alert-circle",
}

// Retry single chapter
async function retryChapter(chapterId: string) {
	retryingChapter.value = chapterId
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/chapters/retry`, {
			method: "POST",
			body: { chapterIds: [chapterId] },
		})

		toast.add({
			title: "Retry Queued",
			description: "Chapter queued for data re-fetch",
			color: "success",
		})

		emit("retried")
	}
	catch {
		toast.add({
			title: "Retry Failed",
			description: "Failed to queue chapter retry",
			color: "error",
		})
	}
	finally {
		retryingChapter.value = null
	}
}

// Retry all failed chapters
async function retryAll() {
	const chapterIds = issueChapters.value.map(c => c.id)
	if (chapterIds.length === 0) return

	retryingAll.value = true
	try {
		const result = await $fetch(`/api/v1/serie/${props.serieId}/chapters/retry`, {
			method: "POST",
			body: { chapterIds },
		})

		toast.add({
			title: "Retry Queued",
			description: `${result.queued} chapters queued for data re-fetch`,
			color: "success",
		})

		emit("retried")
	}
	catch {
		toast.add({
			title: "Retry Failed",
			description: "Failed to queue chapter retries",
			color: "error",
		})
	}
	finally {
		retryingAll.value = false
	}
}

function formatChapterNumber(chapter: typeof props.chapters[0]) {
	const parts = []
	if (chapter.volume_number != null) parts.push(`Vol. ${chapter.volume_number}`)
	if (chapter.chapter_number != null) parts.push(`Ch. ${chapter.chapter_number}`)
	return parts.join(" ") || chapter.title || "Untitled"
}
</script>

<template>
	<div
		v-if="hasIssues"
		class="health-panel"
	>
		<!-- Main diagnostic display -->
		<div class="diagnostic-header">
			<!-- Left: Circular progress -->
			<div class="progress-ring-container">
				<svg
					class="progress-ring"
					viewBox="0 0 100 100"
				>
					<!-- Background track -->
					<circle
						class="ring-track"
						cx="50"
						cy="50"
						r="42"
						fill="none"
						stroke-width="8"
					/>
					<!-- Progress arc -->
					<circle
						class="ring-progress"
						cx="50"
						cy="50"
						r="42"
						fill="none"
						stroke-width="8"
						stroke-linecap="round"
						:stroke-dasharray="`${healthPercent * 2.64} 264`"
						transform="rotate(-90 50 50)"
					/>
				</svg>
				<div class="ring-center">
					<span class="ring-value">{{ healthPercent }}</span>
					<span class="ring-unit">%</span>
				</div>
			</div>

			<!-- Center: Status info -->
			<div class="status-info">
				<div class="status-headline">
					<span class="status-title">Chapter Data</span>
					<span
						class="status-indicator"
						:class="{ critical: healthPercent < 50, warning: healthPercent >= 50 && healthPercent < 90 }"
					>
						<span class="indicator-dot" />
						{{ healthPercent >= 90 ? 'Healthy' : healthPercent >= 50 ? 'Needs Attention' : 'Critical' }}
					</span>
				</div>
				<p class="status-summary">
					<strong>{{ issueCount }}</strong> of <strong>{{ total }}</strong> chapters need data
				</p>

				<!-- Status chips -->
				<div class="status-chips">
					<div
						v-for="card in statusCards"
						:key="card.key"
						class="chip"
						:class="card.key"
					>
						<UIcon
							:name="card.icon"
							class="chip-icon"
						/>
						<span class="chip-count">{{ card.count }}</span>
						<span class="chip-label">{{ card.label }}</span>
					</div>
				</div>
			</div>

			<!-- Right: Actions -->
			<div class="header-actions">
				<button
					v-if="issueChapters.length > 0"
					class="retry-btn"
					:class="{ loading: retryingAll }"
					:disabled="retryingAll"
					@click="retryAll"
				>
					<UIcon
						name="i-lucide-refresh-cw"
						class="retry-icon"
						:class="{ spin: retryingAll }"
					/>
					<span>Retry All</span>
				</button>
				<button
					class="expand-btn"
					:class="{ active: expanded }"
					@click="expanded = !expanded"
				>
					<UIcon
						:name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-list'"
						class="expand-icon"
					/>
				</button>
			</div>
		</div>

		<!-- Expanded chapter list -->
		<Transition name="slide">
			<div
				v-if="expanded && issueChapters.length > 0"
				class="chapter-list"
			>
				<div class="list-header">
					<span class="list-title">Chapters Requiring Data</span>
					<span class="list-count">{{ issueChapters.length }} shown</span>
				</div>

				<div class="list-items">
					<div
						v-for="(chapter, idx) in issueChapters"
						:key="chapter.id"
						class="chapter-row"
						:style="{ '--delay': `${idx * 30}ms` }"
					>
						<div
							class="row-status"
							:class="(chapter.page_fetch_status ?? 'Pending').toLowerCase()"
						>
							<UIcon
								:name="statusIcon[chapter.page_fetch_status ?? 'Pending']"
								class="status-icon"
							/>
						</div>

						<div class="row-content">
							<span class="row-number">{{ formatChapterNumber(chapter) }}</span>
							<span
								v-if="chapter.title"
								class="row-title"
							>{{ chapter.title }}</span>
						</div>

						<span
							v-if="chapter.source?.name"
							class="row-source"
						>{{ chapter.source.name }}</span>

						<button
							class="row-action"
							:disabled="retryingChapter === chapter.id || chapter.page_fetch_status === 'PermanentlyFailed'"
							@click="retryChapter(chapter.id)"
						>
							<UIcon
								name="i-lucide-refresh-cw"
								class="action-icon"
								:class="{ spin: retryingChapter === chapter.id }"
							/>
						</button>
					</div>
				</div>

				<div
					v-if="issueCount > 10"
					class="list-footer"
				>
					<span>+{{ issueCount - 10 }} more chapters not shown</span>
				</div>
			</div>
		</Transition>
	</div>
</template>

<style scoped>
.health-panel {
	position: relative;
	width: 100%;
	max-width: 100%;
	box-sizing: border-box;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 1rem;
	overflow: hidden;
}

/* Diagnostic Header */
.diagnostic-header {
	position: relative;
	display: flex;
	flex-wrap: wrap;
	gap: 1.25rem;
	padding: 1.25rem 1.5rem;
	align-items: center;
}

/* Progress Ring */
.progress-ring-container {
	position: relative;
	width: 5.5rem;
	height: 5.5rem;
}

.progress-ring {
	width: 100%;
	height: 100%;
	transform: rotate(0deg);
}

.ring-track {
	stroke: var(--ui-border);
}

.ring-progress {
	stroke: var(--ui-success);
	transition: stroke-dasharray 0.6s ease;
	filter: drop-shadow(0 0 6px color-mix(in oklch, var(--ui-success) 50%, transparent));
}

.ring-center {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.125rem;
}

.ring-value {
	font-size: 1.5rem;
	font-weight: 700;
	color: var(--ui-text);
	font-variant-numeric: tabular-nums;
	letter-spacing: -0.02em;
}

.ring-unit {
	font-size: 0.75rem;
	font-weight: 500;
	color: var(--ui-text-muted);
	margin-top: 0.25rem;
}

/* Status Info */
.status-info {
	display: flex;
	flex-direction: column;
	gap: 0.625rem;
	flex: 1;
	min-width: 200px;
}

.status-headline {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.status-title {
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--ui-text);
	letter-spacing: -0.01em;
}

.status-indicator {
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.25rem 0.625rem;
	font-size: 0.6875rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--ui-success);
	background: var(--ui-success-soft);
	border-radius: 2rem;
}

.status-indicator.warning {
	color: var(--ui-warning);
	background: var(--ui-warning-soft);
}

.status-indicator.critical {
	color: var(--ui-error);
	background: var(--ui-error-soft);
}

.indicator-dot {
	width: 0.375rem;
	height: 0.375rem;
	border-radius: 50%;
	background: currentColor;
	animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
	0%, 100% { opacity: 1; transform: scale(1); }
	50% { opacity: 0.5; transform: scale(0.85); }
}

.status-summary {
	font-size: 0.8125rem;
	color: var(--ui-text-muted);
}

.status-summary strong {
	color: var(--ui-text);
	font-weight: 600;
}

/* Status Chips */
.status-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin-top: 0.25rem;
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.3125rem 0.625rem;
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	transition: all 0.15s ease;
}

.chip:hover {
	background: var(--ui-bg-accented);
}

.chip-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.chip-count {
	font-size: 0.8125rem;
	font-weight: 600;
	color: var(--ui-text);
	font-variant-numeric: tabular-nums;
}

.chip-label {
	font-size: 0.6875rem;
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.03em;
}

/* Chip color variants */
.chip.success { color: var(--ui-success); border-color: color-mix(in oklch, var(--ui-success) 30%, transparent); }
.chip.pending { color: var(--ui-info); border-color: color-mix(in oklch, var(--ui-info) 30%, transparent); }
.chip.inProgress { color: var(--ui-primary); border-color: color-mix(in oklch, var(--ui-primary) 30%, transparent); }
.chip.partial { color: var(--ui-warning); border-color: color-mix(in oklch, var(--ui-warning) 30%, transparent); }
.chip.failed { color: var(--ui-error); border-color: color-mix(in oklch, var(--ui-error) 30%, transparent); }
.chip.incomplete { color: var(--ui-warning); border-color: color-mix(in oklch, var(--ui-warning) 30%, transparent); }
.chip.permanentlyFailed { color: var(--ui-error); border-color: color-mix(in oklch, var(--ui-error) 30%, transparent); opacity: 0.7; }

/* Header Actions */
.header-actions {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.retry-btn {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 1rem;
	font-size: 0.8125rem;
	font-weight: 600;
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
	border: 1px solid color-mix(in oklch, var(--ui-primary) 30%, transparent);
	border-radius: 0.5rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.retry-btn:hover:not(:disabled) {
	background: color-mix(in oklch, var(--ui-primary) 25%, transparent);
	border-color: color-mix(in oklch, var(--ui-primary) 50%, transparent);
	box-shadow: 0 0 16px color-mix(in oklch, var(--ui-primary) 20%, transparent);
}

.retry-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.retry-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.retry-icon.spin {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.expand-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.25rem;
	height: 2.25rem;
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.expand-btn:hover {
	background: var(--ui-bg-accented);
}

.expand-btn.active {
	background: var(--ui-primary-soft);
	border-color: color-mix(in oklch, var(--ui-primary) 30%, transparent);
	color: var(--ui-primary);
}

.expand-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
	transition: transform 0.2s ease;
}

.expand-btn.active .expand-icon {
	color: var(--ui-primary);
}

/* Chapter List */
.chapter-list {
	border-top: 1px solid var(--ui-border);
	background: var(--ui-bg-muted);
}

.list-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0.75rem 1.5rem;
	border-bottom: 1px solid var(--ui-border);
}

.list-title {
	font-size: 0.75rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--ui-text-muted);
}

.list-count {
	font-size: 0.6875rem;
	color: var(--ui-text-muted);
}

.list-items {
	padding: 0.5rem;
}

.chapter-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.625rem 1rem;
	border-radius: 0.5rem;
	transition: background 0.15s ease;
	animation: fadeSlideIn 0.25s ease forwards;
	animation-delay: var(--delay);
	opacity: 0;
}

@keyframes fadeSlideIn {
	from {
		opacity: 0;
		transform: translateX(-8px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}

.chapter-row:hover {
	background: var(--ui-bg-elevated);
}

.row-status {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	border-radius: 0.375rem;
	flex-shrink: 0;
}

.row-status.pending {
	background: var(--ui-info-soft);
	color: var(--ui-info);
}

.row-status.partial {
	background: var(--ui-warning-soft);
	color: var(--ui-warning);
}

.row-status.failed {
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

.row-status.incomplete {
	background: var(--ui-warning-soft);
	color: var(--ui-warning);
}

.row-status.permanentlyfailed {
	background: var(--ui-error-soft);
	color: var(--ui-error);
	opacity: 0.7;
}

.status-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.row-content {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: baseline;
	gap: 0.5rem;
}

.row-number {
	font-size: 0.8125rem;
	font-weight: 600;
	color: var(--ui-text);
	white-space: nowrap;
}

.row-title {
	font-size: 0.8125rem;
	color: var(--ui-text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.row-source {
	font-size: 0.6875rem;
	font-weight: 500;
	color: var(--ui-text-muted);
	padding: 0.1875rem 0.5rem;
	background: var(--ui-bg-muted);
	border-radius: 0.25rem;
	white-space: nowrap;
	flex-shrink: 0;
}

.row-action {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	background: transparent;
	border: 1px solid transparent;
	border-radius: 0.375rem;
	color: var(--ui-text-muted);
	cursor: pointer;
	transition: all 0.15s ease;
	flex-shrink: 0;
}

.row-action:hover:not(:disabled) {
	background: var(--ui-primary-soft);
	border-color: color-mix(in oklch, var(--ui-primary) 30%, transparent);
	color: var(--ui-primary);
}

.row-action:disabled {
	opacity: 0.3;
	cursor: not-allowed;
}

.action-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.action-icon.spin {
	animation: spin 1s linear infinite;
}

.list-footer {
	padding: 0.75rem 1.5rem;
	font-size: 0.75rem;
	color: var(--ui-text-muted);
	text-align: center;
	border-top: 1px solid var(--ui-border);
	background: var(--ui-bg);
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
	transition: all 0.25s ease;
	overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
	opacity: 0;
	max-height: 0;
}

.slide-enter-to,
.slide-leave-from {
	opacity: 1;
	max-height: 500px;
}

/* Responsive */
@media (max-width: 640px) {
	.diagnostic-header {
		flex-direction: column;
		gap: 1rem;
		text-align: center;
	}

	.progress-ring-container {
		margin: 0 auto;
	}

	.status-info {
		width: 100%;
		min-width: unset;
	}

	.status-headline {
		justify-content: center;
		flex-wrap: wrap;
	}

	.status-chips {
		justify-content: center;
	}

	.header-actions {
		width: 100%;
		justify-content: center;
	}
}
</style>
