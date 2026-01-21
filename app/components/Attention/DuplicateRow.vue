<script setup lang="ts">
defineProps<{
	group: {
		id: string
		confidence: number
		series: Array<{
			id: string
			title: string
			cover: string | null
		}>
	}
}>()
</script>

<template>
	<NuxtLink
		to="/attention/duplicates"
		class="duplicate-row"
	>
		<div class="cover-stack">
			<div
				v-for="(serie, idx) in group.series.slice(0, 2)"
				:key="serie.id"
				class="stacked-cover"
				:style="{ '--idx': idx }"
			>
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
						name="i-lucide-image"
						class="h-4 w-4"
					/>
				</div>
			</div>
		</div>
		<div class="row-info">
			<span class="row-title">
				{{ group.series[0]?.title }}
			</span>
			<span class="row-meta">
				<span class="confidence">{{ group.confidence }}% match</span>
			</span>
		</div>
		<UIcon
			name="i-lucide-chevron-right"
			class="h-4 w-4 row-chevron"
		/>
	</NuxtLink>
</template>

<style scoped>
.duplicate-row {
	--purple: oklch(0.7 0.15 280);

	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem;
	text-decoration: none;
	transition: background 0.15s ease;
	border-bottom: 1px solid var(--color-border);
}

.duplicate-row:last-child {
	border-bottom: none;
}

.duplicate-row:hover {
	background: var(--color-muted);
}

.cover-stack {
	position: relative;
	width: 3.5rem;
	height: 4.5rem;
	flex-shrink: 0;
}

.stacked-cover {
	position: absolute;
	width: 2.5rem;
	height: 3.5rem;
	border-radius: 0.375rem;
	overflow: hidden;
	background: var(--color-muted);
	border: 2px solid var(--color-background);
	transition: transform 0.15s ease;
}

.stacked-cover:nth-child(1) {
	z-index: 2;
	left: 0;
	top: 0;
}

.stacked-cover:nth-child(2) {
	z-index: 1;
	left: 0.875rem;
	top: 0.625rem;
}

.duplicate-row:hover .stacked-cover:nth-child(2) {
	transform: translateX(2px);
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
	font-size: var(--font-size-sm);
	color: var(--color-text-muted);
}

.confidence {
	color: var(--purple);
	font-weight: 500;
}

.row-chevron {
	flex-shrink: 0;
	color: var(--color-text-muted);
}
</style>
