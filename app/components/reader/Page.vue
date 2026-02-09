<script setup lang="ts">
const props = defineProps<{
	url: string
	index: number
}>()

const emit = defineEmits<{
	loaded: [index: number]
	visible: [index: number]
}>()

const loaded = ref(false)
const imgRef = ref<HTMLElement>()
const observer = ref<IntersectionObserver>()

function onLoad() {
	loaded.value = true
	emit("loaded", props.index)
}

// Intersection observer for visibility tracking
onMounted(() => {
	if (!imgRef.value) return
	observer.value = new IntersectionObserver(
		(entries) => {
			if (entries[0]?.isIntersecting) {
				emit("visible", props.index)
			}
		},
		{ threshold: 0.5 },
	)
	observer.value.observe(imgRef.value)
})

onUnmounted(() => {
	observer.value?.disconnect()
})
</script>

<template>
	<div
		ref="imgRef"
		class="reader-page"
	>
		<div
			v-if="!loaded"
			class="reader-page__loading"
		>
			<UIcon
				name="i-lucide-loader-2"
				class="reader-page__spinner"
			/>
		</div>
		<img
			:src="url"
			:alt="`Page ${index + 1}`"
			class="reader-page__image"
			:class="{ 'reader-page__image--loaded': loaded }"
			loading="lazy"
			@load="onLoad"
		>
	</div>
</template>

<style scoped>
.reader-page {
	position: relative;
	min-height: 200px;
	display: flex;
	justify-content: center;
}

.reader-page__loading {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.reader-page__spinner {
	width: 1.5rem;
	height: 1.5rem;
	color: var(--ui-text-dimmed);
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.reader-page__image {
	max-width: 100%;
	height: auto;
	opacity: 0;
	transition: opacity 0.3s ease;
}

.reader-page__image--loaded {
	opacity: 1;
}
</style>
