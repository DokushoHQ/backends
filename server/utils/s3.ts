import {
	DeleteObjectsCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3"
import pRetry from "p-retry"
import sharp from "sharp"
import type { ImageQuality } from "./prisma-json"

let _s3: S3Client | null = null

function getS3Config() {
	const config = useRuntimeConfig()
	return {
		endpoint: config.s3Endpoint,
		accessKeyId: config.s3AccessKeyId,
		secretAccessKey: config.s3SecretAccessKey,
		bucketName: config.s3BucketName,
		publicBaseUrl: config.s3PublicBaseUrl,
	}
}

function getS3Client(): S3Client {
	if (!_s3) {
		const s3Config = getS3Config()
		_s3 = new S3Client({
			endpoint: s3Config.endpoint,
			region: "auto",
			credentials: {
				accessKeyId: s3Config.accessKeyId,
				secretAccessKey: s3Config.secretAccessKey,
			},
			forcePathStyle: true, // Required for MinIO/S3-compatible storage
		})
	}
	return _s3
}

function getBucketName(): string {
	return getS3Config().bucketName
}

function getPublicUrl(filePath: string): string {
	const s3Config = getS3Config()
	const baseUrl = s3Config.publicBaseUrl || s3Config.endpoint
	const normalizedBase = baseUrl.replace(/\/+$/, "")
	const normalizedPath = filePath.replace(/^\/+/, "")
	return `${normalizedBase}/${getBucketName()}/${normalizedPath}`
}

// WebP max dimension is 16383 pixels
const WEBP_MAX_DIMENSION = 16383

export type ImageFormat = "webp" | "jpeg"

export type ImageUploadResult = {
	url: string
	format: ImageFormat
	quality: ImageQuality
	metadata: {
		width: number
		height: number
		format: string | undefined
		channels: number | undefined
		issues: string[]
	}
}

/**
 * Assess image quality based on metadata
 */
function assessImageQuality(metadata: sharp.Metadata): { quality: ImageQuality, issues: string[] } {
	const issues: string[] = []

	// Check for corrupted header (no dimensions)
	if (!metadata.width || !metadata.height || metadata.width === 0 || metadata.height === 0) {
		issues.push("Missing or zero dimensions - corrupted header")
		return { quality: "corrupted", issues }
	}

	// Check for missing format
	if (!metadata.format) {
		issues.push("Unable to detect image format")
		return { quality: "corrupted", issues }
	}

	// Check for suspiciously small dimensions
	if (metadata.width < 10 || metadata.height < 10) {
		issues.push(`Suspiciously small dimensions: ${metadata.width}x${metadata.height}`)
	}

	return { quality: issues.length > 0 ? "degraded" : "healthy", issues }
}

/**
 * Upload an image from a URL to S3, converting to WebP (or JPEG for oversized images)
 * @param url - Source image URL
 * @param baseFilePath - File path without extension (extension will be added based on format used)
 */
export async function uploadImageFile(
	url: string | URL,
	baseFilePath: string,
): Promise<ImageUploadResult> {
	return pRetry(
		async () => {
			const res = await fetch(url)
			if (!res.ok) {
				throw new Error(`Failed to fetch file from ${url}: ${res.status} ${res.statusText}`)
			}

			const buffer = await res.arrayBuffer()

			const pipeline = sharp(Buffer.from(buffer), {
				animated: true,
				failOn: "none", // Try to process truncated/corrupted images
				limitInputPixels: false, // Disable limit for reading metadata
			})

			const metadata = await pipeline.metadata()

			// Assess image quality
			const { quality, issues } = assessImageQuality(metadata)

			// Determine format: WebP for normal images, JPEG for oversized (>16383px dimension)
			const needsJpegFallback = metadata.width && metadata.height
				&& (metadata.width > WEBP_MAX_DIMENSION || metadata.height > WEBP_MAX_DIMENSION)

			const outputFormat: ImageFormat = needsJpegFallback ? "jpeg" : "webp"
			const filePath = `${baseFilePath}.${outputFormat}`
			const contentType = outputFormat === "webp" ? "image/webp" : "image/jpeg"

			let image: Buffer
			if (outputFormat === "jpeg") {
				// JPEG for oversized images (supports up to 65535px)
				// High quality to avoid compounding compression artifacts on already-compressed sources
				image = await pipeline.jpeg({ quality: 95 }).toBuffer()
			}
			else {
				// WebP for normal images
				image = await pipeline.webp({ quality: 80 }).toBuffer()
			}

			const s3 = getS3Client()
			await s3.send(
				new PutObjectCommand({
					Bucket: getBucketName(),
					Key: filePath,
					Body: image,
					ContentType: contentType,
					ACL: "public-read",
				}),
			)

			return {
				url: getPublicUrl(filePath),
				format: outputFormat,
				quality,
				metadata: {
					width: metadata.width ?? 0,
					height: metadata.height ?? 0,
					format: metadata.format,
					channels: metadata.channels,
					issues,
				},
			}
		},
		{ retries: 5 },
	)
}

/**
 * Delete all S3 objects with a given prefix (e.g., all files for a serie)
 * Uses pagination to handle large numbers of objects
 */
export async function deleteByPrefix(prefix: string): Promise<number> {
	const s3 = getS3Client()
	const bucket = getBucketName()
	let deletedCount = 0
	let continuationToken: string | undefined

	do {
		// List objects with prefix
		const listResponse = await s3.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: prefix,
				ContinuationToken: continuationToken,
			}),
		)

		const objects = listResponse.Contents
		if (!objects || objects.length === 0) break

		// Delete objects in batches (S3 allows max 1000 per request)
		const keysToDelete = objects
			.map(obj => obj.Key)
			.filter((key): key is string => key !== undefined)

		if (keysToDelete.length > 0) {
			await s3.send(
				new DeleteObjectsCommand({
					Bucket: bucket,
					Delete: {
						Objects: keysToDelete.map(Key => ({ Key })),
					},
				}),
			)
			deletedCount += keysToDelete.length
		}

		continuationToken = listResponse.NextContinuationToken
	} while (continuationToken)

	return deletedCount
}
