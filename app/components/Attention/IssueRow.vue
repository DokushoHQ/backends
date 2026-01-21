<script setup lang="ts">
defineProps<{
	serie: {
		id: string
		title: string
		cover: string | null
		issues: string[]
	}
}>()

const issueTypes: Record<string, { label: string, color: string }> = {
	pending_deletion: { label: "Pending Deletion", color: "orange" },
	missing_cover: { label: "Missing Cover", color: "yellow" },
	scrape_failures: { label: "Scrape Failed", color: "red" },
	chapter_data_missing: { label: "Chapter Data", color: "purple" },
}

function getIssueLabel(issue: string) {
	return issueTypes[issue]?.label ?? issue
}

function getIssueColor(issue: string) {
	return issueTypes[issue]?.color ?? "gray"
}
</script>

<template>
	<NuxtLink
		:to="`/series/${serie.id}`"
		class="issue-row"
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
			<span class="row-title">
				{{ serie.title }}
			</span>
			<div class="issue-badges">
				<span
					v-for="issue in serie.issues.slice(0, 2)"
					:key="issue"
					class="issue-badge"
					:class="`color-${getIssueColor(issue)}`"
				>
					{{ getIssueLabel(issue) }}
				</span>
				<span
					v-if="serie.issues.length > 2"
					class="issue-badge color-gray"
				>
					+{{ serie.issues.length - 2 }}
				</span>
			</div>
		</div>
		<UIcon
			name="i-lucide-chevron-right"
			class="h-4 w-4 row-chevron"
		/>
	</NuxtLink>
</template>

<style scoped>
.issue-row {
	--orange: oklch(0.72 0.16 45);
	--orange-soft: oklch(0.72 0.16 45 / 0.12);
	--yellow: oklch(0.8 0.14 85);
	--yellow-soft: oklch(0.8 0.14 85 / 0.12);
	--red: oklch(0.65 0.2 25);
	--red-soft: oklch(0.65 0.2 25 / 0.12);
	--purple: oklch(0.7 0.15 280);
	--purple-soft: oklch(0.7 0.15 280 / 0.12);

	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	text-decoration: none;
	transition: background 0.15s ease;
	border-bottom: 1px solid var(--color-border);
}

.issue-row:last-child {
	border-bottom: none;
}

.issue-row:hover {
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

.issue-badges {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
}

.issue-badge {
	padding: 0.1875rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 0.25rem;
}

.issue-badge.color-orange { color: var(--orange); background: var(--orange-soft); }
.issue-badge.color-yellow { color: var(--yellow); background: var(--yellow-soft); }
.issue-badge.color-red { color: var(--red); background: var(--red-soft); }
.issue-badge.color-purple { color: var(--purple); background: var(--purple-soft); }
.issue-badge.color-gray { color: var(--color-text-muted); background: var(--color-muted); }

.row-chevron {
	flex-shrink: 0;
	color: var(--color-text-muted);
}
</style>
