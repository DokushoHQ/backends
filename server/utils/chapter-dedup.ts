import { calculateMissingChapters, getBaseChapterNumber, isSplitChapter } from "../../shared/utils/chapters"
import { db, type Language, type PageFetchStatus } from "./db"
import type { LanguageBooleanMap } from "./prisma-json.d"

/** Coverage info for a base chapter number from a single source */
type ChapterCoverage = {
	hasWhole: boolean // Has chapter N exactly (no decimal)
	splits: number[] // Has N.1, N.2, etc.
	chapters: ChapterInfo[] // All chapters for this base number
}

/**
 * Check if a chapter number is a whole number (no decimal).
 */
function isWholeChapter(chapterNumber: number): boolean {
	return chapterNumber === Math.floor(chapterNumber)
}

/**
 * Group chapters by their base (floor) number.
 * Returns a map of baseNumber → coverage info.
 * Note: Supplementary chapters (.5+) are tracked in chapters[] but don't affect hasWhole/splits.
 */
function groupByBaseNumber(chapters: ChapterInfo[]): Map<number, ChapterCoverage> {
	const map = new Map<number, ChapterCoverage>()

	for (const c of chapters) {
		const base = getBaseChapterNumber(c.chapter_number)
		const existing = map.get(base) || { hasWhole: false, splits: [], chapters: [] }

		if (isWholeChapter(c.chapter_number)) {
			// Whole chapter (no decimal at all, e.g., 1, 2, 3)
			existing.hasWhole = true
		}
		else if (isSplitChapter(c.chapter_number)) {
			// Split chapter (.1-.4)
			existing.splits.push(c.chapter_number)
		}
		// Supplementary chapters (.5+) are tracked in chapters[] but don't affect coverage

		existing.chapters.push(c)
		map.set(base, existing)
	}

	return map
}

/**
 * Get user preference for preferring unsplit chapters for a specific language.
 */
async function getPreferUnsplitPreference(
	serieId: string,
	language: Language,
): Promise<boolean> {
	const pref = await db.serieChapterPreference.findUnique({
		where: { serie_id: serieId },
		select: {
			prefer_unsplit: true,
			prefer_unsplit_default: true,
		},
	})

	if (!pref) {
		// No preferences set, use default (true = prefer unsplit)
		return true
	}

	const langMap = pref.prefer_unsplit as LanguageBooleanMap
	return langMap[language] ?? pref.prefer_unsplit_default
}

/** Chapter info used internally during deduplication */
type ChapterInfo = {
	id: string
	chapter_number: number
	source_id: string
	enabled: boolean
	page_fetch_status: PageFetchStatus
	groups: { id: string, name: string }[]
}

/** Extended chapter info for same-source dedup (includes upload date) */
type ChapterWithGroups = ChapterInfo & {
	date_upload: Date
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
		available_count: number // Secondary chapters that exist for missing numbers
		ready_count: number // Secondary chapters that are fetched (Success status)
	}
	changes: {
		to_enable: string[] // Chapter IDs to enable
		to_disable: string[] // Chapter IDs to disable
		primary_to_disable: string[] // Primary chapter IDs to disable (for unsplit preference)
	}
}

