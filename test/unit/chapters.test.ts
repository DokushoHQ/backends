import { describe, it, expect } from "vitest"
import {
	extractChapterNumber,
	calculateMissingChapters,
	extractSeasonAndEpisode,
	assignSeasonedChapterNumbers,
} from "../../shared/utils/chapters"

describe("extractChapterNumber", () => {
	describe("1 number in title - use directly", () => {
		it("parses 'Chapter 5' → 5", () => {
			expect(extractChapterNumber("Chapter 5")).toBe(5)
		})

		it("parses 'Chapter 101' → 101", () => {
			expect(extractChapterNumber("Chapter 101")).toBe(101)
		})

		it("parses 'Battle 583' → 583", () => {
			expect(extractChapterNumber("Battle 583")).toBe(583)
		})

		it("parses decimal 'Chapter 27.1' → 27.1", () => {
			expect(extractChapterNumber("Chapter 27.1")).toBe(27.1)
		})

		it("parses decimal 'Episode 10.5' → 10.5", () => {
			expect(extractChapterNumber("Episode 10.5")).toBe(10.5)
		})
	})

	describe("2 numbers in title - take the last one", () => {
		it("parses 'S2 - Episode 104' → 104 (not 2)", () => {
			expect(extractChapterNumber("S2 - Episode 104")).toBe(104)
		})

		it("parses 'S1 - Episode 5' → 5 (not 1)", () => {
			expect(extractChapterNumber("S1 - Episode 5")).toBe(5)
		})

		it("parses 'Season 3 Chapter 50' → 50", () => {
			expect(extractChapterNumber("Season 3 Chapter 50")).toBe(50)
		})

		it("parses 'Vol 2 Ch 15' → 15", () => {
			expect(extractChapterNumber("Vol 2 Ch 15")).toBe(15)
		})
	})

	describe("3+ numbers in title - look for decimal pattern", () => {
		it("parses 'Vol. 2 Chapter 27.1' → 27.1", () => {
			expect(extractChapterNumber("Vol. 2 Chapter 27.1")).toBe(27.1)
		})

		it("parses 'S2 - Episode 10.5 (Part 1)' → 10.5", () => {
			expect(extractChapterNumber("S2 - Episode 10.5 (Part 1)")).toBe(10.5)
		})

		it("parses 'Season 1 Volume 3 Chapter 25.5' → 25.5", () => {
			expect(extractChapterNumber("Season 1 Volume 3 Chapter 25.5")).toBe(25.5)
		})
	})

	describe("0 numbers in title - returns null", () => {
		it("returns null for 'Prologue'", () => {
			expect(extractChapterNumber("Prologue")).toBeNull()
		})

		it("returns null for 'Epilogue'", () => {
			expect(extractChapterNumber("Epilogue")).toBeNull()
		})

		it("returns null for 'Special Chapter'", () => {
			expect(extractChapterNumber("Special Chapter")).toBeNull()
		})

		it("returns null for empty string", () => {
			expect(extractChapterNumber("")).toBeNull()
		})
	})

	describe("edge cases", () => {
		it("handles leading zeros 'Chapter 007' → 7", () => {
			expect(extractChapterNumber("Chapter 007")).toBe(7)
		})

		it("handles large numbers 'Chapter 1234' → 1234", () => {
			expect(extractChapterNumber("Chapter 1234")).toBe(1234)
		})

		it("handles multiple decimals - takes first decimal match with 3+ numbers", () => {
			// "Vol 1.5 Chapter 2.5" has 4 numbers: 1.5, 2.5 (decimals count as 1 each)
			// Actually let's trace: matchAll(/(\d+(?:\.\d+)?)/g) on "Vol 1.5 Chapter 2.5"
			// Matches: ["1.5", "2.5"] - that's 2 numbers, so takes last = 2.5
			expect(extractChapterNumber("Vol 1.5 Chapter 2.5")).toBe(2.5)
		})
	})
})

