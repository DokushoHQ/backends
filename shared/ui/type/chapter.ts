// Page fetch status enum values
export type PageFetchStatus = "Pending" | "InProgress" | "Success" | "Partial" | "Failed"

// Chapter type for ChapterTable component
export interface UIChapter {
	id: string
	title: string | null
	chapter_number: number
	volume_number: number | null
	language: string
	date_upload: string
	enabled: boolean
	source_removed_at: string | null
	source_removal_acknowledged_at: string | null
	page_fetch_status: PageFetchStatus
	source: { external_id: string, name: string }
	groups: { id: string, name: string, url: string | null }[]
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
}
