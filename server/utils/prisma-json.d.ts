import type { Language } from "./db"

export type ImageQuality = "healthy" | "degraded" | "corrupted"

export type ImageMetadataIssues = {
	width: number
	height: number
	format: string | undefined
	channels: number | undefined
	issues: string[]
}

export type DuplicateGroupMember = {
	serieId: string
	similarity: number
	titles: string[]
}

// Chapter availability types for cross-source deduplication
export type MissingChapter = number

export type LanguageBooleanMap = Partial<Record<Language, boolean>>

declare global {
	namespace PrismaJson {
		type ImageQualityType = ImageQuality
		type ImageMetadataIssuesType = ImageMetadataIssues
		type DuplicateGroupMembersType = DuplicateGroupMember[]
		// Chapter availability types
		type MissingChapterType = MissingChapter[]
		type LanguageBooleanMapType = LanguageBooleanMap
	}
}