describe("calculateMissingChapters", () => {
	it("returns empty array for empty input", () => {
		expect(calculateMissingChapters([])).toEqual([])
	})

	it("detects missing chapters at the start", () => {
		expect(calculateMissingChapters([3, 4, 5])).toEqual([1, 2])
	})

	it("detects missing chapters in the middle", () => {
		expect(calculateMissingChapters([1, 2, 5, 6])).toEqual([3, 4])
	})

	it("detects missing chapters at start and middle", () => {
		expect(calculateMissingChapters([3, 4, 7, 8])).toEqual([1, 2, 5, 6])
	})

	it("returns empty array when no chapters are missing", () => {
		expect(calculateMissingChapters([1, 2, 3, 4, 5])).toEqual([])
	})

	it("handles decimal chapters by using whole number", () => {
		expect(calculateMissingChapters([1, 2.1, 2.2, 4])).toEqual([3])
	})

	it("skips supplementary chapters (x.5)", () => {
		expect(calculateMissingChapters([1, 2, 2.5, 4])).toEqual([3])
	})

	it("handles real-world scenario with mixed decimals", () => {
		const chapters = [
			3, 4, 5, 6, 7, 7.5, 8.1, 8.2, 9.1, 9.2, 10.1, 10.2, 11.1, 11.2, 11.3, 12.1, 12.2, 13, 14, 15.1, 15.2, 16,
			17, 18, 19, 20, 21, 22, 23, 24,
		]
		expect(calculateMissingChapters(chapters)).toEqual([1, 2])
	})

	it("handles series starting at chapter 0", () => {
		expect(calculateMissingChapters([0, 2, 3])).toEqual([1])
	})

	it("handles single chapter", () => {
		expect(calculateMissingChapters([5])).toEqual([1, 2, 3, 4])
	})

	it("handles duplicate chapter numbers", () => {
		expect(calculateMissingChapters([1, 1, 2, 2, 4])).toEqual([3])
	})

	it("detects missing sub-chapters when pattern exists", () => {
		// If most chapters have .1 and .2, detect when one is missing
		const chapters = [3.1, 3.2, 4.1, 4.2, 5.2] // Missing 5.1
		expect(calculateMissingChapters(chapters)).toEqual([1, 2, 5.1])
	})

	it("detects missing sub-chapters in real scenario", () => {
		// User's reported scenario: 5.2, 5.1, 4.2, 4.1, 3.2 (missing 3.1)
		const chapters = [5.2, 5.1, 4.2, 4.1, 3.2]
		expect(calculateMissingChapters(chapters)).toEqual([1, 2, 3.1])
	})

	it("does not flag sub-chapters if whole number version exists", () => {
		// If a chapter has a whole number (e.g., 5), don't expect .1 or .2
		const chapters = [3.1, 3.2, 4.1, 4.2, 5]
		expect(calculateMissingChapters(chapters)).toEqual([1, 2])
	})

	it("handles mixed whole and decimal chapters", () => {
		// Mix of whole numbers and sub-chapters
		const chapters = [1, 2, 3.1, 3.2, 4, 6]
		expect(calculateMissingChapters(chapters)).toEqual([5])
	})
})

describe("extractSeasonAndEpisode", () => {
	describe("short season format (S1, S2)", () => {
		it("parses 'S1 - Episode 96' → season 1, episode 96", () => {
			expect(extractSeasonAndEpisode("S1 - Episode 96")).toEqual({ season: 1, episode: 96 })
		})

		it("parses 'S2 - Episode 104' → season 2, episode 104", () => {
			expect(extractSeasonAndEpisode("S2 - Episode 104")).toEqual({ season: 2, episode: 104 })
		})

		it("parses 'S1 - Chapter 50' → season 1, episode 50", () => {
			expect(extractSeasonAndEpisode("S1 - Chapter 50")).toEqual({ season: 1, episode: 50 })
		})

		it("parses 'S3 Episode 10.5' (no dash) → season 3, episode 10.5", () => {
			expect(extractSeasonAndEpisode("S3 Episode 10.5")).toEqual({ season: 3, episode: 10.5 })
		})

		it("parses 'S1 10' (no keyword) → season 1, episode 10", () => {
			expect(extractSeasonAndEpisode("S1 10")).toEqual({ season: 1, episode: 10 })
		})
	})

	describe("long season format (Season 1, Season 2)", () => {
		it("parses 'Season 2 Chapter 50' → season 2, episode 50", () => {
			expect(extractSeasonAndEpisode("Season 2 Chapter 50")).toEqual({ season: 2, episode: 50 })
		})

		it("parses 'Season 1 - Episode 10' → season 1, episode 10", () => {
			expect(extractSeasonAndEpisode("Season 1 - Episode 10")).toEqual({ season: 1, episode: 10 })
		})

		it("parses 'Season 3 25.5' (no keyword) → season 3, episode 25.5", () => {
			expect(extractSeasonAndEpisode("Season 3 25.5")).toEqual({ season: 3, episode: 25.5 })
		})
	})

	describe("non-season titles", () => {
		it("returns null for 'Chapter 5'", () => {
			expect(extractSeasonAndEpisode("Chapter 5")).toBeNull()
		})

		it("returns null for 'Vol 2 Ch 15'", () => {
			expect(extractSeasonAndEpisode("Vol 2 Ch 15")).toBeNull()
		})

		it("returns null for 'Prologue'", () => {
			expect(extractSeasonAndEpisode("Prologue")).toBeNull()
		})

		it("returns null for empty string", () => {
			expect(extractSeasonAndEpisode("")).toBeNull()
		})
	})
})

