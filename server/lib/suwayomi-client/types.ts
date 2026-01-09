// Suwayomi GraphQL API types

export type SuwayomiSourceInfo = {
	id: string
	name: string
	lang: string
	iconUrl: string
	supportsLatest: boolean
	isNsfw: boolean
	baseUrl?: string
}

export type SuwayomiManga = {
	id: number
	title: string
	url: string
	realUrl: string
	thumbnailUrl: string
	author: string | null
	artist: string | null
	description: string | null
	status: SuwayomiMangaStatus
	genre: string[]
}

export type SuwayomiMangaStatus
	= | "UNKNOWN"
		| "ONGOING"
		| "COMPLETED"
		| "LICENSED"
		| "PUBLISHING_FINISHED"
		| "CANCELLED"
		| "ON_HIATUS"

export type SuwayomiChapter = {
	id: number
	name: string
	chapterNumber: number
	scanlator: string | null
	uploadDate: string // timestamp as string
	url: string
	realUrl: string | null
}

export type SuwayomiMangaPage = {
	mangas: SuwayomiManga[]
	hasNextPage: boolean
}

export type FetchSourceMangaType = "SEARCH" | "POPULAR" | "LATEST"

// GraphQL response types
export type SourcesQueryResponse = {
	sources: {
		nodes: SuwayomiSourceInfo[]
	}
}

export type FetchSourceMangaResponse = {
	fetchSourceManga: SuwayomiMangaPage
}

export type FetchMangaResponse = {
	fetchManga: {
		manga: SuwayomiManga
	}
}

export type FetchChaptersResponse = {
	fetchChapters: {
		chapters: SuwayomiChapter[]
	}
}

export type FetchChapterPagesResponse = {
	fetchChapterPages: {
		pages: string[]
		chapter: {
			id: number
			name: string
		}
	}
}

export type MangaByUrlResponse = {
	mangas: {
		nodes: Array<{
			id: number
			title: string
			url: string
		}>
	}
}
