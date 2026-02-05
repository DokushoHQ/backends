<script setup lang="ts">
const props = defineProps<{
	pages: Array<{ index: number, type: string, url: string | null, content: string | null }>
}>()

const emit = defineEmits<{
	"page-visible": [index: number]
}>()

const imagePages = computed(() => props.pages.filter(p => p.type === "image" && p.url))

function handleVisible(index: number) {
	emit("page-visible", index)
}
</script>

<template>
	<div class="reader-vertical">
		<ReaderPage
			v-for="page in imagePages"
			:key="page.index"
			:url="page.url!"
			:index="page.index"
			@visible="handleVisible"
		/>
	</div>
</template>

<style scoped>
.reader-vertical {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0;
	max-width: 900px;
	margin: 0 auto;
}
</style>
