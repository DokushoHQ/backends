<script setup lang="ts">
defineProps<{
	title: string
	description?: string
	icon: string
	color?: "purple" | "amber" | "orange" | "yellow" | "red" | "green" | "blue" | "gray"
	linkTo?: string
	linkLabel?: string
}>()
</script>

<template>
	<section class="content-card">
		<div class="card-header">
			<div class="title-row">
				<div
					class="icon-wrapper"
					:class="`color-${color || 'gray'}`"
				>
					<UIcon
						:name="icon"
						class="h-5 w-5"
					/>
				</div>
				<div>
					<h3>{{ title }}</h3>
					<p v-if="description">
						{{ description }}
					</p>
				</div>
			</div>
			<div class="header-actions">
				<slot name="header-actions" />
				<NuxtLink
					v-if="linkTo"
					:to="linkTo"
					class="view-all-link"
				>
					{{ linkLabel || 'View all' }}
					<UIcon
						name="i-lucide-arrow-right"
						class="h-4 w-4"
					/>
				</NuxtLink>
			</div>
		</div>

		<div class="card-body">
			<slot />
		</div>
	</section>
</template>

<style scoped>
.content-card {
	--purple: oklch(0.7 0.15 280);
	--purple-soft: oklch(0.7 0.15 280 / 0.12);
	--amber: oklch(0.75 0.15 70);
	--amber-soft: oklch(0.75 0.15 70 / 0.12);
	--orange: oklch(0.72 0.16 45);
	--orange-soft: oklch(0.72 0.16 45 / 0.12);
	--yellow: oklch(0.8 0.14 85);
	--yellow-soft: oklch(0.8 0.14 85 / 0.12);
	--red: oklch(0.65 0.2 25);
	--red-soft: oklch(0.65 0.2 25 / 0.12);
	--green: oklch(0.72 0.15 160);
	--green-soft: oklch(0.72 0.15 160 / 0.12);
	--blue: oklch(0.65 0.15 250);
	--blue-soft: oklch(0.65 0.15 250 / 0.12);

	display: flex;
	flex-direction: column;
	background: var(--color-background);
	border: 1px solid var(--color-border);
	border-radius: 0.75rem;
	overflow: hidden;
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 0.75rem;
	padding: 1rem;
	border-bottom: 1px solid var(--color-border);
}

.title-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	min-width: 0;
}

.icon-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 0.625rem;
	flex-shrink: 0;
	background: var(--color-muted);
	color: var(--color-text-muted);
}

.icon-wrapper.color-purple { background: var(--purple-soft); color: var(--purple); }
.icon-wrapper.color-amber { background: var(--amber-soft); color: var(--amber); }
.icon-wrapper.color-orange { background: var(--orange-soft); color: var(--orange); }
.icon-wrapper.color-yellow { background: var(--yellow-soft); color: var(--yellow); }
.icon-wrapper.color-red { background: var(--red-soft); color: var(--red); }
.icon-wrapper.color-green { background: var(--green-soft); color: var(--green); }
.icon-wrapper.color-blue { background: var(--blue-soft); color: var(--blue); }
.icon-wrapper.color-gray { background: var(--color-muted); color: var(--color-text-muted); }

.card-header h3 {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--color-text);
	line-height: 1.2;
}

.card-header p {
	font-size: var(--font-size-base);
	color: var(--color-text-muted);
	margin-top: 0.125rem;
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex-shrink: 0;
}

.view-all-link {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.5rem 0.75rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--color-text-muted);
	background: var(--color-muted);
	border-radius: 0.375rem;
	transition: all 0.15s ease;
	white-space: nowrap;
}

.view-all-link:hover {
	color: var(--color-text);
	background: var(--color-border);
}

.card-body {
	display: flex;
	flex-direction: column;
	flex: 1;
}

.card-body:empty {
	display: none;
}

/* Dark mode */
:root.dark .content-card {
	background: oklch(0.2 0.01 250);
}
</style>
