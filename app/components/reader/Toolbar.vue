<script setup lang="ts">
defineProps<{
	serieId: string
	serieTitle: string
	chapterNumber: number
	chapterTitle?: string | null
	prevChapter: { id: string, chapter_number: number, title: string | null } | null
	nextChapter: { id: string, chapter_number: number, title: string | null } | null
	mode: "vertical" | "paged"
}>()

const emit = defineEmits<{
	"update:mode": [mode: "vertical" | "paged"]
	"toggle-fullscreen": []
}>()
</script>

<template>
	<div class="reader-toolbar">
		<div class="reader-toolbar__left">
			<NuxtLink
				:to="`/series/${serieId}`"
				class="reader-toolbar__back"
			>
				<UIcon
					name="i-lucide-arrow-left"
					class="size-4"
				/>
				<span class="reader-toolbar__back-text">{{ serieTitle }}</span>
			</NuxtLink>

			<span class="reader-toolbar__separator">/</span>

			<span class="reader-toolbar__chapter">
				Ch. {{ chapterNumber }}
				<span
					v-if="chapterTitle"
					class="reader-toolbar__chapter-title"
				>
					- {{ chapterTitle }}
				</span>
			</span>
		</div>

		<div class="reader-toolbar__right">
			<NuxtLink
				v-if="prevChapter"
				:to="`/read/${serieId}/${prevChapter.id}`"
				class="reader-toolbar__nav-btn"
				title="Previous chapter ([)"
			>
				<UIcon
					name="i-lucide-chevron-left"
					class="size-4"
				/>
			</NuxtLink>
			<span
				v-else
				class="reader-toolbar__nav-btn reader-toolbar__nav-btn--disabled"
			>
				<UIcon
					name="i-lucide-chevron-left"
					class="size-4"
				/>
			</span>

			<NuxtLink
				v-if="nextChapter"
				:to="`/read/${serieId}/${nextChapter.id}`"
				class="reader-toolbar__nav-btn"
				title="Next chapter (])"
			>
				<UIcon
					name="i-lucide-chevron-right"
					class="size-4"
				/>
			</NuxtLink>
			<span
				v-else
				class="reader-toolbar__nav-btn reader-toolbar__nav-btn--disabled"
			>
				<UIcon
					name="i-lucide-chevron-right"
					class="size-4"
				/>
			</span>

			<div class="reader-toolbar__divider" />

			<button
				class="reader-toolbar__mode-btn"
				:class="{ 'reader-toolbar__mode-btn--active': mode === 'vertical' }"
				title="Vertical scroll"
				@click="emit('update:mode', 'vertical')"
			>
				<UIcon
					name="i-lucide-scroll"
					class="size-4"
				/>
			</button>

			<button
				class="reader-toolbar__mode-btn"
				:class="{ 'reader-toolbar__mode-btn--active': mode === 'paged' }"
				title="Paged mode"
				@click="emit('update:mode', 'paged')"
			>
				<UIcon
					name="i-lucide-book-open"
					class="size-4"
				/>
			</button>

			<div class="reader-toolbar__divider" />

			<button
				class="reader-toolbar__mode-btn"
				title="Fullscreen (F)"
				@click="emit('toggle-fullscreen')"
			>
				<UIcon
					name="i-lucide-maximize"
					class="size-4"
				/>
			</button>
		</div>
	</div>
</template>

<style scoped>
.reader-toolbar {
	height: 3rem;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 1rem;
	border-bottom: 1px solid var(--ui-border);
	background: var(--ui-bg-elevated);
	flex-shrink: 0;
	gap: 1rem;
}

.reader-toolbar__left {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	min-width: 0;
	flex: 1;
}

.reader-toolbar__back {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	color: var(--ui-text-muted);
	text-decoration: none;
	font-size: var(--font-size-sm);
	transition: color 0.15s ease;
	white-space: nowrap;
}

.reader-toolbar__back:hover {
	color: var(--ui-text);
}

.reader-toolbar__back-text {
	display: none;
}

@media (min-width: 640px) {
	.reader-toolbar__back-text {
		display: inline;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.reader-toolbar__separator {
	color: var(--ui-text-dimmed);
	font-size: var(--font-size-sm);
}

.reader-toolbar__chapter {
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.reader-toolbar__chapter-title {
	font-weight: 400;
	color: var(--ui-text-muted);
}

.reader-toolbar__right {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	flex-shrink: 0;
}

.reader-toolbar__nav-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
	border-radius: 0.375rem;
	color: var(--ui-text-muted);
	text-decoration: none;
	transition: color 0.15s ease, background-color 0.15s ease;
}

.reader-toolbar__nav-btn:hover:not(.reader-toolbar__nav-btn--disabled) {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

.reader-toolbar__nav-btn--disabled {
	opacity: 0.3;
	cursor: default;
}

.reader-toolbar__divider {
	width: 1px;
	height: 1.25rem;
	background: var(--ui-border);
	margin: 0 0.25rem;
}

.reader-toolbar__mode-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
	border-radius: 0.375rem;
	border: none;
	background: transparent;
	color: var(--ui-text-muted);
	cursor: pointer;
	transition: color 0.15s ease, background-color 0.15s ease;
}

.reader-toolbar__mode-btn:hover {
	color: var(--ui-text);
	background: var(--ui-bg-muted);
}

.reader-toolbar__mode-btn--active {
	color: var(--ui-primary);
	background: color-mix(in oklch, var(--ui-primary) 10%, transparent);
}
</style>
