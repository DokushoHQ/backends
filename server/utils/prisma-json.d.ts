export type ImageQuality = "healthy" | "degraded" | "corrupted"

export type ImageMetadataIssues = {
	width: number
	height: number
	format: string | undefined
	channels: number | undefined
	issues: string[]
}

declare global {
	namespace PrismaJson {
		type ImageQualityType = ImageQuality
		type ImageMetadataIssuesType = ImageMetadataIssues
	}
}
