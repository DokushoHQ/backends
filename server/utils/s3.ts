import {
	DeleteObjectsCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3"
import pRetry from "p-retry"
import sharp from "sharp"

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

/**
 * Upload an image from a URL to S3, converting to WebP format
 */
export async function uploadImageFile(
	url: string | URL,
	filePath: string,
	contentType: "image/webp" = "image/webp",
): Promise<string> {
	return pRetry(
		async () => {
			const res = await fetch(url)
			if (!res.ok) {
				throw new Error(`Failed to fetch file from ${url}: ${res.status} ${res.statusText}`)
			}

			const buffer = await res.arrayBuffer()
			const image = await sharp(Buffer.from(buffer), { animated: true }).webp().toBuffer()

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

			return getPublicUrl(filePath)
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
