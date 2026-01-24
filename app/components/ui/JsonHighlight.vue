<script setup lang="ts">
const props = defineProps<{
	value: unknown
	maxHeight?: string
}>()

type TokenType = "key" | "string" | "number" | "boolean" | "null" | "punctuation"

interface Token {
	type: TokenType
	value: string
}

function makeToken(type: TokenType, value: string): Token {
	return { type, value }
}

// Tokenize JSON for syntax highlighting
function tokenizeJson(obj: unknown, indent = 0): Token[][] {
	const lines: Token[][] = []
	const spaces = "  ".repeat(indent)

	if (obj === null) {
		lines.push([makeToken("null", "null")])
	}
	else if (typeof obj === "boolean") {
		lines.push([makeToken("boolean", String(obj))])
	}
	else if (typeof obj === "number") {
		lines.push([makeToken("number", String(obj))])
	}
	else if (typeof obj === "string") {
		lines.push([makeToken("string", `"${escapeString(obj)}"`)])
	}
	else if (Array.isArray(obj)) {
		if (obj.length === 0) {
			lines.push([makeToken("punctuation", "[]")])
		}
		else {
			lines.push([makeToken("punctuation", "[")])
			obj.forEach((item, i) => {
				const itemLines = tokenizeJson(item, indent + 1)
				itemLines.forEach((tokens, lineIdx) => {
					const line: Token[] = []
					if (lineIdx === 0) line.push(makeToken("punctuation", spaces + "  "))
					line.push(...tokens)
					if (lineIdx === itemLines.length - 1 && i < obj.length - 1) {
						line.push(makeToken("punctuation", ","))
					}
					lines.push(line)
				})
			})
			lines.push([makeToken("punctuation", spaces + "]")])
		}
	}
	else if (typeof obj === "object") {
		const entries = Object.entries(obj as Record<string, unknown>)
		if (entries.length === 0) {
			lines.push([makeToken("punctuation", "{}")])
		}
		else {
			lines.push([makeToken("punctuation", "{")])
			entries.forEach(([key, val], i) => {
				const valLines = tokenizeJson(val, indent + 1)
				const isLast = i === entries.length - 1

				// First line: key + first value line
				const firstValTokens = valLines[0] || []
				const firstLine: Token[] = [
					makeToken("punctuation", spaces + "  "),
					makeToken("key", `"${escapeString(key)}"`),
					makeToken("punctuation", ": "),
					...firstValTokens,
				]
				if (valLines.length === 1 && !isLast) {
					firstLine.push(makeToken("punctuation", ","))
				}
				lines.push(firstLine)

				// Remaining value lines (for nested objects/arrays)
				for (let lineIdx = 1; lineIdx < valLines.length; lineIdx++) {
					const isLastLine = lineIdx === valLines.length - 1
					const line: Token[] = [...valLines[lineIdx]!]
					if (isLastLine && !isLast) {
						line.push(makeToken("punctuation", ","))
					}
					lines.push(line)
				}
			})
			lines.push([makeToken("punctuation", spaces + "}")])
		}
	}
	else {
		lines.push([makeToken("string", String(obj))])
	}

	return lines
}

function escapeString(str: string): string {
	return str
		.replace(/\\/g, "\\\\")
		.replace(/"/g, "\\\"")
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\t/g, "\\t")
}

const tokens = computed(() => tokenizeJson(props.value))
</script>

<template>
	<div
		class="json-highlight"
		:style="maxHeight ? { maxHeight } : undefined"
	>
		<code class="json-code">
			<div
				v-for="(line, i) in tokens"
				:key="i"
				class="json-line"
			>
				<span
					v-for="(token, j) in line"
					:key="j"
					:class="`token-${token.type}`"
				>{{ token.value }}</span>
			</div>
		</code>
	</div>
</template>

<style scoped>
.json-highlight {
	font-size: var(--font-size-xs);
	font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
	padding: 0.75rem;
	background: var(--ui-bg-muted);
	border-radius: 0.375rem;
	overflow: auto;
	line-height: 1.5;
}

.json-code {
	display: block;
}

.json-line {
	white-space: pre;
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
</style>
