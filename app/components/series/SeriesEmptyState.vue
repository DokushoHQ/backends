<script setup lang="ts">
const props = defineProps<{
	type: "empty" | "no-results" | "no-failures"
	searchQuery?: string
	isAdmin?: boolean
}>()

const emit = defineEmits<{
	clearFilters: []
}>()

const iconName = computed(() => {
	switch (props.type) {
		case "no-failures":
			return "i-lucide-check-circle"
		case "no-results":
			return "i-lucide-search-x"
		default:
			return "i-lucide-library"
	}
})

const title = computed(() => {
	switch (props.type) {
		case "no-failures":
			return "All series healthy"
		case "no-results":
			return "No matches found"
		default:
			return "Your library awaits"
	}
})

const description = computed(() => {
	switch (props.type) {
		case "no-failures":
			return "Every series is updating successfully. Nice work keeping things tidy."
		case "no-results":
			return `No series matching "${props.searchQuery}". Try a different search term.`
		default:
			return "Start building your collection by importing series from your favorite sources."
	}
})
</script>

<template>
	<div class="empty-state">
		<div class="empty-illustration">
			<!-- Stacked manga volumes illustration -->
			<div class="book-stack">
				<div class="book book-1" />
				<div class="book book-2" />
				<div class="book book-3" />
			</div>
			<div class="illustration-icon">
				<UIcon
					:name="iconName"
					class="main-icon"
				/>
			</div>
		</div>

		<div class="empty-content">
			<h2 class="empty-title">
				{{ title }}
			</h2>

			<p class="empty-description">
				{{ description }}
			</p>

			<div class="empty-actions">
				<UButton
					v-if="type === 'no-results'"
					variant="outline"
					icon="i-lucide-x"
					@click="emit('clearFilters')"
				>
					Clear filters
				</UButton>
				<UButton
					v-if="type === 'empty' && isAdmin"
					icon="i-lucide-plus"
					to="/series/import"
				>
					Import Series
				</UButton>
			</div>
		</div>
	</div>
</template>

<style scoped>
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 3rem 1.5rem;
	text-align: center;
}

.empty-illustration {
	position: relative;
	width: 8rem;
	height: 6rem;
	margin-bottom: 1.5rem;
}

/* Stacked book illustration */
.book-stack {
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
}

.book {
	position: absolute;
	bottom: 0;
	border-radius: 0.25rem 0.125rem 0.125rem 0.25rem;
	box-shadow:
		inset -2px 0 0 color-mix(in oklch, var(--ui-text) 8%, transparent),
		0 2px 4px color-mix(in oklch, var(--ui-text) 10%, transparent);
}

.book-1 {
	width: 2.5rem;
	height: 3.5rem;
	left: -1rem;
	background: color-mix(in oklch, var(--ui-primary) 20%, var(--ui-bg-muted));
	transform: rotate(-8deg);
}

.book-2 {
	width: 2.25rem;
	height: 3.25rem;
	left: 0.5rem;
	background: color-mix(in oklch, var(--ui-warning) 25%, var(--ui-bg-muted));
	transform: rotate(-2deg);
}

.book-3 {
	width: 2rem;
	height: 3rem;
	left: 1.75rem;
	background: color-mix(in oklch, var(--ui-success) 20%, var(--ui-bg-muted));
	transform: rotate(5deg);
}

.illustration-icon {
	position: absolute;
	top: 0;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 3rem;
	height: 3rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 50%;
	box-shadow: 0 4px 12px color-mix(in oklch, var(--ui-text) 8%, transparent);
}

.main-icon {
	width: 1.5rem;
	height: 1.5rem;
	color: var(--ui-text-muted);
}

.empty-content {
	max-width: 24rem;
}

.empty-title {
	font-size: var(--font-size-xl);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0 0 0.5rem;
}

.empty-description {
	font-size: var(--font-size-base);
	color: var(--ui-text-muted);
	line-height: 1.5;
	margin: 0 0 1.25rem;
}

.empty-actions {
	display: flex;
	gap: 0.75rem;
	justify-content: center;
}
</style>
