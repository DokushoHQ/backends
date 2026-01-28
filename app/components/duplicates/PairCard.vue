<script setup lang="ts">
import type { DuplicateGroup } from "~/types/duplicates"

defineProps<{
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
	position: relative;
	display: flex;
	flex-direction: column;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
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
	top: 0.5rem;
	right: 0.5rem;
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 0.25rem;
	padding: 0.25rem 0.5rem;
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.375rem;
	z-index: 10;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.confidence-value {
	font-size: 0.75rem;
	font-weight: 700;
	color: var(--ui-primary);
	font-variant-numeric: tabular-nums;
	line-height: 1;
}

.confidence-label {
	font-size: 0.5625rem;
	font-weight: 500;
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

@media (min-width: 640px) {
	.confidence-badge {
		top: 0.75rem;
		right: 0.75rem;
		flex-direction: column;
		gap: 0;
		padding: 0.375rem 0.625rem;
		border-radius: 0.5rem;
	}

	.confidence-value {
		font-size: 0.9375rem;
	}

	.confidence-label {
		font-size: 0.625rem;
	}
}

/* Series comparison */
.series-comparison {
	display: flex;
	flex-direction: column;
	flex: 1;
	padding: 0.75rem;
	gap: 0.5rem;
}

.series-card {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.625rem;
	border-radius: 0.5rem;
	transition: all 0.15s ease;
	text-decoration: none;
}

.series-card:hover {
	background: var(--ui-bg-muted);
}

.series-card.is-primary {
	background: var(--ui-primary-soft);
}

.series-card.is-deleted {
	opacity: 0.5;
}

.series-cover {
	position: relative;
	width: 3.5rem;
	height: 5rem;
	flex-shrink: 0;
	border-radius: 0.375rem;
	overflow: hidden;
	background: var(--ui-bg-muted);
}

@media (min-width: 640px) {
	.series-comparison {
		flex-direction: row;
		align-items: stretch;
		padding: 1rem;
	}

	.series-card {
		flex: 1;
		display: grid;
		grid-template-rows: 1fr auto;
		padding: 0.75rem;
	}

	.series-cover {
		width: auto;
		min-height: 10rem;
		height: 100%;
	}
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
	color: var(--ui-text-muted);
}

.primary-indicator {
	position: absolute;
	bottom: 0.25rem;
	left: 50%;
	transform: translateX(-50%);
	padding: 0.125rem 0.375rem;
	font-size: 0.5rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: white;
	background: var(--ui-primary);
	border-radius: 1rem;
	white-space: nowrap;
}

@media (min-width: 640px) {
	.primary-indicator {
		bottom: 0.5rem;
		padding: 0.25rem 0.625rem;
		font-size: 0.6875rem;
		letter-spacing: 0.05em;
	}
}

.series-info {
	flex: 1;
	min-width: 0;
}

.series-title {
	font-size: 0.75rem;
	font-weight: 600;
	color: var(--ui-text);
	line-height: 1.3;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	margin-bottom: 0.25rem;
}

.series-meta {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.375rem;
}

.chapter-count {
	font-size: 0.6875rem;
	color: var(--ui-text-muted);
	font-variant-numeric: tabular-nums;
}

.source-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 0.25rem;
}

.source-tag {
	padding: 0.0625rem 0.25rem;
	font-size: 0.5625rem;
	font-weight: 500;
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	border-radius: 0.25rem;
}

@media (min-width: 640px) {
	.series-title {
		font-size: 0.8125rem;
		margin-bottom: 0.375rem;
	}

	.series-meta {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}

	.chapter-count {
		font-size: 0.75rem;
	}

	.source-tag {
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
	}
}

/* VS divider */
.vs-divider {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	padding: 0.25rem 0;
}

.vs-line {
	height: 1px;
	flex: 1;
	background: var(--ui-border);
}

.vs-text {
	padding: 0 0.75rem;
	font-size: 0.625rem;
	font-weight: 600;
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.1em;
}

@media (min-width: 640px) {
	.vs-divider {
		flex-direction: column;
		padding: 0 0.25rem;
	}

	.vs-line {
		width: 1px;
		height: auto;
		flex: 1;
	}

	.vs-text {
		padding: 0.5rem 0;
		font-size: 0.6875rem;
	}
}

/* Actions */
.pair-actions {
	display: flex;
	gap: 0.375rem;
	padding: 0.5rem 0.75rem;
	border-top: 1px solid var(--ui-border);
	background: var(--ui-bg-muted);
}

.action-button {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.25rem;
	padding: 0.375rem 0.5rem;
	font-size: 0.75rem;
	font-weight: 500;
	border-radius: 0.375rem;
	transition: all 0.15s ease;
}

@media (min-width: 640px) {
	.pair-actions {
		gap: 0.5rem;
		padding: 0.75rem 1rem;
	}

	.action-button {
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
	}
}

.action-button.dismiss {
	color: var(--ui-text-muted);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
}

.action-button.dismiss:hover {
	color: var(--ui-error);
	border-color: var(--ui-error);
	background: var(--ui-error-soft);
}

.action-button.merge {
	color: white;
	background: var(--ui-primary);
}

.action-button.merge:hover {
	filter: brightness(1.1);
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
	color: var(--ui-success);
	background: var(--ui-success-soft);
}

.status-indicator.dismissed {
	color: var(--ui-text-muted);
	background: var(--ui-bg);
}
</style>