// Empty result constant to avoid duplication
const EMPTY_DEDUP_RESULT: DedupLanguageResult = {
	missing_chapters: [],
	fillable_chapters: [],
	stats: {
		missing_count: 0,
		available_count: 0,
		ready_count: 0,
	},
	changes: { to_enable: [], to_disable: [], primary_to_disable: [] },
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

/**
 * Check if a chapter is usable (not failed).
 */
function isChapterUsable(chapter: ChapterInfo): boolean {
	return chapter.page_fetch_status !== "Failed"
		&& chapter.page_fetch_status !== "PermanentlyFailed"
}

/**
 * Get the maximum group preference priority for a chapter.
 * Returns 0 if no groups have preferences set.
 */
function getChapterGroupPriority(chapter: ChapterInfo, groupPrefs: Map<string, number>): number {
	if (chapter.groups.length === 0) return 0
	return Math.max(0, ...chapter.groups.map(g => groupPrefs.get(g.id) || 0))
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
	subChapterThreshold = 0.7,
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

	// Load all chapters for this serie+language (with groups for preference comparison)
	const chapters = await db.chapter.findMany({
		where: { serie_id: serieId, language },
		select: {
			id: true,
			chapter_number: true,
			source_id: true,
			enabled: true,
			page_fetch_status: true,
			groups: { select: { id: true, name: true } },
		},
	})

	// Get group preferences for cross-source comparison
	const groupPrefs = await getGroupPreferences(serieId, language)

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

	const missingChapters = calculateMissingChapters(availablePrimaryNumbers, subChapterThreshold)
	const missingSet = new Set(missingChapters)

	log(`  Missing from primary: ${missingChapters.length} chapters`)

	// Build fillable chapters list: secondary chapters that can fill gaps
	// Sort by priority so best source comes first
	const fillableChapters: FillableChapterRecord[] = []
	const availableChapterNumbers = new Set<number>() // Any secondary chapter that exists
	const readyChapterNumbers = new Set<number>() // Secondary chapters with Success status

	for (const missing of missingChapters) {
		// All secondary chapters for this missing number (regardless of status)
		const allSecondaryMatches = secondaryChapters.filter(c => c.chapter_number === missing)

		if (allSecondaryMatches.length > 0) {
			availableChapterNumbers.add(missing)
		}

		// Only chapters with Success status are "ready"
		const readyMatches = allSecondaryMatches
			.filter(c => c.page_fetch_status === "Success")
			.sort((a, b) => {
				const aPriority = sourcePriorityMap.get(a.source_id)
				const bPriority = sourcePriorityMap.get(b.source_id)
				if (!aPriority || !bPriority) return 0
				if (aPriority.priority !== bPriority.priority) {
					return aPriority.priority - bPriority.priority
				}
				return aPriority.source_priority - bPriority.source_priority
			})

		if (readyMatches.length > 0) {
			readyChapterNumbers.add(missing)
		}

		for (const match of readyMatches) {
			fillableChapters.push({
				chapter_number: missing,
				chapter_id: match.id,
				source_id: match.source_id,
			})
		}
	}

	log(`  Available from secondary: ${availableChapterNumbers.size}, Ready: ${readyChapterNumbers.size}`)

	// Determine which chapters to enable/disable
	const toEnable: string[] = []
	const toDisable: string[] = []

	// Build map of primary chapter numbers for quick lookup
	// Use array to handle same-source duplicates (multiple chapters with same number)
	const primaryChapterMap = new Map<number, ChapterInfo[]>()
	for (const c of primaryChapters) {
		const existing = primaryChapterMap.get(c.chapter_number) || []
		existing.push(c)
		primaryChapterMap.set(c.chapter_number, existing)
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

	// Track which primary chapters should be disabled due to group preference
	const primaryToDisableForGroupPref: string[] = []

	for (const secondary of sortedSecondaryChapters) {
		const primaryChaptersForNumber = primaryChapterMap.get(secondary.chapter_number) || []
		// Check if ANY primary chapter for this number is available
		const primaryAvailable = primaryChaptersForNumber.some(c => isPrimaryChapterAvailable(c))

		if (primaryAvailable) {
			// Primary source has this chapter - but check group preferences
			// If secondary has a higher-priority group, prefer it over primary
			const secondaryGroupPriority = getChapterGroupPriority(secondary, groupPrefs)
			const primaryGroupPriorities = primaryChaptersForNumber
				.filter(c => isChapterUsable(c))
				.map(c => getChapterGroupPriority(c, groupPrefs))
			const maxPrimaryGroupPriority = Math.max(0, ...primaryGroupPriorities)

			if (secondaryGroupPriority > maxPrimaryGroupPriority && secondaryGroupPriority > 0 && isChapterUsable(secondary)) {
				// Secondary has higher group priority - prefer it
				if (!enabledChapterNumbers.has(secondary.chapter_number)) {
					if (!secondary.enabled) {
						toEnable.push(secondary.id)
						log(`  Enabling preferred group: Ch ${secondary.chapter_number} (${secondary.groups.map(g => g.name).join(", ")})`)
					}
					enabledChapterNumbers.add(secondary.chapter_number)

					// Disable primary chapters for this number
					for (const primary of primaryChaptersForNumber) {
						if (primary.enabled && !primaryToDisableForGroupPref.includes(primary.id)) {
							primaryToDisableForGroupPref.push(primary.id)
							log(`  Disabling for group pref: Ch ${primary.chapter_number} (${primary.groups.map(g => g.name).join(", ")})`)
						}
					}
				}
				else if (secondary.enabled) {
					// Already have a better secondary enabled, disable this one
					toDisable.push(secondary.id)
				}
			}
			else {
				// Primary has equal or higher group priority - disable secondary
				if (secondary.enabled) {
					toDisable.push(secondary.id)
					log(`  Disabling duplicate: Ch ${secondary.chapter_number}`)
				}
			}
		}
		else if (missingSet.has(secondary.chapter_number)) {
			// Primary is missing this chapter (or failed) and it's in the calculated gaps
			// Check if user pref allows secondary fallback when primary exists but failed
			const primaryExists = primaryChaptersForNumber.length > 0
			const primaryFailed = primaryChaptersForNumber.length > 0
				&& primaryChaptersForNumber.every(c => ["Failed", "PermanentlyFailed"].includes(c.page_fetch_status))

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

	// Add primary chapters to disable for group preference to the main list
	toDisable.push(...primaryToDisableForGroupPref)

	// ============================================================================
	// Split/Unsplit Chapter Preference Logic
	// ============================================================================
	// After standard dedup, apply split/unsplit preference:
	// When preferUnsplit is true, whole chapters take priority over splits,
	// even if the whole chapter is from a secondary source.

	const primaryToDisable: string[] = []
	const preferUnsplit = await getPreferUnsplitPreference(serieId, language)

	if (preferUnsplit && secondaryChapters.length > 0) {
		log(`  Prefer unsplit: checking for split→whole replacements`)

		// Group chapters by base number for both primary and secondary
		const primaryByBase = groupByBaseNumber(primaryChapters)
		const secondaryByBase = groupByBaseNumber(secondaryChapters)

		// Get all unique base chapter numbers from both sources
		const allBaseNumbers = new Set([
			...primaryByBase.keys(),
			...secondaryByBase.keys(),
		])

		for (const baseNum of allBaseNumbers) {
			const primaryCoverage = primaryByBase.get(baseNum)
			const secondaryCoverage = secondaryByBase.get(baseNum)

			// Check if primary has a whole chapter (available)
			// A whole chapter is one where chapter_number === baseNum exactly (no decimal)
			const primaryHasWhole = primaryCoverage?.hasWhole
				&& primaryCoverage.chapters.some(c =>
					isWholeChapter(c.chapter_number) && isPrimaryChapterAvailable(c),
				)

			// Check if primary only has splits (no whole chapter available)
			const primaryHasSplitsOnly = !primaryHasWhole
				&& primaryCoverage
				&& primaryCoverage.splits.length > 0
				&& primaryCoverage.chapters.some(c =>
					isSplitChapter(c.chapter_number) && isPrimaryChapterAvailable(c),
				)

			// Check if secondary has a whole chapter (doesn't need to be "Success" - user prefers unsplit)
			// We accept any status except Failed/PermanentlyFailed since user explicitly wants whole chapters
			const secondaryWholeChapter = secondaryCoverage?.chapters.find(c =>
				isWholeChapter(c.chapter_number)
				&& c.chapter_number === baseNum
				&& c.page_fetch_status !== "Failed"
				&& c.page_fetch_status !== "PermanentlyFailed",
			)
			const secondaryHasWhole = !!secondaryWholeChapter

			// CASE: Primary has splits only, secondary has whole → prefer secondary whole
			if (primaryHasSplitsOnly && secondaryHasWhole) {
				// Enable the secondary whole chapter if not already enabled/marked
				if (!enabledChapterNumbers.has(baseNum)) {
					if (!secondaryWholeChapter!.enabled && !toEnable.includes(secondaryWholeChapter!.id)) {
						toEnable.push(secondaryWholeChapter!.id)
						log(`  Enabling unsplit: Ch ${baseNum} from secondary (overrides primary splits)`)
					}
					enabledChapterNumbers.add(baseNum)
				}

				// Disable primary splits
				for (const pri of primaryCoverage?.chapters || []) {
					if (isSplitChapter(pri.chapter_number) && pri.enabled && !primaryToDisable.includes(pri.id)) {
						primaryToDisable.push(pri.id)
						log(`  Disabling split: Ch ${pri.chapter_number} (whole exists in secondary)`)
					}
				}

				// Disable secondary splits too (if any)
				for (const sec of secondaryCoverage?.chapters || []) {
					if (isSplitChapter(sec.chapter_number) && sec.enabled && !toDisable.includes(sec.id)) {
						toDisable.push(sec.id)
					}
				}
			}
		}
	}

	return {
		missing_chapters: missingChapters,
		fillable_chapters: fillableChapters,
		stats: {
			missing_count: missingChapters.length,
			available_count: availableChapterNumbers.size,
			ready_count: readyChapterNumbers.size,
		},
		changes: {
			to_enable: toEnable,
			to_disable: toDisable,
			primary_to_disable: primaryToDisable,
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
): Promise<{ enabled: number, disabled: number, primary_disabled: number }> {
	return db.$transaction(async (tx) => {
		// Apply enable/disable changes
		if (result.changes.to_enable.length > 0) {
			await tx.chapter.updateMany({
				where: { id: { in: result.changes.to_enable } },
				data: { enabled: true },
			})
		}

		// Combine secondary and primary chapters to disable
		const allToDisable = [
			...result.changes.to_disable,
			...result.changes.primary_to_disable,
		]

		if (allToDisable.length > 0) {
			await tx.chapter.updateMany({
				where: { id: { in: allToDisable } },
				data: { enabled: false },
			})
		}

		// Upsert ChapterAvailability record first to get the id
		const availabilityData = {
			missing_chapters: result.missing_chapters,
			missing_count: result.stats.missing_count,
			available_count: result.stats.available_count,
			ready_count: result.stats.ready_count,
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
			primary_disabled: result.changes.primary_to_disable.length,
		}
	})
}

// ============================================================================
// Same-Source Deduplication (Multiple uploads from different scanlation groups)
// ============================================================================

/** Result of same-source deduplication for a single language */
export type SameSourceDedupResult = {
	changes: {
		to_enable: string[]
		to_disable: string[]
	}
	duplicates_processed: number
}

/**
 * Get scanlation group preferences for a serie + language.
 * Returns a map of group_id -> priority (higher = more preferred).
 */
async function getGroupPreferences(
	serieId: string,
	language: Language,
): Promise<Map<string, number>> {
	const prefs = await db.serieGroupPreference.findMany({
		where: { serie_id: serieId, language },
		select: { group_id: true, priority: true },
	})

	const map = new Map<string, number>()
	for (const pref of prefs) {
		map.set(pref.group_id, pref.priority)
	}
	return map
}

/**
 * Count chapters per scanlation group for a serie + source + language.
 * Used as a heuristic to prefer established groups.
 */
async function getGroupChapterCounts(
	serieId: string,
	sourceId: string,
	language: Language,
): Promise<Map<string, number>> {
	// Get all chapters for this serie/source/language with their groups
	const chapters = await db.chapter.findMany({
		where: { serie_id: serieId, source_id: sourceId, language },
		select: {
			groups: { select: { id: true } },
		},
	})

	const counts = new Map<string, number>()
	for (const chapter of chapters) {
		for (const group of chapter.groups) {
			counts.set(group.id, (counts.get(group.id) || 0) + 1)
		}
	}
	return counts
}

/**
 * Select the best chapter from a set of duplicates.
 *
 * Selection priority:
 * 1. Check group preferences - if any chapter's group has a stored preference, use highest priority
 * 2. Otherwise use heuristic: group with most chapters in this serie (established group)
 * 3. Tie-breaker: latest upload date (likely better quality/fixes)
 */
function selectBestChapter(
	duplicates: ChapterWithGroups[],
	groupPrefs: Map<string, number>,
	groupCounts: Map<string, number>,
): ChapterWithGroups {
	// Sort by: group preference (desc) -> group chapter count (desc) -> upload date (desc)
	const sorted = [...duplicates].sort((a, b) => {
		// Get max preference priority among chapter's groups
		const aPrefMax = Math.max(0, ...a.groups.map(g => groupPrefs.get(g.id) || 0))
		const bPrefMax = Math.max(0, ...b.groups.map(g => groupPrefs.get(g.id) || 0))

		// If either has a preference, compare by preference
		if (aPrefMax !== bPrefMax) {
			return bPrefMax - aPrefMax // Higher preference wins
		}

		// Get max chapter count among chapter's groups
		const aCountMax = Math.max(0, ...a.groups.map(g => groupCounts.get(g.id) || 0))
		const bCountMax = Math.max(0, ...b.groups.map(g => groupCounts.get(g.id) || 0))

		if (aCountMax !== bCountMax) {
			return bCountMax - aCountMax // Higher count wins
		}

		// Tie-breaker: later upload date wins
		return b.date_upload.getTime() - a.date_upload.getTime()
	})

	return sorted[0]!
}

/**
 * Process same-source deduplication for a single source + language within a serie.
 *
 * When multiple chapters have the same (source_id, chapter_number, language),
 * automatically enable the "best" one and disable others.
 *
 * Also handles unsplit preference: when both whole chapters and splits exist
 * from the same source (different scanlation groups), prefer whole chapters.
 */
export async function dedupSameSourceChapters(
	serieId: string,
	sourceId: string,
	language: Language,
	log: (msg: string) => void,
): Promise<SameSourceDedupResult> {
	// Load all chapters for this serie + source + language with groups
	const chapters = await db.chapter.findMany({
		where: { serie_id: serieId, source_id: sourceId, language },
		select: {
			id: true,
			chapter_number: true,
			source_id: true,
			enabled: true,
			page_fetch_status: true,
			date_upload: true,
			groups: { select: { id: true, name: true } },
		},
	})

	if (chapters.length === 0) {
		return { changes: { to_enable: [], to_disable: [] }, duplicates_processed: 0 }
	}

	const toEnable: string[] = []
	const toDisable: string[] = []

	// ============================================================================
	// Phase 1: Unsplit preference - prefer whole chapters over splits
	// ============================================================================
	// When a source has both Ch 19 (whole) and Ch 19.1, 19.2 (splits) from different groups,
	// the unsplit preference should disable the splits.
	// Also check for whole chapters from OTHER sources (enabled by cross-source dedup).

	const preferUnsplit = await getPreferUnsplitPreference(serieId, language)

	// Build a set of base chapter numbers that have an enabled whole chapter from ANY source
	// This prevents re-enabling splits when a whole exists elsewhere
	const baseNumbersWithEnabledWhole = new Set<number>()
	if (preferUnsplit) {
		const allChaptersForSerie = await db.chapter.findMany({
			where: { serie_id: serieId, language },
			select: {
				chapter_number: true,
				enabled: true,
				page_fetch_status: true,
			},
		})

		for (const c of allChaptersForSerie) {
			if (c.enabled
				&& isWholeChapter(c.chapter_number)
				&& c.page_fetch_status !== "Failed"
				&& c.page_fetch_status !== "PermanentlyFailed"
			) {
				baseNumbersWithEnabledWhole.add(getBaseChapterNumber(c.chapter_number))
			}
		}
	}

	if (preferUnsplit) {
		// Group chapters by base number to find whole+split conflicts within this source
		const chaptersByBase = new Map<number, ChapterWithGroups[]>()
		for (const c of chapters) {
			const base = getBaseChapterNumber(c.chapter_number)
			const list = chaptersByBase.get(base) || []
			list.push(c)
			chaptersByBase.set(base, list)
		}

		for (const [baseNum, chaptersForBase] of chaptersByBase) {
			// Check if ANY source has an enabled whole chapter for this base number
			const hasEnabledWhole = baseNumbersWithEnabledWhole.has(baseNum)

			// Find enabled splits for this base number in this source
			const enabledSplits = chaptersForBase.filter(c =>
				c.enabled && isSplitChapter(c.chapter_number),
			)

			// If a whole chapter exists (from any source) and this source has enabled splits, disable them
			if (hasEnabledWhole && enabledSplits.length > 0) {
				log(`  Same-source unsplit: Ch ${baseNum} has whole chapter, disabling splits`)
				for (const split of enabledSplits) {
					if (!toDisable.includes(split.id)) {
						toDisable.push(split.id)
						log(`    Disabling split ${split.chapter_number} (${split.groups.map(g => g.name).join(", ") || "no group"})`)
					}
				}
			}
		}
	}

	// ============================================================================
	// Phase 2: Standard same-source dedup - multiple uploads of same chapter number
	// ============================================================================

	// Group chapters by chapter_number
	const chaptersByNumber = new Map<number, ChapterWithGroups[]>()
	for (const c of chapters) {
		const list = chaptersByNumber.get(c.chapter_number) || []
		list.push(c)
		chaptersByNumber.set(c.chapter_number, list)
	}

	// Find chapter numbers with duplicates (> 1 chapter)
	const duplicateNumbers: number[] = []
	for (const [num, list] of chaptersByNumber) {
		if (list.length > 1) {
			duplicateNumbers.push(num)
		}
	}

	if (duplicateNumbers.length === 0 && toDisable.length === 0) {
		return { changes: { to_enable: [], to_disable: [] }, duplicates_processed: 0 }
	}

	if (duplicateNumbers.length > 0) {
		log(`  Same-source: found ${duplicateNumbers.length} chapter numbers with duplicates`)
	}

	// Get group preferences and chapter counts for selection
	const groupPrefs = await getGroupPreferences(serieId, language)
	const groupCounts = await getGroupChapterCounts(serieId, sourceId, language)

	for (const num of duplicateNumbers) {
		const duplicates = chaptersByNumber.get(num)!

		// Exclude chapters already marked for disable in phase 1 (unsplit preference)
		const availableDuplicates = duplicates.filter(c => !toDisable.includes(c.id))
		if (availableDuplicates.length === 0) {
			// All duplicates disabled by phase 1 (unsplit preference), skip
			continue
		}

		// Filter to chapters that are "usable" (not failed)
		const usableDuplicates = availableDuplicates.filter(c =>
			c.page_fetch_status !== "Failed"
			&& c.page_fetch_status !== "PermanentlyFailed",
		)

		if (usableDuplicates.length <= 1) {
			// 0 or 1 usable chapter, nothing to deduplicate
			continue
		}

		// Check if this is a split chapter and a whole chapter exists
		// If preferUnsplit is enabled and whole exists, don't enable any splits
		const baseNum = getBaseChapterNumber(num)
		const isSplit = isSplitChapter(num)
		const wholeExistsAndEnabled = preferUnsplit && baseNumbersWithEnabledWhole.has(baseNum)

		if (isSplit && wholeExistsAndEnabled) {
			// Don't enable any split chapters - just disable any that are enabled
			for (const chapter of usableDuplicates) {
				if (chapter.enabled && !toDisable.includes(chapter.id)) {
					toDisable.push(chapter.id)
					log(`    Ch ${num}: disabling split (whole exists) ${chapter.groups.map(g => g.name).join(", ") || "no group"}`)
				}
			}
			continue
		}

		// Select best among ALL usable duplicates (including disabled ones)
		// This ensures group preferences are respected even if wrong chapter was initially enabled
		const best = selectBestChapter(usableDuplicates, groupPrefs, groupCounts)

		for (const chapter of usableDuplicates) {
			if (chapter.id === best.id) {
				// This is the best - enable it if not already
				if (!chapter.enabled) {
					toEnable.push(chapter.id)
					log(`    Ch ${num}: enabling ${chapter.groups.map(g => g.name).join(", ") || "no group"} (preferred)`)
				}
			}
			else {
				// Not the best - disable it if enabled
				if (chapter.enabled) {
					toDisable.push(chapter.id)
					log(`    Ch ${num}: disabling ${chapter.groups.map(g => g.name).join(", ") || "no group"}`)
				}
			}
		}
	}

	return {
		changes: { to_enable: toEnable, to_disable: toDisable },
		duplicates_processed: duplicateNumbers.length,
	}
}

/**
 * Persist same-source deduplication results to database.
 */
export async function persistSameSourceDedupResults(
	result: SameSourceDedupResult,
): Promise<{ enabled: number, disabled: number }> {
	if (result.changes.to_enable.length === 0 && result.changes.to_disable.length === 0) {
		return { enabled: 0, disabled: 0 }
	}

	return db.$transaction(async (tx) => {
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

		return {
			enabled: result.changes.to_enable.length,
			disabled: result.changes.to_disable.length,
		}
	})
}
