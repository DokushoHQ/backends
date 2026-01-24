import { marked } from "marked"
import DOMPurify from "isomorphic-dompurify"

// Configure marked for safe rendering
marked.setOptions({
	gfm: true, // GitHub Flavored Markdown
	breaks: true, // Convert \n to <br>
})

export function useMarkdown() {
	function render(content: string | null | undefined): string {
		if (!content) return ""
		const html = marked.parse(content, { async: false }) as string
		return DOMPurify.sanitize(html)
	}

	return { render }
}
