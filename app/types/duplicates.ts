export interface DuplicateSerieInfo {
	id: string
	title: string
	cover: string | null
	chapterCount: number
	isDeleted: boolean
	sources: Array<{ id: string, name: string }>
}

export interface DuplicateGroup {
	id: string
	confidence: number
	status: "Pending" | "Merged" | "Dismissed"
	suggestedPrimaryId: string | null
	series: DuplicateSerieInfo[]
}

export interface DuplicatePagination {
	page: number
	limit: number
	total: number
	totalPages: number
}
