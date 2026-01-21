<script setup lang="ts">
import type { DuplicateGroup } from "~/types/duplicates"

const props = defineProps<{
	group: DuplicateGroup
	animate?: boolean
	delay?: number
}>()

const emit = defineEmits<{
	dismiss: [id: string]
	merge: [group: DuplicateGroup]
}>()
</script>

<template>
	<div
		class="pair-card"
		:class="{ 'animate-enter': animate }"
		:style="{ '--delay': `${delay ?? 0}ms` }"
	>
		<!-- Confidence indicator -->
		<div class="confidence-badge">
			<span class="confidence-value">{{ group.confidence }}%</span>
			<span class="confidence-label">match</span>
		</div>

		<!-- Series comparison -->
		<div class="series-comparison">
			<!-- First series -->
			<NuxtLink
				:to="`/series/${group.series[0]?.id}`"
				class="series-card"
				:class="{
					'is-primary': group.series[0]?.id === group.suggestedPrimaryId,
					'is-deleted': group.series[0]?.isDeleted,
				}"
			>
				<div class="series-cover">
					<NuxtImg
						v-if="group.series[0]?.cover"
						:src="group.series[0].cover"
						:alt="group.series[0].title"
						class="cover-image"
					/>
					<div
						v-else
						class="cover-placeholder"
					>
						<UIcon
							name="i-lucide-image"
							class="h-6 w-6"
						/>
					</div>
					<div
						v-if="group.series[0]?.id === group.suggestedPrimaryId"
						class="primary-indicator"
					>
						Primary
					</div>
				</div>
				<div class="series-info">
					<h4 class="series-title">
						{{ group.series[0]?.title }}
					</h4>
					<div class="series-meta">
						<span class="chapter-count">{{ group.series[0]?.chapterCount }} ch</span>
						<div class="source-tags">
							<span
								v-for="source in group.series[0]?.sources"
								:key="source.id"
								class="source-tag"
							>
								{{ source.name }}
							</span>
						</div>
					</div>
				</div>
			</NuxtLink>

			<!-- VS divider -->
			<div class="vs-divider">
				<div class="vs-line" />
				<span class="vs-text">vs</span>
				<div class="vs-line" />
			</div>

			<!-- Second series -->
			<NuxtLink
				:to="`/series/${group.series[1]?.id}`"
				class="series-card"
				:class="{
					'is-primary': group.series[1]?.id === group.suggestedPrimaryId,
					'is-deleted': group.series[1]?.isDeleted,
				}"
			>
				<div class="series-cover">
					<NuxtImg
						v-if="group.series[1]?.cover"
						:src="group.series[1].cover"
						:alt="group.series[1].title"
						class="cover-image"
					/>
					<div
						v-else
						class="cover-placeholder"
					>
						<UIcon
							name="i-lucide-image"
							class="h-6 w-6"
						/>
					</div>
					<div
						v-if="group.series[1]?.id === group.suggestedPrimaryId"
						class="primary-indicator"
					>
						Primary
					</div>
				</div>
				<div class="series-info">
					<h4 class="series-title">
						{{ group.series[1]?.title }}
					</h4>
					<div class="series-meta">
						<span class="chapter-count">{{ group.series[1]?.chapterCount }} ch</span>
						<div class="source-tags">
							<span
								v-for="source in group.series[1]?.sources"
								:key="source.id"
								class="source-tag"
							>
								{{ source.name }}
							</span>
						</div>
					</div>
				</div>
			</NuxtLink>
		</div>

		<!-- Actions -->
		<div class="pair-actions">
			<template v-if="group.status === 'Pending'">
				<button
					class="action-button dismiss"
					@click="emit('dismiss', group.id)"
				>
					<UIcon
						name="i-lucide-x"
						class="h-4 w-4"
					/>
					<span>Not duplicates</span>
				</button>
				<button
					class="action-button merge"
					@click="emit('merge', group)"
				>
					<UIcon
						name="i-lucide-git-merge"
						class="h-4 w-4"
					/>
					<span>Merge</span>
				</button>
			</template>
			<div
				v-else
				class="status-indicator"
				:class="group.status.toLowerCase()"
			>
				<UIcon
					:name="group.status === 'Merged' ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
					class="h-4 w-4"
				/>
				<span>{{ group.status }}</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.pair-card {
	--accent: oklch(0.7 0.15 250);
	--accent-soft: oklch(0.7 0.15 250 / 0.15);
	--success: oklch(0.72 0.15 160);
	--success-soft: oklch(0.72 0.15 160 / 0.15);
	--danger: oklch(0.65 0.2 25);
	--danger-soft: oklch(0.65 0.2 25 / 0.15);

	position: relative;
	display: flex;
	flex-direction: column;
	background: var(--color-background);
	border: 1px solid var(--color-border);
	border-radius: 0.75rem;
	overflow: hidden;
}

