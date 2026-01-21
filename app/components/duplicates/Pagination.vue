<script setup lang="ts">
const props = defineProps<{
	page: number
	totalPages: number
}>()

const emit = defineEmits<{
	"update:page": [page: number]
}>()

function setPage(newPage: number) {
	if (newPage >= 1 && newPage <= props.totalPages) {
		emit("update:page", newPage)
	}
}

function handlePageJump(event: Event) {
	const input = event.target as HTMLInputElement
	const value = Number.parseInt(input.value, 10)
	if (value >= 1 && value <= props.totalPages) {
		setPage(value)
	}
	else {
		input.value = String(props.page)
	}
}

// Generate page numbers with ellipsis
const paginationPages = computed(() => {
	const total = props.totalPages
	const current = props.page
	const pages: (number | string)[] = []

	if (total <= 7) {
		for (let i = 1; i <= total; i++) pages.push(i)
	}
	else {
		pages.push(1)

		if (current > 3) {
			pages.push("...")
		}

		const start = Math.max(2, current - 1)
		const end = Math.min(total - 1, current + 1)

		for (let i = start; i <= end; i++) {
			pages.push(i)
		}

		if (current < total - 2) {
			pages.push("...")
		}

		pages.push(total)
	}

	return pages
})
</script>

<template>
	<div
		v-if="totalPages > 1"
		class="pagination"
	>
		<!-- First page -->
		<button
			class="page-button"
			:disabled="page <= 1"
			title="First page"
			@click="setPage(1)"
		>
			<UIcon
				name="i-lucide-chevrons-left"
				class="h-4 w-4"
			/>
		</button>

		<!-- Previous -->
		<button
			class="page-button"
			:disabled="page <= 1"
			title="Previous page"
			@click="setPage(page - 1)"
		>
			<UIcon
				name="i-lucide-chevron-left"
				class="h-4 w-4"
			/>
		</button>

		<!-- Page numbers -->
		<div class="page-numbers">
			<template
				v-for="p in paginationPages"
				:key="p"
			>
				<span
					v-if="p === '...'"
					class="page-ellipsis"
				>...</span>
				<button
					v-else
					class="page-number"
					:class="{ active: p === page }"
					@click="setPage(p as number)"
				>
					{{ p }}
				</button>
			</template>
		</div>

		<!-- Next -->
		<button
			class="page-button"
			:disabled="page >= totalPages"
			title="Next page"
			@click="setPage(page + 1)"
		>
			<UIcon
				name="i-lucide-chevron-right"
				class="h-4 w-4"
			/>
		</button>

		<!-- Last page -->
		<button
			class="page-button"
			:disabled="page >= totalPages"
			title="Last page"
			@click="setPage(totalPages)"
		>
			<UIcon
				name="i-lucide-chevrons-right"
				class="h-4 w-4"
			/>
		</button>

		<!-- Jump to page -->
		<div class="page-jump">
			<span>Go to</span>
			<input
				type="number"
				:value="page"
				:min="1"
				:max="totalPages"
				class="page-input"
				@keydown.enter="($event.target as HTMLInputElement).blur()"
				@blur="handlePageJump($event)"
			>
		</div>
	</div>
</template>

<style scoped>
.pagination {
	--accent: oklch(0.7 0.15 250);

	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	margin-top: 1.5rem;
	padding: 1rem;
	flex-wrap: wrap;
}

.page-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.25rem;
	height: 2.25rem;
	color: var(--color-text-muted);
	background: var(--color-background);
	border: 1px solid var(--color-border);
	border-radius: 0.5rem;
	transition: all 0.15s ease;
}

.page-button:hover:not(:disabled) {
	color: var(--color-text);
	border-color: var(--accent);
}

.page-button:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.page-numbers {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	margin: 0 0.5rem;
}

.page-number {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 2.25rem;
	height: 2.25rem;
	padding: 0 0.5rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--color-text-muted);
	background: var(--color-background);
	border: 1px solid var(--color-border);
	border-radius: 0.5rem;
	transition: all 0.15s ease;
	font-variant-numeric: tabular-nums;
}

.page-number:hover {
	color: var(--color-text);
	border-color: var(--accent);
}

.page-number.active {
	color: white;
	background: var(--accent);
	border-color: var(--accent);
}

.page-ellipsis {
	padding: 0 0.375rem;
	color: var(--color-text-muted);
	font-size: 0.875rem;
}

.page-jump {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-left: 1rem;
	padding-left: 1rem;
	border-left: 1px solid var(--color-border);
}

.page-jump span {
	font-size: 0.8125rem;
	color: var(--color-text-muted);
}

.page-input {
	width: 3.5rem;
	height: 2.25rem;
	padding: 0 0.5rem;
	font-size: 0.875rem;
	font-weight: 500;
	text-align: center;
	color: var(--color-text);
	background: var(--color-background);
	border: 1px solid var(--color-border);
	border-radius: 0.5rem;
	font-variant-numeric: tabular-nums;
	-moz-appearance: textfield;
}

.page-input::-webkit-outer-spin-button,
.page-input::-webkit-inner-spin-button {
	-webkit-appearance: none;
	margin: 0;
}

.page-input:focus {
	outline: none;
	border-color: var(--accent);
}
</style>
