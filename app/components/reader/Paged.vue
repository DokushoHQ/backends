<script setup lang="ts">
const props = defineProps<{
	pages: Array<{ index: number, type: string, url: string | null, content: string | null }>
	currentPage: number
	direction: "ltr" | "rtl"
}>()

const emit = defineEmits<{
	"next": []
	"prev": []
	"update:currentPage": [page: number]
}>()

const imagePages = computed(() => props.pages.filter(p => p.type === "image" && p.url))
const current = computed(() => imagePages.value[props.currentPage])

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
		class="reader-paged"
		@click="handleClick"
	>
		<div
			v-if="current"
			class="reader-paged__container"
		>
			<img
				:key="current.index"
				:src="current.url!"
				:alt="`Page ${current.index + 1}`"
				class="reader-paged__image"
			>
		</div>
	</div>
</template>

<style scoped>
.reader-paged {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: calc(100vh - 4rem);
	cursor: pointer;
	user-select: none;
}

.reader-paged__container {
	max-width: 900px;
	max-height: calc(100vh - 4rem);
	display: flex;
	align-items: center;
	justify-content: center;
}

.reader-paged__image {
	max-width: 100%;
	max-height: calc(100vh - 4rem);
	object-fit: contain;
}
</style>
