/**
 * Result of chapter number assignment for a single chapter.
 */
export interface ChapterNumberResult {
	chapterNumber: number
	volumeNumber?: number
	volumeName?: string
}

/**
 * Extract season and episode from a chapter title.
 * Detects patterns like "S1 - Episode 96", "Season 2 Chapter 50", etc.
 *
 * @param title - The chapter title to parse
 * @returns Object with season and episode numbers, or null if no season pattern found
 */
export const extractSeasonAndEpisode = (title: string): { season: number, episode: number } | null => {
	// Pattern: S1, S2, etc. followed by episode/chapter number
	// Matches: "S1 - Episode 96", "S2 - Chapter 50", "S1 Episode 10.5"
	const shortSeasonMatch = title.match(/\bS(\d+)\s*[-–—]?\s*(?:Episode|Chapter|Ep\.?|Ch\.?)?\s*(\d+(?:\.\d+)?)/i)
	if (shortSeasonMatch?.[1] && shortSeasonMatch?.[2]) {
		return {
			season: parseInt(shortSeasonMatch[1], 10),
			episode: parseFloat(shortSeasonMatch[2]),
		}
	}

	// Pattern: Season 1, Season 2, etc. followed by episode/chapter number
	// Matches: "Season 1 Chapter 50", "Season 2 - Episode 10"
	const longSeasonMatch = title.match(/\bSeason\s*(\d+)\s*[-–—]?\s*(?:Episode|Chapter|Ep\.?|Ch\.?)?\s*(\d+(?:\.\d+)?)/i)
	if (longSeasonMatch?.[1] && longSeasonMatch?.[2]) {
		return {
			season: parseInt(longSeasonMatch[1], 10),
			episode: parseFloat(longSeasonMatch[2]),
		}
	}

	return null
}

/**
 * Assign chapter numbers for a batch of chapter titles, handling season patterns.
 * Uses cumulative numbering for seasons: S1 episodes get 1-N, S2 episodes get N+1 to M, etc.
 * Also extracts volume information from season data.
 *
 * @param titles - Array of chapter titles to process
 * @param fallbackCount - Total count for positional fallback (used when no number found)
 * @returns Array of ChapterNumberResult with chapterNumber and optional volume info
 */
export const assignSeasonedChapterNumbers = (titles: string[], fallbackCount?: number): ChapterNumberResult[] => {
	// First pass: extract season/episode info for all titles
	const parsed = titles.map((title, index) => ({
		index,
		title,
		seasonInfo: extractSeasonAndEpisode(title),
		simpleNumber: extractChapterNumber(title),
	}))

	// Find all seasons and their max episode numbers
	const seasonMaxEpisodes = new Map<number, number>()
	for (const p of parsed) {
		if (p.seasonInfo) {
			const current = seasonMaxEpisodes.get(p.seasonInfo.season) ?? 0
			seasonMaxEpisodes.set(p.seasonInfo.season, Math.max(current, Math.ceil(p.seasonInfo.episode)))
		}
	}

	// Calculate cumulative offsets for each season
	const seasonOffsets = new Map<number, number>()
	const sortedSeasons = [...seasonMaxEpisodes.keys()].sort((a, b) => a - b)
	let cumulativeOffset = 0
	for (const season of sortedSeasons) {
		seasonOffsets.set(season, cumulativeOffset)
		cumulativeOffset += seasonMaxEpisodes.get(season) ?? 0
	}

	// Second pass: assign chapter numbers
	const totalChapters = fallbackCount ?? titles.length
	return parsed.map((p, index) => {
		if (p.seasonInfo) {
			const offset = seasonOffsets.get(p.seasonInfo.season) ?? 0
			return {
				chapterNumber: offset + p.seasonInfo.episode,
				volumeNumber: p.seasonInfo.season,
				volumeName: `Season ${p.seasonInfo.season}`,
			}
		}

		// Fall back to simple extraction or positional numbering
		return {
			chapterNumber: p.simpleNumber ?? totalChapters - index,
		}
	})
}

/**
 * Extract chapter number from a chapter title using a hybrid approach.
 *
 * Rules based on number count in title:
 * - 3+ numbers: look for decimal pattern (X.Y) - e.g., "Vol. 2 Chapter 27.1" → 27.1
 * - 2 numbers: take the last one - e.g., "S2 - Episode 104" → 104
 * - 1 number: use that number directly - e.g., "Chapter 5" → 5
 * - 0 numbers: returns null (caller should use fallback like positional numbering)
 *
 * @param title - The chapter title to parse
 * @returns The extracted chapter number, or null if no number found
 */
