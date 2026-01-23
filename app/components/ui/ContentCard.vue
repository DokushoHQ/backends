<script setup lang="ts">
defineProps<{
	title: string
	description?: string
	icon: string
	color?: "purple" | "amber" | "orange" | "yellow" | "red" | "green" | "blue" | "gray"
	linkTo?: string
	linkLabel?: string
	danger?: boolean
}>()
</script>

<template>
	<section
		class="content-card"
		:class="{ danger }"
	>
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
	display: flex;
	flex-direction: column;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.75rem;
	overflow: hidden;
}

.content-card.danger {
	border-color: color-mix(in oklch, var(--ui-error) 30%, transparent);
}

.content-card.danger .card-header {
	border-bottom-color: color-mix(in oklch, var(--ui-error) 15%, transparent);
}

.content-card.danger .card-header h3 {
	color: var(--ui-error);
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 0.75rem;
	padding: 1rem;
	border-bottom: 1px solid var(--ui-border);
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
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}

.icon-wrapper.color-purple { background: var(--color-purple-soft); color: var(--color-purple); }
.icon-wrapper.color-amber { background: var(--ui-warning-soft); color: var(--ui-warning); }
.icon-wrapper.color-orange { background: var(--ui-warning-soft); color: var(--ui-warning); }
.icon-wrapper.color-yellow { background: var(--ui-info-soft); color: var(--ui-info); }
.icon-wrapper.color-red { background: var(--ui-error-soft); color: var(--ui-error); }
.icon-wrapper.color-green { background: var(--ui-success-soft); color: var(--ui-success); }
.icon-wrapper.color-blue { background: var(--ui-primary-soft); color: var(--ui-primary); }
.icon-wrapper.color-gray { background: var(--ui-bg-muted); color: var(--ui-text-muted); }

.card-header h3 {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
	line-height: 1.2;
}

.card-header p {
	font-size: var(--font-size-base);
	color: var(--ui-text-muted);
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
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	border-radius: 0.375rem;
	transition: all 0.15s ease;
	white-space: nowrap;
}

.view-all-link:hover {
	color: var(--ui-text);
	background: var(--ui-border);
}

.card-body {
	display: flex;
	flex-direction: column;
	flex: 1;
}

.card-body:empty {
	display: none;
}
</style>
