import { calculateMissingChapters } from "../../shared/utils/chapters"
import { db, type Language, type PageFetchStatus } from "./db"
import type { LanguageBooleanMap } from "./prisma-json.d"

/** Chapter info used internally during deduplication */
type ChapterInfo = {
	id: string
	chapter_number: number
	source_id: string
	enabled: boolean
	page_fetch_status: PageFetchStatus
}

/** Source info used internally during deduplication */
type SourceInfo = {
	source_id: string
	is_primary: boolean
	priority: number // SerieSource priority
	source_priority: number // Global Source priority
}

/** Fillable chapter record to be persisted */
type FillableChapterRecord = {
	chapter_number: number
	chapter_id: string
	source_id: string
}

/** Result of deduplication for a single language */
export type DedupLanguageResult = {
	missing_chapters: number[]
	fillable_chapters: FillableChapterRecord[]
	stats: {
		missing_count: number
		fillable_count: number
	}
	changes: {
		to_enable: string[] // Chapter IDs to enable
		to_disable: string[] // Chapter IDs to disable
	}
}

// Empty result constant to avoid duplication
const EMPTY_DEDUP_RESULT: DedupLanguageResult = {
	missing_chapters: [],
	fillable_chapters: [],
	stats: {
		missing_count: 0,
		fillable_count: 0,
	},
	changes: { to_enable: [], to_disable: [] },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user preference for using secondary source fallback for a specific language.
 */
async function getSecondaryFallbackPreference(
	serieId: string,
	language: Language,
): Promise<boolean> {
	const pref = await db.serieChapterPreference.findUnique({
		where: { serie_id: serieId },
		select: {
			use_secondary_fallback: true,
			use_secondary_fallback_default: true,
		},
	})

	if (!pref) {
		// No preferences set, use default (true = use secondary fallback)
		return true
	}

	const langMap = pref.use_secondary_fallback as LanguageBooleanMap
	return langMap[language] ?? pref.use_secondary_fallback_default
}

/**
 * Check if a chapter should be considered "available" from primary source.
 * Optimistic: treats existing enabled chapters as available regardless of fetch status.
 * If fetch fails, the next dedup run will re-enable secondary chapters.
 */
function isPrimaryChapterAvailable(chapter: ChapterInfo | undefined): boolean {
	if (!chapter) return false
	if (!chapter.enabled) return false

	// Optimistic: assume pending/in-progress chapters will succeed
	// Failed chapters are NOT available - fallback logic handles those
	return chapter.page_fetch_status !== "Failed"
		&& chapter.page_fetch_status !== "PermanentlyFailed"
}

// ============================================================================
// Core Deduplication Logic
// ============================================================================

/**
 * Process deduplication for a single language within a serie.
 */
export async function deduplicateForLanguage(
	serieId: string,
	language: Language,
	sources: SourceInfo[],
	log: (msg: string) => void,
): Promise<DedupLanguageResult> {
	const primarySource = sources.find(s => s.is_primary)

	if (!primarySource) {
		log(`No primary source found for serie ${serieId}`)
		return EMPTY_DEDUP_RESULT
	}

	// Build source priority map for quick lookup
	const sourcePriorityMap = new Map<string, { priority: number, source_priority: number }>()
	for (const s of sources) {
		sourcePriorityMap.set(s.source_id, { priority: s.priority, source_priority: s.source_priority })
	}

	// Load all chapters for this serie+language
	const chapters = await db.chapter.findMany({
		where: { serie_id: serieId, language },
		select: {
			id: true,
			chapter_number: true,
			source_id: true,
			enabled: true,
			page_fetch_status: true,
		},
	})

	if (chapters.length === 0) {
		log(`No chapters found for language ${language}`)
		return EMPTY_DEDUP_RESULT
	}

	// Split chapters by source
	const primaryChapters = chapters.filter(c => c.source_id === primarySource.source_id)
	const secondaryChapters = chapters.filter(c => c.source_id !== primarySource.source_id)

	log(`  ${language}: ${primaryChapters.length} primary, ${secondaryChapters.length} secondary chapters`)

	// Calculate missing chapters from primary source
	// Only count chapters that are "available" (enabled + not failed)
	const availablePrimaryNumbers = primaryChapters
		.filter(c => isPrimaryChapterAvailable(c))
		.map(c => c.chapter_number)

	const missingChapters = calculateMissingChapters(availablePrimaryNumbers)
	const missingSet = new Set(missingChapters)

	log(`  Missing from primary: ${missingChapters.length} chapters`)

	// Build fillable chapters list: secondary chapters that can fill gaps
	// Sort by priority so best source comes first
	const fillableChapters: FillableChapterRecord[] = []

	for (const missing of missingChapters) {
		const secondaryMatches = secondaryChapters
			.filter(c => c.chapter_number === missing && c.page_fetch_status === "Success")
			.sort((a, b) => {
				const aPriority = sourcePriorityMap.get(a.source_id)
				const bPriority = sourcePriorityMap.get(b.source_id)
				if (!aPriority || !bPriority) return 0
				if (aPriority.priority !== bPriority.priority) {
					return aPriority.priority - bPriority.priority
				}
				return aPriority.source_priority - bPriority.source_priority
			})

		for (const match of secondaryMatches) {
			fillableChapters.push({
				chapter_number: missing,
				chapter_id: match.id,
				source_id: match.source_id,
			})
		}
	}

	// Count unique chapter numbers that are fillable
	const fillableCount = new Set(fillableChapters.map(f => f.chapter_number)).size
	log(`  Fillable from secondary: ${fillableCount} chapters`)

	// Determine which chapters to enable/disable
	const toEnable: string[] = []
	const toDisable: string[] = []

	// Build map of primary chapter numbers for quick lookup
	const primaryChapterMap = new Map<number, ChapterInfo>()
	for (const c of primaryChapters) {
		primaryChapterMap.set(c.chapter_number, c)
	}

	// Get user preference for this language (whether to use secondary for failed primary)
	const useSecondaryOnFail = await getSecondaryFallbackPreference(serieId, language)

	// Track which chapter numbers we've already enabled a secondary for
	const enabledChapterNumbers = new Set<number>()

	// Process secondary chapters in priority order
	const sortedSecondaryChapters = [...secondaryChapters].sort((a, b) => {
		const aPriority = sourcePriorityMap.get(a.source_id)
		const bPriority = sourcePriorityMap.get(b.source_id)
		if (!aPriority || !bPriority) return 0
		if (aPriority.priority !== bPriority.priority) {
			return aPriority.priority - bPriority.priority
		}
		return aPriority.source_priority - bPriority.source_priority
	})

	for (const secondary of sortedSecondaryChapters) {
		const primaryChapter = primaryChapterMap.get(secondary.chapter_number)
		const primaryAvailable = isPrimaryChapterAvailable(primaryChapter)

		if (primaryAvailable) {
			// Primary source has this chapter with successful data
			// Disable secondary if it's currently enabled
			if (secondary.enabled) {
				toDisable.push(secondary.id)
				log(`  Disabling duplicate: Ch ${secondary.chapter_number}`)
			}
		}
		else if (missingSet.has(secondary.chapter_number)) {
			// Primary is missing this chapter (or failed) and it's in the calculated gaps
			// Check if user pref allows secondary fallback when primary exists but failed
			const primaryExists = primaryChapter !== undefined
			const primaryFailed = primaryChapter && ["Failed", "PermanentlyFailed"].includes(primaryChapter.page_fetch_status)

			// Enable secondary if:
			// 1. Primary doesn't exist at all, OR
			// 2. Primary exists but failed AND user enabled secondary fallback
			const shouldUseFallback = !primaryExists || (primaryFailed && useSecondaryOnFail)

			if (shouldUseFallback && secondary.page_fetch_status === "Success") {
				// Only enable ONE secondary per chapter number (highest priority)
				if (!enabledChapterNumbers.has(secondary.chapter_number)) {
					if (!secondary.enabled) {
						toEnable.push(secondary.id)
						log(`  Enabling fallback: Ch ${secondary.chapter_number}`)
					}
					enabledChapterNumbers.add(secondary.chapter_number)
				}
				else if (secondary.enabled) {
					// Lower priority secondary is enabled, disable it
					toDisable.push(secondary.id)
					log(`  Disabling lower priority: Ch ${secondary.chapter_number}`)
				}
			}
		}
	}

	return {
		missing_chapters: missingChapters,
		fillable_chapters: fillableChapters,
		stats: {
			missing_count: missingChapters.length,
			fillable_count: fillableCount,
		},
		changes: {
			to_enable: toEnable,
			to_disable: toDisable,
		},
	}
}

/**
 * Persist deduplication results to database.
 */
export async function persistDedupResults(
	serieId: string,
	language: Language,
	result: DedupLanguageResult,
): Promise<{ enabled: number, disabled: number }> {
	return db.$transaction(async (tx) => {
		// Apply enable/disable changes
		if (result.changes.to_enable.length > 0) {
			await tx.chapter.updateMany({
				where: { id: { in: result.changes.to_enable } },
				data: { enabled: true },
			})
		}

		if (result.changes.to_disable.length > 0) {
			await tx.chapter.updateMany({
				where: { id: { in: result.changes.to_disable } },
				data: { enabled: false },
			})
		}

		// Upsert ChapterAvailability record first to get the id
		const availabilityData = {
			missing_chapters: result.missing_chapters,
			missing_count: result.stats.missing_count,
			fillable_count: result.stats.fillable_count,
			auto_enabled_count: result.changes.to_enable.length,
		}

		const availability = await tx.chapterAvailability.upsert({
			where: {
				serie_id_language: { serie_id: serieId, language },
			},
			create: {
				serie_id: serieId,
				language,
				...availabilityData,
			},
			update: availabilityData,
			select: { id: true },
		})

		// Delete existing fillable chapters and recreate
		await tx.fillableChapter.deleteMany({
			where: { availability_id: availability.id },
		})

		if (result.fillable_chapters.length > 0) {
			await tx.fillableChapter.createMany({
				data: result.fillable_chapters.map(f => ({
					availability_id: availability.id,
					chapter_number: f.chapter_number,
					chapter_id: f.chapter_id,
					source_id: f.source_id,
				})),
			})
		}

		return {
			enabled: result.changes.to_enable.length,
			disabled: result.changes.to_disable.length,
		}
	})
}
