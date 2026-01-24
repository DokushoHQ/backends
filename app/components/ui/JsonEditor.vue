<script setup lang="ts">
const props = defineProps<{
	modelValue: string
	placeholder?: string
	rows?: number
	error?: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const highlightRef = ref<HTMLElement | null>(null)

// Sync scroll between textarea and highlight layer
function syncScroll() {
	if (textareaRef.value && highlightRef.value) {
		highlightRef.value.scrollTop = textareaRef.value.scrollTop
		highlightRef.value.scrollLeft = textareaRef.value.scrollLeft
	}
}

// Tokenize for syntax highlighting
type TokenType = "key" | "string" | "number" | "boolean" | "null" | "punctuation" | "error"

interface Token {
	type: TokenType
	value: string
}

function tokenizeJsonString(str: string): Token[] {
	const tokens: Token[] = []
	let i = 0

	while (i < str.length) {
		const char = str[i]

		// Whitespace
		if (/\s/.test(char!)) {
			let ws = ""
			while (i < str.length && /\s/.test(str[i]!)) {
				ws += str[i]
				i++
			}
			tokens.push({ type: "punctuation", value: ws })
			continue
		}

		// Punctuation
		if ("{}[],:".includes(char!)) {
			tokens.push({ type: "punctuation", value: char! })
			i++
			continue
		}

		// String
		if (char === "\"") {
			let strVal = "\""
			i++
			while (i < str.length && str[i] !== "\"") {
				if (str[i] === "\\" && i + 1 < str.length) {
					strVal += str[i]! + str[i + 1]!
					i += 2
				}
				else {
					strVal += str[i]
					i++
				}
			}
			if (i < str.length) {
				strVal += "\""
				i++
			}

			// Check if this is a key (followed by colon)
			let lookAhead = i
			while (lookAhead < str.length && /\s/.test(str[lookAhead]!)) lookAhead++
			const isKey = str[lookAhead] === ":"

			tokens.push({ type: isKey ? "key" : "string", value: strVal })
			continue
		}

		// Number
		if (/[-\d]/.test(char!)) {
			let num = ""
			while (i < str.length && /[-\d.eE+]/.test(str[i]!)) {
				num += str[i]
				i++
			}
			tokens.push({ type: "number", value: num })
			continue
		}

		// Keywords (true, false, null)
		if (str.slice(i, i + 4) === "true") {
			tokens.push({ type: "boolean", value: "true" })
			i += 4
			continue
		}
		if (str.slice(i, i + 5) === "false") {
			tokens.push({ type: "boolean", value: "false" })
			i += 5
			continue
		}
		if (str.slice(i, i + 4) === "null") {
			tokens.push({ type: "null", value: "null" })
			i += 4
			continue
		}

		// Unknown character (error)
		tokens.push({ type: "error", value: char! })
		i++
	}

	return tokens
}

const tokens = computed(() => tokenizeJsonString(props.modelValue))

function handleInput(event: Event) {
	const target = event.target as HTMLTextAreaElement
	emit("update:modelValue", target.value)
}
</script>

<template>
	<div
		class="json-editor"
		:class="{ 'has-error': error }"
	>
		<!-- Syntax highlighted layer (behind) -->
		<pre
			ref="highlightRef"
			class="highlight-layer"
			aria-hidden="true"
		><code><span
			v-for="(token, i) in tokens"
			:key="i"
			:class="`token-${token.type}`"
		>{{ token.value }}</span></code><br></pre>

		<!-- Textarea layer (front, transparent text) -->
		<textarea
			ref="textareaRef"
			:value="modelValue"
			:placeholder="placeholder"
			:rows="rows ?? 10"
			class="input-layer"
			spellcheck="false"
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			@input="handleInput"
			@scroll="syncScroll"
		/>
	</div>
</template>

<style scoped>
.json-editor {
	position: relative;
	font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
	font-size: var(--font-size-xs);
	line-height: 1.5;
	border-radius: 0.375rem;
	border: 1px solid var(--ui-border);
	background: var(--ui-bg);
	overflow: hidden;
}

.json-editor:focus-within {
	border-color: var(--ui-primary);
	outline: 2px solid color-mix(in oklch, var(--ui-primary) 20%, transparent);
	outline-offset: 0;
}

.json-editor.has-error {
	border-color: var(--ui-error);
}

.json-editor.has-error:focus-within {
	outline-color: color-mix(in oklch, var(--ui-error) 20%, transparent);
}

.highlight-layer,
.input-layer {
	margin: 0;
	padding: 0.75rem;
	border: none;
	font: inherit;
	line-height: inherit;
	white-space: pre-wrap;
	word-wrap: break-word;
	overflow-wrap: break-word;
}

.highlight-layer {
	position: absolute;
	inset: 0;
	pointer-events: none;
	overflow: auto;
	color: transparent;
	background: transparent;
}

.highlight-layer code {
	display: block;
}

.input-layer {
	position: relative;
	width: 100%;
	height: 100%;
	min-height: 10rem;
	resize: vertical;
	background: transparent;
	color: transparent;
	caret-color: var(--ui-text);
	outline: none;
}

.input-layer::placeholder {
	color: var(--ui-text-muted);
}

/* Token colors */
.token-key {
	color: var(--ui-primary);
}

.token-string {
	color: var(--ui-success);
}

.token-number {
	color: var(--color-cyan);
}

.token-boolean {
	color: var(--color-purple);
}

.token-null {
	color: var(--ui-text-muted);
	font-style: italic;
}

.token-punctuation {
	color: var(--ui-text-muted);
}

.token-error {
	color: var(--ui-error);
	background: var(--ui-error-soft);
}
</style>
