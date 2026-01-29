import { Meilisearch, type Index } from "meilisearch"
import { z } from "zod"
import { Language, type SerieStatus, type SerieType } from "./db"

export type FlattenPrefix = "synopsis" | "title" | "alternates_titles"
export type FlattenRow = `${FlattenPrefix}_${Language}`
export type FlattenData = Partial<Record<FlattenRow, string[]>>

// Language-specific updated_at timestamps for sorting by language
export type LanguageUpdatedAtKey = `${Language}_updated_at`
export type LanguageUpdatedAtData = Partial<Record<LanguageUpdatedAtKey, number>>

export type SerieIndex = {
	id: string
	external_ids: string[] // All external IDs from all sources
	source_ids: string[] // All linked source IDs
	status: SerieStatus[]
	type: SerieType
	authors: string[]
	artists: string[]
	genres: string[]
	sources: string[] // All source names for the serie
	poster: string
	updated_at: number // Unix timestamp for sorting
	soft_deleted: boolean
	chapter_count: number // Number of enabled chapters
	languages_available: Language[] // Languages with available chapters
	// Resolved display values (includes custom locked values)
	title: string
	synopsis?: string
	// Chapter availability (cross-source deduplication)
	has_missing_chapters: boolean
	has_unfilled_gaps: boolean // Gaps exist that aren't filled by secondary
	gaps_all_filled: boolean // Has gaps but all are filled by secondary
	total_missing_chapters: number
	total_fillable_chapters: number
	languages_with_gaps: Language[]
} & FlattenData & LanguageUpdatedAtData

let _meilisearch: Meilisearch | null = null
let _serieIndex: Index<SerieIndex> | null = null

export function getMeilisearch() {
	if (!_meilisearch) {
		const config = useRuntimeConfig()
		_meilisearch = new Meilisearch({
			host: config.meiliHost,
			apiKey: config.meiliMasterKey,
		})
	}
	return _meilisearch
}

export function getSerieIndex() {
	if (!_serieIndex) {
		_serieIndex = getMeilisearch().index<SerieIndex>("series")
	}
	return _serieIndex
}

// Lazy proxy for backwards compatibility
export const serieIndex = new Proxy({} as Index<SerieIndex>, {
	get(_target, prop: string | symbol) {
		const index = getSerieIndex()
		const value = index[prop as keyof Index<SerieIndex>]
		if (typeof value === "function") {
			return value.bind(index)
		}
		return value
	},
})

const EMBEDDER_NAME = "openrouter"
// Liquid template for embedding - includes title and all language variants
// Uses conditionals to handle missing optional fields
const EMBEDDER_DOCUMENT_TEMPLATE = `{{ doc.title }}. {% if doc.title_En %}{% for t in doc.title_En %}{{ t }}. {% endfor %}{% endif %}{% if doc.title_Jp %}{% for t in doc.title_Jp %}{{ t }}. {% endfor %}{% endif %}{% if doc.title_JpRo %}{% for t in doc.title_JpRo %}{{ t }}. {% endfor %}{% endif %}{% if doc.title_Ko %}{% for t in doc.title_Ko %}{{ t }}. {% endfor %}{% endif %}{% if doc.title_KoRo %}{% for t in doc.title_KoRo %}{{ t }}. {% endfor %}{% endif %}{% if doc.alternates_titles_En %}{% for t in doc.alternates_titles_En %}{{ t }}. {% endfor %}{% endif %}{% if doc.alternates_titles_Jp %}{% for t in doc.alternates_titles_Jp %}{{ t }}. {% endfor %}{% endif %}{% if doc.authors %}{% for a in doc.authors %}{{ a }}. {% endfor %}{% endif %}`

/**
 * Configure the serie index with required settings for filtering and sorting.
 * Should be called once during application startup or when settings need to be updated.
 * If embedder settings changed, enqueues a RECOMPUTE_ALL job to regenerate embeddings.
 */
