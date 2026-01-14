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
 * Skips supplementary chapters (.5).
 */
export const calculateMissingChapters = (chapters: number[]): number[] => {
	if (chapters.length === 0) return []

	// Round fractions to 1 decimal place to avoid floating point issues
	const roundFraction = (n: number) => Math.round((n - Math.floor(n)) * 10) / 10

	// Group chapters by their integer part, tracking which fractions exist
	const byWhole = new Map<number, Set<number>>()
	for (const chapter of chapters) {
		const whole = Math.floor(chapter)
		const fraction = roundFraction(chapter)

		// Skip supplementary chapters (.5)
		if (Math.abs(fraction - 0.5) < 1e-9) continue

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

	// 2. Detect missing sub-chapters based on common patterns
	// Count how often each fraction appears across all chapters
	const fractionCounts = new Map<number, number>()
	for (const fractions of byWhole.values()) {
		for (const f of fractions) {
			fractionCounts.set(f, (fractionCounts.get(f) || 0) + 1)
		}
	}

	// Find fractions that appear in at least 2 chapters or 30% of chapters
	// These are considered "expected" fractions for each chapter
	const threshold = Math.max(2, Math.floor(byWhole.size * 0.3))
	const expectedFractions = [...fractionCounts.entries()]
		.filter(([, count]) => count >= threshold)
		.map(([f]) => f)
		.filter(f => f !== 0) // Don't expect .0 if chapters use .1, .2
		.sort((a, b) => a - b)

	// If there's a pattern of sub-chapters, check for missing ones
	if (expectedFractions.length > 0) {
		for (const [whole, fractions] of byWhole) {
			// Skip if this chapter has a .0 (whole number) - it's complete
			if (fractions.has(0)) continue

			for (const expectedF of expectedFractions) {
				if (!fractions.has(expectedF)) {
					missing.push(whole + expectedF)
				}
			}
		}
	}

	return missing.sort((a, b) => a - b)
}
