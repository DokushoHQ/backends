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
		:to="`/dashboard/series/${serie.id}`"
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
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	flex: 1;
	text-decoration: none;
	transition: background 0.15s ease;
	border-bottom: 1px solid var(--ui-border);
}

.issue-row:last-child {
	border-bottom: none;
}

.issue-row:hover {
	background: var(--ui-bg-muted);
}

.serie-cover {
	width: 3rem;
	height: 4.25rem;
	border-radius: 0.375rem;
	overflow: hidden;
	background: var(--ui-bg-muted);
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
	color: var(--ui-text-muted);
}

.row-info {
	flex: 1;
	min-width: 0;
}

.row-title {
	display: block;
	font-size: var(--font-size-md);
	font-weight: 500;
	color: var(--ui-text);
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

.issue-badge.color-orange { color: var(--ui-warning); background: var(--ui-warning-soft); }
.issue-badge.color-yellow { color: var(--ui-info); background: var(--ui-info-soft); }
.issue-badge.color-red { color: var(--ui-error); background: var(--ui-error-soft); }
.issue-badge.color-purple { color: var(--color-purple); background: var(--color-purple-soft); }
.issue-badge.color-gray { color: var(--ui-text-muted); background: var(--ui-bg-muted); }

.row-chevron {
	flex-shrink: 0;
	color: var(--ui-text-muted);
}
</style>
