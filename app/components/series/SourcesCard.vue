<script setup lang="ts">
interface SerieSource {
	id: string
	external_id: string
	external_url: string | null
	is_primary: boolean
	priority: number
	consecutive_failures: number
	source: {
		id: string
		name: string
		icon: string | null
	}
}

const props = defineProps<{
	sources: SerieSource[] | null
}>()

// Sort sources: primary first, then by priority
const sortedSources = computed(() => {
	if (!props.sources) return []
	return [...props.sources].sort((a, b) => {
		if (a.is_primary) return -1
		if (b.is_primary) return 1
		return (a.priority ?? 5) - (b.priority ?? 5)
	})
})
</script>

<template>
	<div class="sources-card">
		<div class="card-header">
			<h3 class="card-title">
				<UIcon
					name="i-lucide-external-link"
					class="title-icon"
				/>
				Sources
			</h3>
			<span class="card-count">{{ sources?.length ?? 0 }}</span>
		</div>

		<div
			v-if="!sources?.length"
			class="empty-section"
		>
			<p>No sources linked</p>
		</div>
		<div
			v-else
			class="sources-list"
		>
			<a
				v-for="(source, idx) in sortedSources"
				:key="source.id"
				:href="source.external_url ?? '#'"
				target="_blank"
				rel="noopener noreferrer"
				class="source-item"
			>
				<div class="source-info">
					<span class="source-name">
						<span
							v-if="sortedSources.length > 1"
							class="priority-rank"
						>{{ idx + 1 }}.</span>
						{{ source.source.name }}
						<span
							v-if="source.is_primary"
							class="primary-badge"
						>Primary</span>
					</span>
					<span class="source-id">{{ source.external_id }}</span>
				</div>
				<div class="source-status">
					<span
						v-if="source.consecutive_failures > 0"
						class="failure-badge"
					>
						{{ source.consecutive_failures }} failures
					</span>
					<UIcon
						name="i-lucide-arrow-up-right"
						class="link-icon"
					/>
				</div>
			</a>
		</div>
	</div>
</template>

<style scoped>
.sources-card {
	display: flex;
	flex-direction: column;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.75rem;
	overflow: hidden;
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1rem;
	border-bottom: 1px solid var(--ui-border-muted);
}

.card-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: var(--font-size-base);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
}

.title-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
}

.card-count {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 1.5rem;
	height: 1.5rem;
	padding: 0 0.375rem;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	border-radius: 2rem;
}

/* Empty section */
.empty-section {
	padding: 2rem 1rem;
	text-align: center;
}

.empty-section p {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0;
}

/* Sources List */
.sources-list {
	display: flex;
	flex-direction: column;
}

.source-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.875rem 1rem;
	text-decoration: none;
	border-bottom: 1px solid var(--ui-border-muted);
	transition: background-color 0.15s ease;
}

.source-item:last-child {
	border-bottom: none;
}

.source-item:hover {
	background: var(--ui-bg-muted);
}

.source-info {
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
	min-width: 0;
}

.source-name {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.priority-rank {
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	min-width: 1.25rem;
}

.primary-badge {
	display: inline-flex;
	align-items: center;
	padding: 0.125rem 0.375rem;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
	border-radius: 0.25rem;
}

.source-id {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	font-family: ui-monospace, monospace;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.source-status {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex-shrink: 0;
}

.failure-badge {
	display: inline-flex;
	align-items: center;
	padding: 0.125rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-error);
	background: var(--ui-error-soft);
	border-radius: 2rem;
}

.link-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
}
</style>
