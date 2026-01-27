// Page fetch status enum values
export type PageFetchStatus = "Pending" | "InProgress" | "Success" | "Partial" | "Failed" | "PermanentlyFailed" | "Incomplete"

// Alternative chapter info for duplicate display
export interface UIChapterAlternative {
	id: string
	enabled: boolean
	date_upload: string | Date
	page_fetch_status: PageFetchStatus
	groups: { id: string, name: string, url: string | null }[]
}

// Chapter type for ChapterTable component
// Note: Date fields accept both Date and string to handle Nuxt serialization
export interface UIChapter {
	id: string
	title: string | null
	chapter_number: number
	volume_number: number | null
	language: string
	date_upload: string | Date
	enabled: boolean
	source_removed_at: string | Date | null
	source_removal_acknowledged_at: string | Date | null
	page_fetch_status: PageFetchStatus
	source: { external_id: string, name: string }
	groups: { id: string, name: string, url: string | null }[]
	// Same-source duplicate info (only populated when includeDisabled=true)
	has_alternatives?: boolean
	alternatives?: UIChapterAlternative[]
}

// Union type for chapter list items (chapter or missing marker)
export type UIChapterItem
	= | { type: "chapter", data: UIChapter }
		| { type: "missing", chapterNumber: number }

// Chapter page for viewer
export interface UIChapterPage {
	index: number
	type: string
	url: string | null
	content: string | null
	image_quality: string | null // 'healthy' | 'degraded' | 'corrupted'
	metadata_issues: {
		width: number
		height: number
		format: string | undefined
		channels: number | undefined
		issues: string[]
	} | null
	permanently_failed: boolean
}
