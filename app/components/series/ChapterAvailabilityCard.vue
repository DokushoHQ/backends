<script setup lang="ts">
interface AvailabilityData {
	language: string
	missing_count: number
	available_count: number // Secondary chapters that exist
	ready_count: number // Secondary chapters that are fetched
	auto_enabled_count: number
}

const props = defineProps<{
	serieId: string
}>()

const toast = useToast()
const isPending = ref(false)

// Fetch availability data
const { data: availabilityData, refresh: refreshAvailability } = await useFetch(
	`/api/v1/serie/${props.serieId}/availability`,
)

const availability = computed<AvailabilityData[]>(() => availabilityData.value?.availability ?? [])

// Summary stats
const totalMissing = computed(() =>
	availability.value.reduce((sum, a) => sum + a.missing_count, 0),
)

const totalAvailable = computed(() =>
	availability.value.reduce((sum, a) => sum + a.available_count, 0),
)

const totalReady = computed(() =>
	availability.value.reduce((sum, a) => sum + a.ready_count, 0),
)

const totalAutoEnabled = computed(() =>
	availability.value.reduce((sum, a) => sum + a.auto_enabled_count, 0),
)

// Filter to only show languages with gaps
const languagesWithGaps = computed(() =>
	availability.value.filter(a => a.missing_count > 0),
)

// Calculate available percentage for a language (secondary chapters that exist)
function availablePercent(item: AvailabilityData) {
	if (item.missing_count === 0) return 100
	return Math.round((item.available_count / item.missing_count) * 100)
}

// Trigger dedup job
async function runDedup() {
	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serieId}/trigger-dedup`, {
			method: "POST",
			body: {},
		})
		toast.add({
			title: "Dedup Queued",
			description: "Chapter deduplication job has been queued",
			color: "success",
		})
		// Refresh after a short delay to allow job to process
		setTimeout(() => refreshAvailability(), 3000)
	}
	catch (e: unknown) {
		console.error("Failed to trigger dedup:", e)
		toast.add({
			title: "Dedup Failed",
			description: "Could not queue deduplication job",
			color: "error",
		})
	}
	finally {
		isPending.value = false
	}
}
</script>

<template>
	<UiContentCard
		title="Chapter Availability"
		icon="i-lucide-git-compare"
		color="purple"
	>
		<template #header-actions>
			<button
				class="dedup-button"
				:disabled="isPending"
				@click="runDedup"
			>
				<UIcon
					v-if="isPending"
					name="i-lucide-loader-2"
					class="spinner"
				/>
				<UIcon
					v-else
					name="i-lucide-refresh-cw"
					class="btn-icon"
				/>
				<span>Run Dedup</span>
			</button>
		</template>

		<!-- No data yet - prompt to run dedup -->
		<div
			v-if="availability.length === 0"
			class="empty-state"
		>
			<UIcon
				name="i-lucide-scan-search"
				class="empty-icon"
			/>
			<span>No availability data yet. Click "Run Dedup" to analyze chapter gaps across sources.</span>
		</div>

		<!-- Has data -->
		<template v-else>
			<!-- Summary stats -->
			<div class="stats-row">
				<div class="stat-item amber">
					<span class="stat-value">{{ totalMissing }}</span>
					<span class="stat-label">Missing</span>
				</div>
				<div class="stat-item purple">
					<span class="stat-value">{{ totalAvailable }}</span>
					<span class="stat-label">Available</span>
				</div>
				<div class="stat-item green">
					<span class="stat-value">{{ totalReady }}</span>
					<span class="stat-label">Ready</span>
				</div>
				<div class="stat-item blue">
					<span class="stat-value">{{ totalAutoEnabled }}</span>
					<span class="stat-label">Auto-On</span>
				</div>
			</div>

			<!-- Language breakdown -->
			<div
				v-if="languagesWithGaps.length > 0"
				class="breakdown-section"
			>
				<span class="breakdown-title">By Language</span>
				<div class="breakdown-list">
					<div
						v-for="item in languagesWithGaps"
						:key="item.language"
						class="breakdown-item"
					>
						<span class="lang-code">{{ item.language }}</span>
						<div class="progress-wrapper">
							<div class="progress-bar">
								<div
									class="progress-fill"
									:style="{ width: `${availablePercent(item)}%` }"
									:class="{
										'fill-full': availablePercent(item) === 100,
										'fill-partial': availablePercent(item) > 0 && availablePercent(item) < 100,
										'fill-none': availablePercent(item) === 0,
									}"
								/>
							</div>
							<span class="progress-text">
								{{ item.missing_count }} gaps, {{ item.available_count }} available, {{ item.ready_count }} ready
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- No gaps message -->
			<div
				v-else
				class="complete-message"
			>
				<UIcon
					name="i-lucide-check-circle"
					class="complete-icon"
				/>
				<span>No chapter gaps detected across all languages</span>
			</div>
		</template>
	</UiContentCard>
</template>

<style scoped>
.dedup-button {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem 0.75rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text);
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 0.375rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.dedup-button:hover:not(:disabled) {
	background: var(--ui-border);
}

.dedup-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.spinner {
	width: 0.875rem;
	height: 0.875rem;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Empty state */
.empty-state {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.75rem;
	padding: 1.5rem 1rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	text-align: center;
}

.empty-icon {
	width: 1.25rem;
	height: 1.25rem;
	flex-shrink: 0;
}

/* Stats row */
.stats-row {
	display: flex;
	gap: 1rem;
	padding: 1rem;
}

.stat-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 0.75rem;
	background: var(--ui-bg);
	border-radius: 0.5rem;
}

.stat-value {
	font-size: var(--font-size-xl);
	font-weight: 700;
	line-height: 1.2;
	font-variant-numeric: tabular-nums;
}

.stat-label {
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	margin-top: 0.125rem;
}

.stat-item.amber .stat-value { color: var(--ui-warning); }
.stat-item.purple .stat-value { color: var(--color-purple); }
.stat-item.green .stat-value { color: var(--ui-success); }
.stat-item.blue .stat-value { color: var(--ui-info); }

/* Breakdown section */
.breakdown-section {
	padding: 1rem;
	border-top: 1px solid var(--ui-border-muted);
}

.breakdown-title {
	display: block;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.03em;
	margin-bottom: 0.75rem;
}

.breakdown-list {
	display: flex;
	flex-direction: column;
	gap: 0.625rem;
}

.breakdown-item {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.lang-code {
	min-width: 2.5rem;
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text);
}

.progress-wrapper {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.progress-bar {
	flex: 1;
	height: 0.375rem;
	background: var(--ui-bg-muted);
	border-radius: 2rem;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	border-radius: 2rem;
	transition: width 0.3s ease;
}

.progress-fill.fill-full {
	background: var(--ui-success);
}

.progress-fill.fill-partial {
	background: var(--ui-warning);
}

.progress-fill.fill-none {
	background: var(--ui-error);
}

.progress-text {
	min-width: 12rem;
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	white-space: nowrap;
}

/* Complete message */
.complete-message {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	padding: 1.5rem 1rem;
	font-size: var(--font-size-sm);
	color: var(--ui-success);
}

.complete-icon {
	width: 1.25rem;
	height: 1.25rem;
}

/* Responsive */
@media (max-width: 640px) {
	.stats-row {
		gap: 0.5rem;
	}

	.stat-item {
		padding: 0.5rem;
	}

	.stat-value {
		font-size: var(--font-size-lg);
	}

	.progress-text {
		min-width: auto;
		font-size: 0.625rem;
	}
}
</style>