describe("assignSeasonedChapterNumbers", () => {
	describe("single season series", () => {
		it("assigns sequential numbers for S1 episodes", () => {
			const titles = ["S1 - Episode 1", "S1 - Episode 2", "S1 - Episode 3"]
			const results = assignSeasonedChapterNumbers(titles)

			expect(results).toEqual([
				{ chapterNumber: 1, volumeNumber: 1, volumeName: "Season 1" },
				{ chapterNumber: 2, volumeNumber: 1, volumeName: "Season 1" },
				{ chapterNumber: 3, volumeNumber: 1, volumeName: "Season 1" },
			])
		})
	})

	describe("multi-season series with cumulative numbering", () => {
		it("assigns cumulative numbers: S1 (1-100), S2 (101+)", () => {
			const titles = [
				"S1 - Episode 1",
				"S1 - Episode 100",
				"S2 - Episode 1",
				"S2 - Episode 50",
			]
			const results = assignSeasonedChapterNumbers(titles)

			expect(results).toEqual([
				{ chapterNumber: 1, volumeNumber: 1, volumeName: "Season 1" },
				{ chapterNumber: 100, volumeNumber: 1, volumeName: "Season 1" },
				{ chapterNumber: 101, volumeNumber: 2, volumeName: "Season 2" }, // 100 + 1
				{ chapterNumber: 150, volumeNumber: 2, volumeName: "Season 2" }, // 100 + 50
			])
		})

		it("handles the original bug case: S1E96 vs S2E96", () => {
			const titles = [
				"S1 - Episode 96",
				"S2 - Episode 96",
			]
			const results = assignSeasonedChapterNumbers(titles)

			// S1 max is 96, so S2 offset is 96
			expect(results[0]?.chapterNumber).toBe(96)
			expect(results[1]?.chapterNumber).toBe(192) // 96 + 96
			expect(results[0]?.chapterNumber).not.toBe(results[1]?.chapterNumber)
		})

		it("handles three seasons correctly", () => {
			const titles = [
				"S1 - Episode 50",
				"S2 - Episode 30",
				"S3 - Episode 20",
			]
			const results = assignSeasonedChapterNumbers(titles)

			// S1 max=50 (offset 0), S2 max=30 (offset 50), S3 max=20 (offset 80)
			expect(results).toEqual([
				{ chapterNumber: 50, volumeNumber: 1, volumeName: "Season 1" },
				{ chapterNumber: 80, volumeNumber: 2, volumeName: "Season 2" }, // 50 + 30
				{ chapterNumber: 100, volumeNumber: 3, volumeName: "Season 3" }, // 50 + 30 + 20
			])
		})
	})

	describe("mixed season and non-season titles", () => {
		it("uses extractChapterNumber for non-season titles", () => {
			const titles = [
				"Chapter 1",
				"Chapter 2",
				"S1 - Episode 5",
			]
			const results = assignSeasonedChapterNumbers(titles)

			expect(results[0]).toEqual({ chapterNumber: 1 })
			expect(results[1]).toEqual({ chapterNumber: 2 })
			expect(results[2]).toEqual({ chapterNumber: 5, volumeNumber: 1, volumeName: "Season 1" })
		})

		it("uses positional fallback for titles without numbers", () => {
			const titles = ["Prologue", "Chapter 1", "Chapter 2"]
			const results = assignSeasonedChapterNumbers(titles)

			// Prologue gets positional: totalChapters (3) - index (0) = 3
			expect(results[0]).toEqual({ chapterNumber: 3 })
			expect(results[1]).toEqual({ chapterNumber: 1 })
			expect(results[2]).toEqual({ chapterNumber: 2 })
		})
	})

	describe("decimal episodes", () => {
		it("handles decimal episode numbers", () => {
			const titles = [
				"S1 - Episode 10",
				"S1 - Episode 10.5",
				"S1 - Episode 11",
			]
			const results = assignSeasonedChapterNumbers(titles)

			expect(results).toEqual([
				{ chapterNumber: 10, volumeNumber: 1, volumeName: "Season 1" },
				{ chapterNumber: 10.5, volumeNumber: 1, volumeName: "Season 1" },
				{ chapterNumber: 11, volumeNumber: 1, volumeName: "Season 1" },
			])
		})
	})

	describe("edge cases", () => {
		it("handles empty array", () => {
			expect(assignSeasonedChapterNumbers([])).toEqual([])
		})

		it("handles season 0 (specials)", () => {
			const titles = ["S0 - Episode 1", "S1 - Episode 1"]
			const results = assignSeasonedChapterNumbers(titles)

			// S0 max=1 (offset 0), S1 max=1 (offset 1)
			expect(results).toEqual([
				{ chapterNumber: 1, volumeNumber: 0, volumeName: "Season 0" },
				{ chapterNumber: 2, volumeNumber: 1, volumeName: "Season 1" },
			])
		})
	})
})
