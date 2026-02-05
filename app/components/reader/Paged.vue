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
		emit(props.direction === "rtl" ? "next" : "prev")
	}
	else if (x > third * 2) {
		emit(props.direction === "rtl" ? "prev" : "next")
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

		<div class="reader-paged__zones">
			<div class="reader-paged__zone reader-paged__zone--prev">
				<UIcon
					:name="direction === 'rtl' ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'"
					class="reader-paged__zone-icon"
				/>
			</div>
			<div class="reader-paged__zone reader-paged__zone--next">
				<UIcon
					:name="direction === 'rtl' ? 'i-lucide-chevron-left' : 'i-lucide-chevron-right'"
					class="reader-paged__zone-icon"
				/>
			</div>
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

.reader-paged__zones {
	position: absolute;
	inset: 0;
	display: flex;
	pointer-events: none;
}

.reader-paged__zone {
	flex: 1;
	display: flex;
	align-items: center;
	opacity: 0;
	transition: opacity 0.2s ease;
}

.reader-paged:hover .reader-paged__zone {
	opacity: 1;
}

.reader-paged__zone--prev {
	justify-content: flex-start;
	padding-left: 1rem;
}

.reader-paged__zone--next {
	justify-content: flex-end;
	padding-right: 1rem;
	flex: 2;
}

.reader-paged__zone-icon {
	width: 2rem;
	height: 2rem;
	color: var(--ui-text-dimmed);
	background: color-mix(in oklch, var(--ui-bg) 80%, transparent);
	border-radius: 50%;
	padding: 0.25rem;
}
</style>