export const extractChapterNumber = (title: string): number | null => {
	// Find all number sequences in the title (integers or decimals)
	const allNumbers = [...title.matchAll(/(\d+(?:\.\d+)?)/g)]
	const numberCount = allNumbers.length

	if (numberCount >= 3) {
		// Look for decimal pattern (X.Y)
		const decimalMatch = title.match(/(\d+\.\d+)/)
		if (decimalMatch?.[1]) {
			return parseFloat(decimalMatch[1])
		}
	}

	if (numberCount === 2) {
		// Take the last number (avoids "S2 - Episode 104" → 2 issue)
		const lastNumber = allNumbers[allNumbers.length - 1]
		if (lastNumber?.[1]) {
			return parseFloat(lastNumber[1])
		}
	}

	if (numberCount === 1) {
		// Use that single number directly
		const singleNumber = allNumbers[0]
		if (singleNumber?.[1]) {
			return parseFloat(singleNumber[1])
		}
	}

	// No numbers found
	return null
}

/**
 * Calculate missing chapter numbers in a series based on existing chapter numbers.
 * Handles both whole chapters and sub-chapters (e.g., 1.1, 1.2).
 * Skips supplementary chapters (.5) and ignores fractions above .5 (.6, .7, etc).
 *
 * @param chapters - Array of chapter numbers
 * @param subChapterThreshold - Threshold for trailing fraction detection (default 0.7 = 70%)
 *   Contiguous gaps within a chapter are always detected regardless of threshold.
 *   Trailing fractions (e.g., chapter ends at .2 when others have .3) use the threshold.
 */
export const calculateMissingChapters = (
	chapters: number[],
	subChapterThreshold = 0.7,
): number[] => {
	if (chapters.length === 0) return []

	// Round fractions to 1 decimal place to avoid floating point issues
	const roundFraction = (n: number) => Math.round((n - Math.floor(n)) * 10) / 10

	// Group chapters by their integer part, tracking which fractions exist
	const byWhole = new Map<number, Set<number>>()
	for (const chapter of chapters) {
		const whole = Math.floor(chapter)
		const fraction = roundFraction(chapter)

		// Skip supplementary chapters (.5) and fractions above .5 (.6, .7, .8, .9)
		// These are considered secondary/bonus content and not tracked for gap detection
		if (fraction >= 0.5 - 1e-9) continue

		if (!byWhole.has(whole)) byWhole.set(whole, new Set())
		byWhole.get(whole)?.add(fraction)
	}

	if (byWhole.size === 0) return []

	const wholes = [...byWhole.keys()].sort((a, b) => a - b)
	const max = wholes[wholes.length - 1] as number

	const missing: number[] = []

	// 1. Detect missing whole chapters from 1 to max
	for (let i = 1; i <= max; i++) {
		if (!byWhole.has(i)) {
			missing.push(i)
		}
	}

	// 2. Detect missing sub-chapters
	// Two types of gaps:
	// a) Contiguous gaps - ALWAYS detected (e.g., .1 and .3 present → .2 is missing)
	// b) Trailing fractions - threshold-based (e.g., 70%+ have .3 → expect .3 on all)

	// Count how often each fraction appears across all chapters
	const fractionCounts = new Map<number, number>()
	for (const fractions of byWhole.values()) {
		for (const f of fractions) {
			fractionCounts.set(f, (fractionCounts.get(f) || 0) + 1)
		}
	}

	// Find fractions that appear frequently enough to be "expected" (trailing fraction detection)
	const threshold = Math.max(2, Math.floor(byWhole.size * subChapterThreshold))
	const expectedFractions = [...fractionCounts.entries()]
		.filter(([, count]) => count >= threshold)
		.map(([f]) => f)
		.filter(f => f !== 0) // Don't expect .0 if chapters use .1, .2
		.sort((a, b) => a - b)

	// Check each chapter for missing sub-chapters
	for (const [whole, fractions] of byWhole) {
		// Skip if this chapter has a .0 (whole number) - it's complete
		if (fractions.has(0)) continue

		const fractionsArray = [...fractions].sort((a, b) => a - b)
		if (fractionsArray.length === 0) continue

		const minFraction = fractionsArray[0] as number
		const maxFraction = fractionsArray[fractionsArray.length - 1] as number

		// a) ALWAYS detect contiguous gaps within the chapter's range
		// E.g., if we have .1 and .3, flag .2 as missing
		for (let f = minFraction; f <= maxFraction; f = Math.round((f + 0.1) * 10) / 10) {
			if (!fractions.has(f)) {
				missing.push(whole + f)
			}
		}

		// b) Leading/trailing fractions - only if they meet the threshold
		// E.g., if 70%+ of chapters have .1 and .3, expect all split chapters to have them
		for (const expectedF of expectedFractions) {
			// Check fractions before the chapter's min (leading) or after max (trailing)
			if ((expectedF < minFraction || expectedF > maxFraction) && !fractions.has(expectedF)) {
				missing.push(whole + expectedF)
			}
		}
	}

	return missing.sort((a, b) => a - b)
}
