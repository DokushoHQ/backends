import type { ParsedUrlResult } from "~/composables/useSourceBrowser"

// ParsedUrlItem for ImportDialog component
export interface UIParsedUrlItem {
	url: string
	result: ParsedUrlResult | { success: false, error: string }
	importing?: boolean
	selected?: boolean
}
