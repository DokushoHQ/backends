<script setup lang="ts">
const props = defineProps<{
	spreadPages: Array<{ index: number, type: string, url: string | null, content: string | null }>
	currentSpreadIndex: number
	totalSpreads: number
	totalIndividualPages: number
	pageRange: { start: number, end: number }
	direction: "ltr" | "rtl"
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
		if (props.direction === "rtl") emit("next")
		else emit("prev")
	}
	else if (x > third * 2) {
		if (props.direction === "rtl") emit("prev")
		else emit("next")
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
			:class="{ 'reader-double__container--pair': isPair, 'reader-double__container--rtl': direction === 'rtl' }"
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
	</div>
</template>

<style scoped>
.reader-double {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: calc(100vh - 4rem);
	cursor: pointer;
	user-select: none;
}

.reader-double__container {
	max-width: 1400px;
	max-height: calc(100vh - 4rem);
	display: flex;
	align-items: center;
	justify-content: center;
}

.reader-double__container--pair {
	gap: 2px;
}

.reader-double__container--rtl {
	flex-direction: row-reverse;
}

.reader-double__image {
	max-width: 100%;
	max-height: calc(100vh - 4rem);
	object-fit: contain;
}

.reader-double__image--half {
	max-width: 50%;
}
</style>