.pair-card.animate-enter {
	animation: card-enter 0.3s ease backwards;
	animation-delay: var(--delay);
}

@keyframes card-enter {
	from {
		opacity: 0;
		transform: translateY(8px);
	}
}

.confidence-badge {
	position: absolute;
	top: 0.75rem;
	right: 0.75rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 0.375rem 0.625rem;
	background: var(--color-background);
	border: 1px solid var(--color-border);
	border-radius: 0.5rem;
	z-index: 10;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.confidence-value {
	font-size: 0.9375rem;
	font-weight: 700;
	color: var(--accent);
	font-variant-numeric: tabular-nums;
	line-height: 1;
}

.confidence-label {
	font-size: 0.625rem;
	font-weight: 500;
	color: var(--color-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

/* Series comparison */
.series-comparison {
	display: flex;
	align-items: stretch;
	flex: 1;
	padding: 1rem;
	gap: 0.5rem;
}

.series-card {
	flex: 1;
	display: grid;
	grid-template-rows: 1fr auto;
	gap: 0.75rem;
	padding: 0.75rem;
	border-radius: 0.5rem;
	transition: all 0.15s ease;
	text-decoration: none;
}

.series-card:hover {
	background: var(--color-muted);
}

.series-card.is-primary {
	background: var(--accent-soft);
}

.series-card.is-deleted {
	opacity: 0.5;
}

.series-cover {
	position: relative;
	min-height: 10rem;
	height: 100%;
	border-radius: 0.375rem;
	overflow: hidden;
	background: var(--color-muted);
}

.cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transition: transform 0.3s ease;
}

.series-card:hover .cover-image {
	transform: scale(1.03);
}

.cover-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	color: var(--color-text-muted);
}

.primary-indicator {
	position: absolute;
	bottom: 0.5rem;
	left: 50%;
	transform: translateX(-50%);
	padding: 0.25rem 0.625rem;
	font-size: 0.6875rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: white;
	background: var(--accent);
	border-radius: 1rem;
}

.series-info {
	min-width: 0;
}

.series-title {
	font-size: 0.8125rem;
	font-weight: 600;
	color: var(--color-text);
	line-height: 1.3;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	margin-bottom: 0.375rem;
}

.series-meta {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.chapter-count {
	font-size: 0.75rem;
	color: var(--color-text-muted);
	font-variant-numeric: tabular-nums;
}

.source-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 0.25rem;
}

.source-tag {
	padding: 0.125rem 0.375rem;
	font-size: 0.625rem;
	font-weight: 500;
	color: var(--color-text-muted);
	background: var(--color-muted);
	border-radius: 0.25rem;
}

/* VS divider */
.vs-divider {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 0 0.25rem;
}

.vs-line {
	width: 1px;
	flex: 1;
	background: var(--color-border);
}

.vs-text {
	padding: 0.5rem 0;
	font-size: 0.6875rem;
	font-weight: 600;
	color: var(--color-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.1em;
}

/* Actions */
.pair-actions {
	display: flex;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	border-top: 1px solid var(--color-border);
	background: var(--color-muted);
}

.action-button {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	padding: 0.5rem 0.75rem;
	font-size: 0.8125rem;
	font-weight: 500;
	border-radius: 0.375rem;
	transition: all 0.15s ease;
}

.action-button.dismiss {
	color: var(--color-text-muted);
	background: var(--color-background);
	border: 1px solid var(--color-border);
}

.action-button.dismiss:hover {
	color: var(--danger);
	border-color: var(--danger);
	background: var(--danger-soft);
}

.action-button.merge {
	color: white;
	background: var(--accent);
}

.action-button.merge:hover {
	background: oklch(0.6 0.18 250);
}

.status-indicator {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	padding: 0.5rem;
	font-size: 0.8125rem;
	font-weight: 500;
	border-radius: 0.375rem;
}

.status-indicator.merged {
	color: var(--success);
	background: var(--success-soft);
}

.status-indicator.dismissed {
	color: var(--color-text-muted);
	background: var(--color-background);
}

/* Dark mode */
:root.dark .pair-card {
	background: oklch(0.2 0.01 250);
}

:root.dark .confidence-badge {
	background: oklch(0.22 0.01 250);
}
</style>
