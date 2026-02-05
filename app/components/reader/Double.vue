<script setup lang="ts">
const props = defineProps<{
	spreadPages: Array<{ index: number, type: string, url: string | null, content: string | null }>
	currentSpreadIndex: number
	totalSpreads: number
	totalIndividualPages: number
	pageRange: { start: number, end: number }
}>()

const emit = defineEmits<{
	next: []
	prev: []
}>()

const isPair = computed(() => props.spreadPages.length === 2)

function handleClick(e: MouseEvent) {
	const target = e.currentTarget as HTMLElement
	const rect = target.getBoundingClientRect()
	const x = e.clientX - rect.left
	const third = rect.width / 3

	if (x < third) {
		emit("prev")
	}
	else if (x > third * 2) {
		emit("next")
	}
}
</script>

<template>
	<div
		class="reader-double"
		@click="handleClick"
	>
		<div
			v-if="spreadPages.length > 0"
			class="reader-double__container"
			:class="{ 'reader-double__container--pair': isPair }"
		>
			<img
				v-for="page in spreadPages"
				:key="page.index"
				:src="page.url!"
				:alt="`Page ${page.index + 1}`"
				class="reader-double__image"
				:class="{ 'reader-double__image--half': isPair }"
			>
		</div>

		<div class="reader-double__zones">
			<div class="reader-double__zone reader-double__zone--prev">
				<UIcon
					name="i-lucide-chevron-left"
					class="reader-double__zone-icon"
				/>
			</div>
			<div class="reader-double__zone reader-double__zone--next">
				<UIcon
					name="i-lucide-chevron-right"
					class="reader-double__zone-icon"
				/>
			</div>
		</div>
	</div>
</template>

<style scoped>
.reader-double {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: calc(100vh - 7rem);
	cursor: pointer;
	user-select: none;
}

.reader-double__container {
	max-width: 1400px;
	max-height: calc(100vh - 7rem);
	display: flex;
	align-items: center;
	justify-content: center;
}

.reader-double__container--pair {
	gap: 2px;
}

.reader-double__image {
	max-width: 100%;
	max-height: calc(100vh - 7rem);
	object-fit: contain;
}

.reader-double__image--half {
	max-width: 50%;
}

.reader-double__zones {
	position: absolute;
	inset: 0;
	display: flex;
	pointer-events: none;
}

.reader-double__zone {
	flex: 1;
	display: flex;
	align-items: center;
	opacity: 0;
	transition: opacity 0.2s ease;
}

.reader-double:hover .reader-double__zone {
	opacity: 1;
}

.reader-double__zone--prev {
	justify-content: flex-start;
	padding-left: 1rem;
}

.reader-double__zone--next {
	justify-content: flex-end;
	padding-right: 1rem;
	flex: 2;
}

.reader-double__zone-icon {
	width: 2rem;
	height: 2rem;
	color: var(--ui-text-dimmed);
	background: color-mix(in oklch, var(--ui-bg) 80%, transparent);
	border-radius: 50%;
	padding: 0.25rem;
}
</style>
