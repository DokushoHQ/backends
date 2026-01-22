<script setup lang="ts">
interface Props {
	pendingChapters: number
	failedChapters: number
	partialChapters: number
	failedPages: number
	series: Array<{
		id: string
		title: string
		cover: string | null
		chaptersNeedingData: number
	}>
}

const props = defineProps<Props>()

const totalChaptersNeedingData = computed(() =>
	props.pendingChapters + props.failedChapters + props.partialChapters,
)
</script>

<template>
	<UiContentCard
		title="Chapter Health"
		:description="`${totalChaptersNeedingData} chapters need data`"
		icon="i-lucide-hard-drive"
		color="blue"
		link-to="/attention/issues?type=chapter_data_missing"
	>
		<div
			v-if="series.length > 0"
			class="preview-list"
		>
			<NuxtLink
				v-for="serie in series.slice(0, 5)"
				:key="serie.id"
				:to="`/series/${serie.id}`"
				class="chapter-row"
			>
				<div class="serie-cover">
					<NuxtImg
						v-if="serie.cover"
						:src="serie.cover"
						:alt="serie.title"
						class="cover-img"
					/>
					<div
						v-else
						class="cover-placeholder"
					>
						<UIcon
							name="i-lucide-image-off"
							class="h-4 w-4"
						/>
					</div>
				</div>
				<div class="row-info">
					<span class="row-title">{{ serie.title }}</span>
					<span class="row-meta">
						<UIcon
							name="i-lucide-file-warning"
							class="h-3 w-3"
						/>
						{{ serie.chaptersNeedingData }} chapter{{ serie.chaptersNeedingData === 1 ? '' : 's' }}
					</span>
				</div>
				<UIcon
					name="i-lucide-chevron-right"
					class="h-4 w-4 row-chevron"
				/>
			</NuxtLink>
		</div>

		<div
			v-else
			class="empty-preview"
		>
			<p>No chapters need attention</p>
		</div>

		<!-- Stats bar at bottom -->
		<div
			v-if="totalChaptersNeedingData > 0"
			class="stats-bar"
		>
			<div class="stat-item">
				<span class="stat-value">{{ pendingChapters }}</span>
				<span class="stat-label">Pending</span>
			</div>
			<div class="stat-divider" />
			<div class="stat-item">
				<span class="stat-value">{{ failedChapters }}</span>
				<span class="stat-label">Failed</span>
			</div>
			<div class="stat-divider" />
			<div class="stat-item">
				<span class="stat-value">{{ partialChapters }}</span>
				<span class="stat-label">Partial</span>
			</div>
			<div
				v-if="failedPages > 0"
				class="stat-divider"
			/>
			<div
				v-if="failedPages > 0"
				class="stat-item highlight"
			>
				<span class="stat-value">{{ failedPages }}</span>
				<span class="stat-label">Pages</span>
			</div>
		</div>
	</UiContentCard>
</template>

<style scoped>
.preview-list {
	display: flex;
	flex-direction: column;
	flex: 1;
}

.chapter-row {
	--blue: oklch(0.65 0.2 250);

	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	flex: 1;
	text-decoration: none;
	transition: background 0.15s ease;
	border-bottom: 1px solid var(--color-border);
}

.chapter-row:last-child {
	border-bottom: none;
}

.chapter-row:hover {
	background: var(--color-muted);
}

.serie-cover {
	width: 3rem;
	height: 4.25rem;
	border-radius: 0.375rem;
	overflow: hidden;
	background: var(--color-muted);
	flex-shrink: 0;
}

.cover-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.cover-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	color: var(--color-text-muted);
}

.row-info {
	flex: 1;
	min-width: 0;
}

.row-title {
	display: block;
	font-size: var(--font-size-md);
	font-weight: 500;
	color: var(--color-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	margin-bottom: 0.25rem;
}

.row-meta {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	font-size: var(--font-size-sm);
	color: var(--blue);
}

.row-chevron {
	flex-shrink: 0;
	color: var(--color-text-muted);
}

.empty-preview {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rem 1rem;
	text-align: center;
}

.empty-preview p {
	font-size: var(--font-size-md);
	color: var(--color-text-muted);
}

/* Stats bar - stays at bottom, doesn't shrink */
.stats-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 1rem;
	padding: 0.75rem 1rem;
	flex-shrink: 0;
	background: var(--color-muted);
	border-top: 1px solid var(--color-border);
}

.stat-item {
	display: flex;
	align-items: center;
	gap: 0.375rem;
}

.stat-value {
	font-size: var(--font-size-md);
	font-weight: 600;
	color: var(--color-text);
	font-variant-numeric: tabular-nums;
}

.stat-item.highlight .stat-value {
	color: oklch(0.65 0.2 250);
}

.stat-label {
	font-size: var(--font-size-xs);
	color: var(--color-text-muted);
}

.stat-divider {
	width: 1px;
	height: 1.25rem;
	background: var(--color-border);
}
</style>
