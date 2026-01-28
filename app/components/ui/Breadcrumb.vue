<script setup lang="ts">
export interface BreadcrumbItem {
	label: string
	to?: string
}

const props = defineProps<{
	items: BreadcrumbItem[]
	/**
	 * Maximum characters before truncating a label
	 * @default 30
	 */
	truncateAt?: number
}>()

const truncateAt = computed(() => props.truncateAt ?? 30)

function truncateLabel(label: string): string {
	if (label.length > truncateAt.value) {
		return `${label.slice(0, truncateAt.value)}...`
	}
	return label
}
</script>

<template>
	<nav
		class="breadcrumb"
		aria-label="Breadcrumb"
	>
		<template
			v-for="(item, idx) in items"
			:key="idx"
		>
			<!-- Separator (except for first item) -->
			<span
				v-if="idx > 0"
				class="crumb-sep hide-mobile"
			>/</span>

			<!-- Link item -->
			<NuxtLink
				v-if="item.to"
				:to="item.to"
				class="crumb"
				:class="{
					'crumb-title': idx > 0 && idx < items.length - 1,
					'hide-mobile': idx < items.length - 1,
				}"
			>
				{{ truncateLabel(item.label).toUpperCase() }}
			</NuxtLink>

			<!-- Active item (last item without link, or item without `to`) -->
			<span
				v-else
				class="crumb crumb-active"
			>
				{{ truncateLabel(item.label).toUpperCase() }}
			</span>
		</template>
	</nav>
</template>

<style scoped>
.breadcrumb {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	letter-spacing: 0.03em;
	overflow: hidden;
}

.crumb {
	color: var(--ui-text-muted);
	text-decoration: none;
	white-space: nowrap;
	transition: color 0.15s ease;
}

.crumb:hover {
	color: var(--ui-primary);
}

.crumb-title {
	max-width: 20rem;
	overflow: hidden;
	text-overflow: ellipsis;
}

.crumb-active {
	color: var(--ui-primary);
}

.crumb-sep {
	color: var(--ui-text-dimmed);
	flex-shrink: 0;
}

@media (max-width: 767px) {
	.breadcrumb {
		flex: 1;
		justify-content: center;
	}

	.hide-mobile {
		display: none;
	}
}
</style>
