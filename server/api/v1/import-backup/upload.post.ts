import { randomUUID } from "node:crypto"
import backupParserQueue from "../../../queues/backup-parser"
import { uploadRawFile } from "../../../utils/s3"
import { getParserByExtension, getSupportedExtensions } from "../../../utils/backup-parsers"

interface UploadBackupResponse {
	jobId: string
	backupType: string
}

export default defineEventHandler(async (event): Promise<UploadBackupResponse> => {
	const session = await requireAdmin(event)

	// Read multipart form data
	const formData = await readMultipartFormData(event)
	if (!formData) {
		throw createError({ statusCode: 400, message: "No file uploaded" })
	}

	const fileField = formData.find(f => f.name === "file")
	if (!fileField || !fileField.data) {
		throw createError({ statusCode: 400, message: "No file provided" })
	}

	const filename = fileField.filename || ""

	// Find parser by extension
	const parser = getParserByExtension(filename)
	if (!parser) {
		const supported = getSupportedExtensions().join(", ")
		throw createError({
			statusCode: 400,
			message: `Unsupported backup format. Supported formats: ${supported}`,
		})
	}

	// Validate file size (max 100MB)
	const maxSize = 100 * 1024 * 1024
	if (fileField.data.length > maxSize) {
		throw createError({ statusCode: 400, message: "File too large (max 100MB)" })
	}

	// Upload to S3 with a unique key
	const extension = parser.extensions[0] || ".backup"
	const s3Key = `tmp/backup-uploads/${randomUUID()}${extension}`
	await uploadRawFile(fileField.data, s3Key, "application/octet-stream")

	// Create parser job
	const job = await backupParserQueue.add("backup-parser", {
		s3Key,
		backupType: parser.type,
		userId: session.user.id,
	})

	if (!job.id) {
		throw createError({ statusCode: 500, message: "Failed to create parser job" })
	}

	return {
		jobId: job.id,
		backupType: parser.type,
	}
})
