import unzipper from "unzipper"
import { DatabaseSync } from "node:sqlite"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { writeFileSync, mkdtempSync, rmSync } from "node:fs"

export interface TmbManga {
	id: number
	sourceId: string // Tachiyomi source ID (e.g., "2499283573021220255")
	url: string // Relative URL (e.g., "/manga/{uuid}")
	title: string
	thumbnailUrl: string | null
	inLibrary: boolean
}

export interface TmbCategory {
	id: number
	name: string
	order: number
}

export interface TmbSourceInfo {
	id: string
	name: string
	lang: string
}

export interface TmbParseResult {
	manga: TmbManga[]
	categories: TmbCategory[]
	mangaCategories: Map<number, number[]> // mangaId -> categoryIds
	sources: Map<string, TmbSourceInfo> // sourceId -> source info
}

/**
 * Extract a specific file from a ZIP buffer using Open.buffer()
 */
async function extractFileFromZip(zipBuffer: Buffer, fileName: string): Promise<Buffer | null> {
	const directory = await unzipper.Open.buffer(zipBuffer)
	const file = directory.files.find(f => f.path === fileName)

	if (!file) {
		return null
	}

	return file.buffer()
}

/**
 * Parse a Tachimanga backup (.tmb) file buffer
 * TMB format: ZIP containing meta.json and contents.zip
 * contents.zip contains tachimanga.db (SQLite) and other data
 */
export async function parseTmbBuffer(buffer: Buffer): Promise<TmbParseResult> {
	// Extract outer ZIP to get contents.zip
	const contentsBuffer = await extractFileFromZip(buffer, "contents.zip")

	if (!contentsBuffer) {
		throw new Error("Invalid TMB file: contents.zip not found")
	}

	// Extract contents.zip to get tachimanga.db
	const dbBuffer = await extractFileFromZip(contentsBuffer, "tachimanga.db")

	if (!dbBuffer) {
		throw new Error("Invalid TMB file: tachimanga.db not found in contents.zip")
	}

	// Write SQLite database to temp file (node:sqlite requires a file path)
	const tempDir = mkdtempSync(join(tmpdir(), "tmb-"))
	const tempDbPath = join(tempDir, "tachimanga.db")

	try {
		writeFileSync(tempDbPath, dbBuffer)

		// Open SQLite database
		const db = new DatabaseSync(tempDbPath, { open: true })

		try {
			// Parse manga - cast source to text to avoid JavaScript number overflow
			const mangaRows = db.prepare(`
				SELECT id, CAST(source AS TEXT) as source, url, title, thumbnail_url, in_library
				FROM Manga
				WHERE in_library = 1
			`).all() as Array<{
				id: number
				source: string
				url: string
				title: string
				thumbnail_url: string | null
				in_library: number
			}>

			const manga: TmbManga[] = mangaRows.map(row => ({
				id: row.id,
				sourceId: row.source,
				url: row.url,
				title: row.title,
				thumbnailUrl: row.thumbnail_url,
				inLibrary: row.in_library === 1,
			}))

			// Parse categories
			const categoryRows = db.prepare(`
				SELECT id, name, "order"
				FROM Category
				WHERE is_delete = 0
				ORDER BY "order" ASC
			`).all() as Array<{
				id: number
				name: string
				order: number
			}>

			const categories: TmbCategory[] = categoryRows.map(row => ({
				id: row.id,
				name: row.name,
				order: row.order,
			}))

			// Parse manga-category relationships
			const categoryMangaRows = db.prepare(`
				SELECT category, manga
				FROM CategoryManga
			`).all() as Array<{
				category: number
				manga: number
			}>

			const mangaCategories = new Map<number, number[]>()
			for (const row of categoryMangaRows) {
				const existing = mangaCategories.get(row.manga) || []
				existing.push(row.category)
				mangaCategories.set(row.manga, existing)
			}

			// Parse sources - cast id to text to avoid JavaScript number overflow
			const sourceRows = db.prepare(`
				SELECT CAST(id AS TEXT) as id, name, lang
				FROM Source
			`).all() as Array<{
				id: string
				name: string
				lang: string
			}>

			const sources = new Map<string, TmbSourceInfo>()
			for (const row of sourceRows) {
				sources.set(row.id, {
					id: row.id,
					name: row.name,
					lang: row.lang,
				})
			}

			return {
				manga,
				categories,
				mangaCategories,
				sources,
			}
		}
		finally {
			db.close()
		}
	}
	finally {
		// Cleanup temp files
		try {
			rmSync(tempDir, { recursive: true, force: true })
		}
		catch {
			// Ignore cleanup errors
		}
	}
}

/**
 * Get category names for a manga by its ID
 */
export function getCategoryNamesForManga(
	mangaId: number,
	mangaCategories: Map<number, number[]>,
	categories: TmbCategory[],
): string[] {
	const categoryIds = mangaCategories.get(mangaId) || []
	const categoryMap = new Map(categories.map(c => [c.id, c.name]))
	return categoryIds.map(id => categoryMap.get(id)).filter((name): name is string => !!name)
}
