<script setup lang="ts">
const props = defineProps<{
	content: string | null | undefined
}>()

const { render } = useMarkdown()

const rendered = computed(() => render(props.content))
</script>

<template>
	<!-- eslint-disable vue/no-v-html -- Sanitized with DOMPurify -->
	<div
		v-if="content"
		class="markdown-content"
		v-html="rendered"
	/>
	<!-- eslint-enable vue/no-v-html -->
</template>

<style scoped>
.markdown-content {
	font-size: var(--font-size-base);
	line-height: 1.7;
	color: var(--ui-text-muted);
}

.markdown-content :deep(p) {
	margin: 0 0 0.75rem 0;
}

.markdown-content :deep(p:last-child) {
	margin-bottom: 0;
}

.markdown-content :deep(strong),
.markdown-content :deep(b) {
	font-weight: 600;
	color: var(--ui-text);
}

.markdown-content :deep(em),
.markdown-content :deep(i) {
	font-style: italic;
}

.markdown-content :deep(a) {
	color: var(--ui-primary);
	text-decoration: underline;
	text-underline-offset: 2px;
}

.markdown-content :deep(a:hover) {
	opacity: 0.8;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
	margin: 0.5rem 0;
	padding-left: 1.5rem;
}

.markdown-content :deep(li) {
	margin: 0.25rem 0;
}

.markdown-content :deep(blockquote) {
	margin: 0.75rem 0;
	padding-left: 1rem;
	border-left: 3px solid var(--ui-border);
	color: var(--ui-text-dimmed);
	font-style: italic;
}

.markdown-content :deep(code) {
	padding: 0.125rem 0.375rem;
	font-size: 0.875em;
	background: var(--ui-bg-muted);
	border-radius: 0.25rem;
}

.markdown-content :deep(pre) {
	margin: 0.75rem 0;
	padding: 0.75rem 1rem;
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
	overflow-x: auto;
}

.markdown-content :deep(pre code) {
	padding: 0;
	background: transparent;
}

.markdown-content :deep(hr) {
	margin: 1rem 0;
	border: none;
	border-top: 1px solid var(--ui-border);
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4) {
	color: var(--ui-text);
	font-weight: 600;
	margin: 1rem 0 0.5rem 0;
}

.markdown-content :deep(h1:first-child),
.markdown-content :deep(h2:first-child),
.markdown-content :deep(h3:first-child),
.markdown-content :deep(h4:first-child) {
	margin-top: 0;
}
</style>
