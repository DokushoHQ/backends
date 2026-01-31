import type { Prisma, Serie, SerieSource, SerieStatus, SerieType } from "./db"
import { db } from "./db"
import type { MultiLanguage } from "./sources/core"
import { SourceLanguage } from "./sources/core"

// Field types matching the PrismaJson types
export type SerieField = "title" | "synopsis" | "cover" | "status" | "type"
export type ChapterField = "title" | "chapter_number" | "volume_number" | "volume_name"

// Romanized variants (readable for Western users) - checked before Asian script
const ROMANIZED_LANGUAGES: SourceLanguage[] = [
	SourceLanguage.JpRo,
	SourceLanguage.KoRo,
]

// Asian script variants - last resort before fallback string
const ASIAN_LANGUAGES: SourceLanguage[] = [
	SourceLanguage.Jp,
	SourceLanguage.Ko,
	SourceLanguage.Zh,
	SourceLanguage.ZhHk,
]

/**
 * Parse enabled languages from comma-separated config string
 */
export function parseEnabledLanguages(configString: string | null | undefined): string[] {
	if (!configString) return []
	return configString.split(",").map(l => l.trim()).filter(Boolean)
}

/** Language config for resolution functions */
export interface LanguageConfig {
	primaryLanguage: string
	fallbackPrimaryLanguage: string
	enabledLanguages: string
}

/** Get language config from runtime config or use provided config for testing */
function getLanguageConfig(testConfig?: LanguageConfig): LanguageConfig {
	if (testConfig) return testConfig
	const config = useRuntimeConfig()
	return {
		primaryLanguage: config.primaryLanguage as string,
		fallbackPrimaryLanguage: config.fallbackPrimaryLanguage as string,
		enabledLanguages: config.enabledLanguages as string,
	}
}

/**
 * Resolve a MultiLanguage object to a single string using language priority:
 * 1. PRIMARY_LANGUAGE (from config)
 * 2. FALLBACK_PRIMARY_LANGUAGE (from config)
 * 3. ENABLED_LANGUAGES in config order
 * 4. Romanized variants (JpRo, KoRo)
 * 5. Asian script variants (Jp, Ko, Zh, ZhHk)
 * 6. fallback parameter or "Untitled"
 *
 * @param ml - MultiLanguage object to resolve
 * @param fallback - Fallback value if no language found
 * @param testConfig - Optional config for testing (bypasses useRuntimeConfig)
 */
export function resolveMultiLanguage(
	ml: MultiLanguage | null | undefined,
	fallback = "Untitled",
	testConfig?: LanguageConfig,
): string {
	if (!ml || typeof ml !== "object") return fallback

	const config = getLanguageConfig(testConfig)
	const values = ml as Record<string, string[]>
	const primary = config.primaryLanguage
	const fallbackLang = config.fallbackPrimaryLanguage
	const enabledLanguages = parseEnabledLanguages(config.enabledLanguages)

	// 1. Primary language
	if (primary && values[primary]?.[0]) return values[primary][0]

	// 2. Fallback language
	if (fallbackLang && values[fallbackLang]?.[0]) return values[fallbackLang][0]

	// 3. Enabled languages in config order
	for (const lang of enabledLanguages) {
		if (values[lang]?.[0]) return values[lang][0]
	}

	// 4. Romanized variants (JpRo, KoRo)
	for (const lang of ROMANIZED_LANGUAGES) {
		if (values[lang]?.[0]) return values[lang][0]
	}

	// 5. Asian script variants (Jp, Ko, Zh, ZhHk)
	for (const lang of ASIAN_LANGUAGES) {
		if (values[lang]?.[0]) return values[lang][0]
	}

	return fallback
}

/**
 * Resolve serie title considering both title and alternatesTitles.
 * Priority order for each language: title first, then alternates.
 * Language priority:
 * 1. PRIMARY_LANGUAGE
 * 2. FALLBACK_PRIMARY_LANGUAGE
 * 3. ENABLED_LANGUAGES in config order
 * 4. Romanized variants (JpRo, KoRo)
 * 5. Asian script variants (Jp, Ko, Zh, ZhHk)
 * 6. fallback parameter or "Untitled"
 *
 * @param title - Main title MultiLanguage object
 * @param alternatesTitles - Alternate titles MultiLanguage object
 * @param fallback - Fallback value if no language found
 * @param testConfig - Optional config for testing (bypasses useRuntimeConfig)
 */
export function resolveSerieTitle(
	title: MultiLanguage | null | undefined,
	alternatesTitles: MultiLanguage | null | undefined,
	fallback = "Untitled",
	testConfig?: LanguageConfig,
): string {
	const config = getLanguageConfig(testConfig)
	const primary = config.primaryLanguage
	const fallbackLang = config.fallbackPrimaryLanguage
	const enabledLanguages = parseEnabledLanguages(config.enabledLanguages)

	const getValue = (ml: MultiLanguage | null | undefined, lang: string): string | undefined => {
		if (!ml || typeof ml !== "object") return undefined
		const v = (ml as Record<string, string[]>)[lang]?.[0]
		return v?.trim() ? v : undefined
	}

	// 1. Primary: title then alternates
	if (primary) {
		const v = getValue(title, primary) ?? getValue(alternatesTitles, primary)
		if (v) return v
	}

	// 2. Fallback: title then alternates
	if (fallbackLang) {
		const v = getValue(title, fallbackLang) ?? getValue(alternatesTitles, fallbackLang)
		if (v) return v
	}

	// 3. Enabled languages: title then alternates
	for (const lang of enabledLanguages) {
		const v = getValue(title, lang) ?? getValue(alternatesTitles, lang)
		if (v) return v
	}

	// 4. Romanized: title then alternates
	for (const lang of ROMANIZED_LANGUAGES) {
		const v = getValue(title, lang) ?? getValue(alternatesTitles, lang)
		if (v) return v
	}

	// 5. Asian script: title then alternates
	for (const lang of ASIAN_LANGUAGES) {
		const v = getValue(title, lang) ?? getValue(alternatesTitles, lang)
		if (v) return v
	}

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

/**
 * Get values for a specific language from a MultiLanguage object
 */
export function getMultiLanguageValues(ml: MultiLanguage | null | undefined, language: string): string[] {
	if (!ml || typeof ml !== "object") return []
	return (ml as Record<string, string[]>)[language] ?? []
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
