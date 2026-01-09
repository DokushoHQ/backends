import type { Prisma, Serie, SerieSource, SerieStatus, SerieType } from "./db"
import { db } from "./db"
import type { MultiLanguage } from "./sources/core"

// Field types matching the PrismaJson types
export type SerieField = "title" | "synopsis" | "cover" | "status" | "type"
export type ChapterField = "title" | "chapter_number" | "volume_number" | "volume_name"

/**
 * Resolve a MultiLanguage object to a single string using language priority:
 * 1. PRIMARY_LANGUAGE (from config)
 * 2. FALLBACK_PRIMARY_LANGUAGE (from config, defaults to En)
 * 3. First available value
 * 4. fallback parameter or "Untitled"
 */
export function resolveMultiLanguage(ml: MultiLanguage | null | undefined, fallback = "Untitled"): string {
	if (!ml || typeof ml !== "object") return fallback

	const config = useRuntimeConfig()
	const values = ml as Record<string, string[]>

	// Try PRIMARY_LANGUAGE first
	const primary = config.primaryLanguage
	if (primary && values[primary]?.[0]) {
		return values[primary][0]
	}

	// Try FALLBACK_PRIMARY_LANGUAGE
	const fallbackLang = config.fallbackPrimaryLanguage
	if (fallbackLang && values[fallbackLang]?.[0]) {
		return values[fallbackLang][0]
	}

	// Try first available value
	const firstValue = Object.values(values).find(arr => arr?.[0])?.[0]
	if (firstValue) return firstValue

	return fallback
}

/**
 * Resolve MultiLanguage to array of all values for alternates_titles
 */
export function resolveMultiLanguageArray(ml: MultiLanguage | null | undefined): string[] | null {
	if (!ml || typeof ml !== "object") return null

	const values = ml as Record<string, string[]>
	const allValues = Object.values(values).flat().filter(Boolean)
	return allValues.length > 0 ? allValues : null
}

// === API Types ===

/**
 * Serie as returned by the API - all fields are pre-calculated strings
 */
export type SerieResolved = Serie

/**
 * Lightweight type for series listings
 */
export type SerieForListing = {
	id: string
	title: string
	cover: string | null
	type: SerieType
	status: SerieStatus[]
	_count: { chapters: number }
}

// === Dashboard Types ===

/**
 * Serie with sources for dashboard editing
 */
export type SerieWithSources = Serie & {
	sources: (SerieSource & { source: { external_id: string, name: string } })[]
	lockedFields: SerieField[]
}

// === Query Functions ===

/**
 * Get a serie by ID - ready to use, no post-processing needed
 */
export async function getSerieResolved(
	id: string,
	include?: Omit<Prisma.SerieInclude, "sources">,
): Promise<Serie | null> {
	const serie = await db.serie.findUnique({
		where: { id },
		include,
	})

	return serie
}

/**
 * Get multiple series by IDs - maintains input order
 */
export async function getSeriesResolved(ids: string[], include?: Omit<Prisma.SerieInclude, "sources">): Promise<Serie[]> {
	if (ids.length === 0) return []

	const series = await db.serie.findMany({
		where: { id: { in: ids } },
		include,
	})

	// Maintain the order of input IDs
	const seriesMap = new Map(series.map(s => [s.id, s]))
	return ids.map(id => seriesMap.get(id)).filter((s): s is Serie => s !== undefined)
}

/**
 * Get paginated series
 */
export async function getSeriesResolvedPaginated(options: {
	page: number
	pageSize: number
	orderBy?: Prisma.SerieOrderByWithRelationInput
	include?: Omit<Prisma.SerieInclude, "sources">
}): Promise<{ series: Serie[], total: number }> {
	const { page, pageSize, orderBy = { updated_at: "desc" }, include } = options

	const [series, total] = await Promise.all([
		db.serie.findMany({
			skip: (page - 1) * pageSize,
			take: pageSize,
			orderBy,
			include,
		}),
		db.serie.count(),
	])

	return { series, total }
}

// === Listing Functions ===

/**
 * Get paginated series for listing
 */
export async function getSeriesForListing(options: {
	page: number
	pageSize: number
	orderBy?: Prisma.SerieOrderByWithRelationInput
}): Promise<{ series: SerieForListing[], total: number }> {
	const { page, pageSize, orderBy = { updated_at: "desc" } } = options

	const [series, total] = await Promise.all([
		db.serie.findMany({
			skip: (page - 1) * pageSize,
			take: pageSize,
			orderBy,
			select: {
				id: true,
				title: true,
				cover: true,
				type: true,
				status: true,
				_count: { select: { chapters: { where: { enabled: true } } } },
			},
		}),
		db.serie.count(),
	])

	return { series, total }
}

/**
 * Get series by IDs for listing (e.g., search results)
 */
export async function getSeriesByIdsForListing(ids: string[]): Promise<SerieForListing[]> {
	if (ids.length === 0) return []

	const series = await db.serie.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			title: true,
			cover: true,
			type: true,
			status: true,
			_count: { select: { chapters: { where: { enabled: true } } } },
		},
	})

	// Maintain the order of input IDs
	const seriesMap = new Map(series.map(s => [s.id, s]))
	return ids.map(id => seriesMap.get(id)).filter((s): s is SerieForListing => s !== undefined)
}

// === Dashboard Functions ===

/**
 * Get serie with sources for dashboard editing
 */
export async function getSerieWithSources(id: string): Promise<SerieWithSources | null> {
	const serie = await db.serie.findUnique({
		where: { id },
		include: {
			sources: {
				include: { source: { select: { external_id: true, name: true } } },
				orderBy: { is_primary: "desc" },
			},
		},
	})

	if (!serie) return null

	return {
		...serie,
		lockedFields: (serie.locked_fields as SerieField[]) ?? [],
	}
}