export async function configureSerieIndex() {
	const config = useRuntimeConfig()
	const index = getSerieIndex()

	// Get current settings to check if embedder needs to be updated
	let currentSettings: Awaited<ReturnType<typeof index.getSettings>> | null = null
	try {
		currentSettings = await index.getSettings()
	}
	catch {
		// Index might not exist yet
	}

	// Build language-specific sortable attributes (e.g., En_updated_at, Fr_updated_at)
	const languageTimestamps = Object.values(Language).map(lang => `${lang}_updated_at`)

	// Language-specific searchable fields
	const languageSearchableFields = Object.values(Language).flatMap(lang => [
		`title_${lang}`,
		`synopsis_${lang}`,
		`alternates_titles_${lang}`,
	])

	// ISO 639-3 locale codes for CJK languages (only non-romanized)
	// Romanized fields (JpRo, KoRo) use Latin characters and don't need special tokenization
	const cjkLocaleMap: Partial<Record<Language, string>> = {
		[Language.Jp]: "jpn",
		[Language.Ko]: "kor",
		[Language.Zh]: "cmn", // Mandarin Chinese
		[Language.ZhHk]: "cmn", // Traditional Chinese (Hong Kong)
	}

	// Parse and validate pagination/faceting config values with strict validation
	const nonNegativeIntSchema = z.coerce.number().int().nonnegative()

	const maxTotalHitsResult = nonNegativeIntSchema.safeParse(config.searchMaxTotalHits)
	const maxTotalHits = maxTotalHitsResult.success ? maxTotalHitsResult.data : 1000
	if (!maxTotalHitsResult.success) {
		console.warn(`Invalid searchMaxTotalHits config value "${config.searchMaxTotalHits}", using default: 1000`)
	}

	const maxValuesPerFacetResult = nonNegativeIntSchema.safeParse(config.searchMaxValuesPerFacet)
	const maxValuesPerFacet = maxValuesPerFacetResult.success ? maxValuesPerFacetResult.data : 100
	if (!maxValuesPerFacetResult.success) {
		console.warn(`Invalid searchMaxValuesPerFacet config value "${config.searchMaxValuesPerFacet}", using default: 100`)
	}

	const settings: Parameters<typeof index.updateSettings>[0] = {
		sortableAttributes: ["updated_at", ...languageTimestamps],
		filterableAttributes: ["soft_deleted", "source_ids", "genres", "status", "type", "authors", "artists", "chapter_count", "languages_available", "has_missing_chapters", "has_unfilled_gaps", "gaps_all_filled", "total_missing_chapters", "languages_with_gaps"],
		pagination: {
			maxTotalHits,
		},
		searchableAttributes: [
			"title",
			"synopsis",
			"authors",
			"artists",
			"external_ids",
			...languageSearchableFields,
		],
		faceting: {
			maxValuesPerFacet,
		},
	}

	// Experimental: Configure localized attributes for better CJK tokenization
	if (config.experimentalSearchLocalizedAttributes) {
		settings.localizedAttributes = Object.entries(cjkLocaleMap).map(([lang, locale]) => ({
			attributePatterns: [`*_${lang}`],
			locales: [locale],
		}))
		console.log("Meilisearch localized attributes enabled for CJK languages")
	}
	else {
		// Explicitly clear to reset Meilisearch defaults if previously enabled
		settings.localizedAttributes = null
	}

	let needsReindex = false

	// Configure OpenRouter embedder for hybrid search if API key is available
	// Uses REST source to allow custom model names (OpenRouter requires openai/ prefix)
	if (config.openrouterApiKey) {
		settings.embedders = {
			[EMBEDDER_NAME]: {
				source: "rest",
				url: "https://openrouter.ai/api/v1/embeddings",
				apiKey: config.openrouterApiKey,
				dimensions: 1536, // text-embedding-3-small dimensions
				documentTemplate: EMBEDDER_DOCUMENT_TEMPLATE,
				request: {
					model: "openai/text-embedding-3-small",
					input: ["{{text}}", "{{..}}"],
				},
				response: {
					data: [{ embedding: "{{embedding}}" }, "{{..}}"],
				},
			},
		}

		// Check if embedder was not configured before or template changed
		const currentEmbedder = currentSettings?.embedders?.[EMBEDDER_NAME] as { documentTemplate?: string } | undefined
		if (!currentEmbedder) {
			console.log("Meilisearch embedder newly configured - will trigger reindex")
			needsReindex = true
		}
		else if (currentEmbedder.documentTemplate !== EMBEDDER_DOCUMENT_TEMPLATE) {
			console.log("Meilisearch embedder template changed - will trigger reindex")
			needsReindex = true
		}
		else {
			console.log("Meilisearch embedder already configured")
		}
	}

	await index.updateSettings(settings)

	// Trigger reindex if embedder was newly added or changed
	if (needsReindex) {
		try {
			const { default: updateSchedulerQueue } = await import("../queues/update-scheduler")
			await updateSchedulerQueue.add("update-scheduler", { type: "RECOMPUTE_ALL" })
			console.log("RECOMPUTE_ALL job queued to generate embeddings")
		}
		catch (error) {
			console.error("Failed to queue RECOMPUTE_ALL job:", error)
		}
	}
}
