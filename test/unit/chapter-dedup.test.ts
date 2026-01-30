import { describe, it, expect, vi, beforeEach } from "vitest"
import { deduplicateForLanguage, dedupSameSourceChapters } from "../../server/utils/chapter-dedup"
import { db } from "../../server/utils/db"

// Mock the db module - vi.mock is hoisted so this works with imports above
vi.mock("../../server/utils/db", () => ({
	db: {
		chapter: {
			findMany: vi.fn(),
		},
		serieChapterPreference: {
			findUnique: vi.fn(),
		},
		serieGroupPreference: {
			findMany: vi.fn(),
		},
	},
}))

// Test helpers
const createChapter = (overrides: Partial<{
	id: string
	chapter_number: number
	source_id: string
	enabled: boolean
	page_fetch_status: string
	date_upload: Date
	groups: { id: string, name: string }[]
	manual_override: boolean | null
}>) => ({
	id: overrides.id ?? crypto.randomUUID(),
	chapter_number: overrides.chapter_number ?? 1,
	source_id: overrides.source_id ?? "source-1",
	enabled: overrides.enabled ?? true,
	page_fetch_status: overrides.page_fetch_status ?? "Success",
	date_upload: overrides.date_upload ?? new Date("2024-01-01"),
	groups: overrides.groups ?? [],
	manual_override: overrides.manual_override ?? null,
})

const mockLog = vi.fn()

describe("dedupSameSourceChapters", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockLog.mockClear()
	})

	describe("group preference selection", () => {
		it("selects chapter from group with higher preference priority", async () => {
			const groupA = { id: "group-a", name: "Group A" }
			const groupB = { id: "group-b", name: "Group B" }

			// Two chapters with same number, different groups
			// Group B has priority 10, Group A has priority 5
			const chapters = [
				createChapter({ id: "ch-1", chapter_number: 1, enabled: true, groups: [groupA] }),
				createChapter({ id: "ch-2", chapter_number: 1, enabled: false, groups: [groupB] }),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([
				{ group_id: groupA.id, priority: 5 },
				{ group_id: groupB.id, priority: 10 },
			])

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			// Group B has higher priority (10 > 5), so ch-2 should be enabled, ch-1 disabled
			expect(result.changes.to_enable).toContain("ch-2")
			expect(result.changes.to_disable).toContain("ch-1")
		})

		it("respects existing enabled chapter when it has highest preference", async () => {
			const groupA = { id: "group-a", name: "Group A" }
			const groupB = { id: "group-b", name: "Group B" }

			// ch-1 has highest priority and is already enabled
			// ch-2 has lower priority and is also enabled (should be disabled)
			const chapters = [
				createChapter({ id: "ch-1", chapter_number: 1, enabled: true, groups: [groupA] }),
				createChapter({ id: "ch-2", chapter_number: 1, enabled: true, groups: [groupB] }),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([
				{ group_id: groupA.id, priority: 10 }, // Group A has highest priority
				{ group_id: groupB.id, priority: 5 },
			])

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			// ch-1 is already enabled and has highest priority - no changes needed
			expect(result.changes.to_enable).not.toContain("ch-1")
			// ch-2 is enabled but should be disabled (lower priority)
			expect(result.changes.to_disable).toContain("ch-2")
		})
	})

	describe("chapter count heuristic (no preferences)", () => {
		it("selects chapter from group with most chapters when no preferences set", async () => {
			const groupA = { id: "group-a", name: "Group A" }
			const groupB = { id: "group-b", name: "Group B" }

			// Chapter 1 duplicates - Group A vs Group B
			const chapter1A = createChapter({ id: "ch-1a", chapter_number: 1, enabled: true, groups: [groupA] })
			const chapter1B = createChapter({ id: "ch-1b", chapter_number: 1, enabled: false, groups: [groupB] })

			// Group B has more chapters in this serie (simulated by having more chapters)
			// We'll set up chapter counts via mock
			const allChapters = [
				chapter1A,
				chapter1B,
				// Extra chapters from Group B to increase its count
				createChapter({ id: "ch-2", chapter_number: 2, groups: [groupB] }),
				createChapter({ id: "ch-3", chapter_number: 3, groups: [groupB] }),
				createChapter({ id: "ch-4", chapter_number: 4, groups: [groupB] }),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(allChapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([]) // No preferences

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			// Group B has more chapters (4 vs 1), so ch-1b should be selected
			expect(result.changes.to_enable).toContain("ch-1b")
			expect(result.changes.to_disable).toContain("ch-1a")
		})
	})

	describe("upload date tie-breaker", () => {
		it("selects chapter with later upload date when all else is equal", async () => {
			const group = { id: "group-a", name: "Group A" }

			const chapters = [
				createChapter({
					id: "ch-old",
					chapter_number: 1,
					enabled: true,
					groups: [group],
					date_upload: new Date("2024-01-01"),
				}),
				createChapter({
					id: "ch-new",
					chapter_number: 1,
					enabled: false,
					groups: [group],
					date_upload: new Date("2024-06-15"),
				}),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			// Newer upload (ch-new) should win
			expect(result.changes.to_enable).toContain("ch-new")
			expect(result.changes.to_disable).toContain("ch-old")
		})
	})

	describe("prefer unsplit (whole over splits)", () => {
		it("disables split chapters when whole chapter exists from same source", async () => {
			const groupWhole = { id: "group-whole", name: "Whole Group" }
			const groupSplit = { id: "group-split", name: "Split Group" }

			const chapters = [
				// Whole chapter 5
				createChapter({ id: "ch-5", chapter_number: 5, enabled: true, groups: [groupWhole] }),
				// Split chapters 5.1, 5.2
				createChapter({ id: "ch-5.1", chapter_number: 5.1, enabled: true, groups: [groupSplit] }),
				createChapter({ id: "ch-5.2", chapter_number: 5.2, enabled: true, groups: [groupSplit] }),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			// prefer_unsplit = true (default)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue({
				prefer_unsplit: {},
				prefer_unsplit_default: true,
			})
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			// Split chapters should be disabled
			expect(result.changes.to_disable).toContain("ch-5.1")
			expect(result.changes.to_disable).toContain("ch-5.2")
			// Whole chapter should remain enabled
			expect(result.changes.to_disable).not.toContain("ch-5")
		})

		it("allows splits when prefer_unsplit is disabled for language", async () => {
			const groupWhole = { id: "group-whole", name: "Whole Group" }
			const groupSplit = { id: "group-split", name: "Split Group" }

			const chapters = [
				createChapter({ id: "ch-5", chapter_number: 5, enabled: false, groups: [groupWhole] }),
				createChapter({ id: "ch-5.1", chapter_number: 5.1, enabled: true, groups: [groupSplit] }),
				createChapter({ id: "ch-5.2", chapter_number: 5.2, enabled: true, groups: [groupSplit] }),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			// prefer_unsplit = false for English
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue({
				prefer_unsplit: { en: false },
				prefer_unsplit_default: true,
			})
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			// Splits should NOT be disabled when prefer_unsplit is false
			expect(result.changes.to_disable).not.toContain("ch-5.1")
			expect(result.changes.to_disable).not.toContain("ch-5.2")
		})

		it("disables splits when whole chapter exists from different source", async () => {
			const groupWhole = { id: "group-whole", name: "Whole Group" }
			const groupSplit = { id: "group-split", name: "Split Group" }

			// This source only has splits - whole chapter is from another source
			const thisSourceChapters = [
				createChapter({ id: "ch-5.1", chapter_number: 5.1, enabled: true, groups: [groupSplit] }),
				createChapter({ id: "ch-5.2", chapter_number: 5.2, enabled: true, groups: [groupSplit] }),
			]

			// All chapters in serie (includes whole from other source)
			const allSerieChapters = [
				...thisSourceChapters,
				createChapter({
					id: "ch-5-other",
					chapter_number: 5,
					source_id: "other-source",
					enabled: true,
					groups: [groupWhole],
				}),
			]

			// First call returns this source's chapters, second call returns all chapters
			vi.mocked(db.chapter.findMany)
				.mockResolvedValueOnce(thisSourceChapters) // First call in dedupSameSourceChapters
				.mockResolvedValueOnce(allSerieChapters) // Second call to get all chapters for serie

			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue({
				prefer_unsplit: {},
				prefer_unsplit_default: true,
			})
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			// Split chapters should be disabled because whole exists in another source
			expect(result.changes.to_disable).toContain("ch-5.1")
			expect(result.changes.to_disable).toContain("ch-5.2")
		})
	})

	describe("failed chapters handling", () => {
		it("skips failed chapters in selection - only success chapter wins", async () => {
			const groupA = { id: "group-a", name: "Group A" }
			const groupB = { id: "group-b", name: "Group B" }

			// Two chapters: one failed (enabled), one success (disabled)
			// The success one should be selected even if the failed one has higher chapter count
			const chapters = [
				createChapter({
					id: "ch-failed",
					chapter_number: 1,
					enabled: true,
					groups: [groupA],
					page_fetch_status: "Failed",
				}),
				createChapter({
					id: "ch-success",
					chapter_number: 1,
					enabled: false,
					groups: [groupB],
					page_fetch_status: "Success",
				}),
				// Give group A more chapters (so it would win by heuristic, except it's failed)
				createChapter({ id: "ch-2", chapter_number: 2, groups: [groupA] }),
				createChapter({ id: "ch-3", chapter_number: 3, groups: [groupA] }),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			// Only 1 usable duplicate (ch-success), so nothing to enable/disable
			// The failed chapter is excluded from selection
			expect(result.duplicates_processed).toBe(1)
		})

		it("excludes PermanentlyFailed chapters from selection", async () => {
			const groupA = { id: "group-a", name: "Group A" }
			const groupB = { id: "group-b", name: "Group B" }

			const chapters = [
				createChapter({
					id: "ch-perm-failed",
					chapter_number: 1,
					enabled: true,
					groups: [groupA],
					page_fetch_status: "PermanentlyFailed",
				}),
				createChapter({
					id: "ch-success",
					chapter_number: 1,
					enabled: false,
					groups: [groupB],
					page_fetch_status: "Success",
				}),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			// Only 1 usable duplicate (ch-success), PermanentlyFailed is excluded
			expect(result.duplicates_processed).toBe(1)
		})
	})

	describe("no duplicates", () => {
		it("returns empty changes when no duplicates exist", async () => {
			const chapters = [
				createChapter({ id: "ch-1", chapter_number: 1 }),
				createChapter({ id: "ch-2", chapter_number: 2 }),
				createChapter({ id: "ch-3", chapter_number: 3 }),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			expect(result.changes.to_enable).toEqual([])
			expect(result.changes.to_disable).toEqual([])
			expect(result.duplicates_processed).toBe(0)
		})

		it("returns empty changes for empty chapter list", async () => {
			vi.mocked(db.chapter.findMany).mockResolvedValue([])
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			expect(result.changes.to_enable).toEqual([])
			expect(result.changes.to_disable).toEqual([])
		})
	})

	describe("manual override handling", () => {
		it("skips chapters with manual_override = true from being disabled", async () => {
			const groupA = { id: "group-a", name: "Group A" }
			const groupB = { id: "group-b", name: "Group B" }

			// Two duplicate chapters, one has manual_override = true (user enabled)
			const chapters = [
				createChapter({
					id: "ch-1",
					chapter_number: 1,
					enabled: true,
					groups: [groupA],
					manual_override: true, // User manually enabled this
				}),
				createChapter({
					id: "ch-2",
					chapter_number: 1,
					enabled: false,
					groups: [groupB],
					manual_override: null,
				}),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			// Even though Group B has higher priority, ch-1 should NOT be disabled
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([
				{ group_id: groupA.id, priority: 5 },
				{ group_id: groupB.id, priority: 10 },
			])

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			// ch-1 has manual_override, so it should NOT be disabled even though ch-2 has higher group priority
			expect(result.changes.to_disable).not.toContain("ch-1")
			// ch-2 would normally be enabled but since ch-1 can't be disabled, behavior may vary
			// The important thing is ch-1 stays protected
		})

		it("skips chapters with manual_override = false from being enabled", async () => {
			const groupA = { id: "group-a", name: "Group A" }
			const groupB = { id: "group-b", name: "Group B" }

			// Two duplicate chapters, one has manual_override = false (user disabled)
			const chapters = [
				createChapter({
					id: "ch-1",
					chapter_number: 1,
					enabled: true,
					groups: [groupA],
					manual_override: null,
				}),
				createChapter({
					id: "ch-2",
					chapter_number: 1,
					enabled: false,
					groups: [groupB],
					manual_override: false, // User manually disabled this
				}),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			// Group B has higher priority, but ch-2 has manual_override = false
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([
				{ group_id: groupA.id, priority: 5 },
				{ group_id: groupB.id, priority: 10 },
			])

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			// ch-2 has manual_override = false, so it should NOT be enabled even though it has higher group priority
			expect(result.changes.to_enable).not.toContain("ch-2")
		})

		it("allows dedup changes for chapters with manual_override = null", async () => {
			const groupA = { id: "group-a", name: "Group A" }
			const groupB = { id: "group-b", name: "Group B" }

			// Two duplicate chapters, both auto-managed (manual_override = null)
			const chapters = [
				createChapter({
					id: "ch-1",
					chapter_number: 1,
					enabled: true,
					groups: [groupA],
					manual_override: null,
				}),
				createChapter({
					id: "ch-2",
					chapter_number: 1,
					enabled: false,
					groups: [groupB],
					manual_override: null,
				}),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			// Group B has higher priority
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([
				{ group_id: groupA.id, priority: 5 },
				{ group_id: groupB.id, priority: 10 },
			])

			const result = await dedupSameSourceChapters("serie-1", "source-1", "en", mockLog)

			// Both are auto-managed, so normal dedup applies
			expect(result.changes.to_enable).toContain("ch-2")
			expect(result.changes.to_disable).toContain("ch-1")
		})
	})
})

describe("deduplicateForLanguage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockLog.mockClear()
	})

	const createSource = (overrides: Partial<{
		source_id: string
		is_primary: boolean
		priority: number
		source_priority: number
	}>) => ({
		source_id: overrides.source_id ?? "source-1",
		is_primary: overrides.is_primary ?? false,
		priority: overrides.priority ?? 1,
		source_priority: overrides.source_priority ?? 1,
	})

	describe("cross-source group preference", () => {
		it("prefers secondary source when its group has higher preference than primary", async () => {
			const primarySource = createSource({ source_id: "primary", is_primary: true, priority: 1 })
			const secondarySource = createSource({ source_id: "secondary", is_primary: false, priority: 2 })

			const groupPrimary = { id: "group-primary", name: "Primary Group" }
			const groupSecondary = { id: "group-secondary", name: "Secondary Group" }

			const chapters = [
				// Primary source chapter
				createChapter({
					id: "ch-primary",
					chapter_number: 1,
					source_id: "primary",
					enabled: true,
					groups: [groupPrimary],
				}),
				// Secondary source chapter with preferred group
				createChapter({
					id: "ch-secondary",
					chapter_number: 1,
					source_id: "secondary",
					enabled: false,
					groups: [groupSecondary],
				}),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			// Secondary group has higher priority
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([
				{ group_id: groupPrimary.id, priority: 5 },
				{ group_id: groupSecondary.id, priority: 10 },
			])

			const result = await deduplicateForLanguage(
				"serie-1",
				"en",
				[primarySource, secondarySource],
				mockLog,
			)

			// Secondary chapter should be enabled (higher group priority)
			expect(result.changes.to_enable).toContain("ch-secondary")
			// Primary chapter should be disabled
			expect(result.changes.to_disable).toContain("ch-primary")
		})

		it("keeps primary when its group has higher or equal preference", async () => {
			const primarySource = createSource({ source_id: "primary", is_primary: true })
			const secondarySource = createSource({ source_id: "secondary", is_primary: false })

			const groupPrimary = { id: "group-primary", name: "Primary Group" }
			const groupSecondary = { id: "group-secondary", name: "Secondary Group" }

			const chapters = [
				createChapter({
					id: "ch-primary",
					chapter_number: 1,
					source_id: "primary",
					enabled: true,
					groups: [groupPrimary],
				}),
				createChapter({
					id: "ch-secondary",
					chapter_number: 1,
					source_id: "secondary",
					enabled: true,
					groups: [groupSecondary],
				}),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			// Primary group has higher priority
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([
				{ group_id: groupPrimary.id, priority: 10 },
				{ group_id: groupSecondary.id, priority: 5 },
			])

			const result = await deduplicateForLanguage(
				"serie-1",
				"en",
				[primarySource, secondarySource],
				mockLog,
			)

			// Secondary should be disabled (primary group has higher priority)
			expect(result.changes.to_disable).toContain("ch-secondary")
			// Primary should not be disabled
			expect(result.changes.to_disable).not.toContain("ch-primary")
		})
	})

	describe("fallback for missing chapters", () => {
		it("enables secondary chapter when primary is missing", async () => {
			const primarySource = createSource({ source_id: "primary", is_primary: true })
			const secondarySource = createSource({ source_id: "secondary", is_primary: false })

			const chapters = [
				// Primary has chapter 1 and 3, missing 2
				createChapter({ id: "ch-1", chapter_number: 1, source_id: "primary", enabled: true }),
				createChapter({ id: "ch-3", chapter_number: 3, source_id: "primary", enabled: true }),
				// Secondary has chapter 2
				createChapter({ id: "ch-2-sec", chapter_number: 2, source_id: "secondary", enabled: false }),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await deduplicateForLanguage(
				"serie-1",
				"en",
				[primarySource, secondarySource],
				mockLog,
			)

			// Chapter 2 should be in missing list
			expect(result.missing_chapters).toContain(2)
			// Secondary chapter 2 should be enabled
			expect(result.changes.to_enable).toContain("ch-2-sec")
		})

		it("respects secondary fallback preference when disabled", async () => {
			const primarySource = createSource({ source_id: "primary", is_primary: true })
			const secondarySource = createSource({ source_id: "secondary", is_primary: false })

			const chapters = [
				// Primary chapter failed
				createChapter({
					id: "ch-1-primary",
					chapter_number: 1,
					source_id: "primary",
					enabled: true,
					page_fetch_status: "Failed",
				}),
				// Secondary has the same chapter ready
				createChapter({
					id: "ch-1-secondary",
					chapter_number: 1,
					source_id: "secondary",
					enabled: false,
					page_fetch_status: "Success",
				}),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			// Disable secondary fallback for English (need all fields for both preferences)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue({
				use_secondary_fallback: { en: false },
				use_secondary_fallback_default: true,
				prefer_unsplit: {},
				prefer_unsplit_default: true,
			})
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await deduplicateForLanguage(
				"serie-1",
				"en",
				[primarySource, secondarySource],
				mockLog,
			)

			// Secondary should NOT be enabled when fallback is disabled
			expect(result.changes.to_enable).not.toContain("ch-1-secondary")
		})
	})

	describe("prefer unsplit (cross-source)", () => {
		it("disables secondary splits when primary has whole and secondary has no whole", async () => {
			const primarySource = createSource({ source_id: "primary", is_primary: true })
			const secondarySource = createSource({ source_id: "secondary", is_primary: false })

			const chapters = [
				// Chapter 7: both sources have whole - secondary correctly disabled
				createChapter({ id: "ch-7-pri", chapter_number: 7, source_id: "primary", enabled: true }),
				createChapter({ id: "ch-7-sec", chapter_number: 7, source_id: "secondary", enabled: false }),
				// Chapter 8: primary has whole, secondary has ONLY splits (no ch 8)
				// This is the bug case - secondary splits should be disabled
				createChapter({ id: "ch-8", chapter_number: 8, source_id: "primary", enabled: true }),
				createChapter({ id: "ch-8.1", chapter_number: 8.1, source_id: "secondary", enabled: true }),
				createChapter({ id: "ch-8.2", chapter_number: 8.2, source_id: "secondary", enabled: true }),
				// Chapter 9: same pattern as chapter 8
				createChapter({ id: "ch-9", chapter_number: 9, source_id: "primary", enabled: true }),
				createChapter({ id: "ch-9.1", chapter_number: 9.1, source_id: "secondary", enabled: true }),
				createChapter({ id: "ch-9.2", chapter_number: 9.2, source_id: "secondary", enabled: true }),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue({
				prefer_unsplit: {},
				prefer_unsplit_default: true,
				use_secondary_fallback: {},
				use_secondary_fallback_default: true,
			})
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await deduplicateForLanguage(
				"serie-1",
				"en",
				[primarySource, secondarySource],
				mockLog,
			)

			// Secondary splits should be disabled when primary has whole
			expect(result.changes.to_disable).toContain("ch-8.1")
			expect(result.changes.to_disable).toContain("ch-8.2")
			expect(result.changes.to_disable).toContain("ch-9.1")
			expect(result.changes.to_disable).toContain("ch-9.2")
			// Primary whole chapters should NOT be disabled
			expect(result.changes.to_disable).not.toContain("ch-8")
			expect(result.changes.to_disable).not.toContain("ch-9")
			expect(result.changes.primary_to_disable).not.toContain("ch-8")
			expect(result.changes.primary_to_disable).not.toContain("ch-9")
		})

		it("enables secondary whole chapter over primary splits", async () => {
			const primarySource = createSource({ source_id: "primary", is_primary: true })
			const secondarySource = createSource({ source_id: "secondary", is_primary: false })

			const chapters = [
				// Primary only has splits
				createChapter({ id: "ch-5.1", chapter_number: 5.1, source_id: "primary", enabled: true }),
				createChapter({ id: "ch-5.2", chapter_number: 5.2, source_id: "primary", enabled: true }),
				// Secondary has whole chapter
				createChapter({ id: "ch-5", chapter_number: 5, source_id: "secondary", enabled: false }),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue({
				prefer_unsplit: {},
				prefer_unsplit_default: true,
				use_secondary_fallback: {},
				use_secondary_fallback_default: true,
			})
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await deduplicateForLanguage(
				"serie-1",
				"en",
				[primarySource, secondarySource],
				mockLog,
			)

			// Secondary whole chapter should be enabled
			expect(result.changes.to_enable).toContain("ch-5")
			// Primary splits should be disabled
			expect(result.changes.primary_to_disable).toContain("ch-5.1")
			expect(result.changes.primary_to_disable).toContain("ch-5.2")
		})
	})

	describe("no primary source", () => {
		it("returns empty result when no primary source exists", async () => {
			const secondarySource = createSource({ source_id: "secondary", is_primary: false })

			const result = await deduplicateForLanguage(
				"serie-1",
				"en",
				[secondarySource],
				mockLog,
			)

			expect(result.missing_chapters).toEqual([])
			expect(result.changes.to_enable).toEqual([])
			expect(result.changes.to_disable).toEqual([])
		})
	})

	describe("fillable chapters", () => {
		it("tracks fillable chapters sorted by source priority", async () => {
			const primarySource = createSource({ source_id: "primary", is_primary: true, priority: 1 })
			const secondary1 = createSource({ source_id: "secondary-1", is_primary: false, priority: 2 })
			const secondary2 = createSource({ source_id: "secondary-2", is_primary: false, priority: 3 })

			const chapters = [
				// Primary missing chapter 2
				createChapter({ id: "ch-1", chapter_number: 1, source_id: "primary", enabled: true }),
				createChapter({ id: "ch-3", chapter_number: 3, source_id: "primary", enabled: true }),
				// Both secondaries have chapter 2
				createChapter({ id: "ch-2-s1", chapter_number: 2, source_id: "secondary-1" }),
				createChapter({ id: "ch-2-s2", chapter_number: 2, source_id: "secondary-2" }),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await deduplicateForLanguage(
				"serie-1",
				"en",
				[primarySource, secondary1, secondary2],
				mockLog,
			)

			// Fillable chapters should include both sources
			const fillableFor2 = result.fillable_chapters.filter(f => f.chapter_number === 2)
			expect(fillableFor2.length).toBe(2)
			// Should be sorted by priority (secondary-1 first)
			expect(fillableFor2[0]?.source_id).toBe("secondary-1")
		})
	})

	describe("stats tracking", () => {
		it("correctly tracks missing, available, and ready counts", async () => {
			const primarySource = createSource({ source_id: "primary", is_primary: true })
			const secondarySource = createSource({ source_id: "secondary", is_primary: false })

			const chapters = [
				// Primary has 1, 3 (missing 2)
				createChapter({ id: "ch-1", chapter_number: 1, source_id: "primary", enabled: true }),
				createChapter({ id: "ch-3", chapter_number: 3, source_id: "primary", enabled: true }),
				// Secondary has chapter 2 (Success = ready)
				createChapter({
					id: "ch-2-ready",
					chapter_number: 2,
					source_id: "secondary",
					page_fetch_status: "Success",
				}),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await deduplicateForLanguage(
				"serie-1",
				"en",
				[primarySource, secondarySource],
				mockLog,
			)

			expect(result.stats.missing_count).toBe(1) // Only chapter 2 missing
			expect(result.stats.available_count).toBe(1)
			expect(result.stats.ready_count).toBe(1)
		})
	})

	describe("manual override handling", () => {
		it("skips chapters with manual_override from enable/disable changes", async () => {
			const primarySource = createSource({ source_id: "primary", is_primary: true })
			const secondarySource = createSource({ source_id: "secondary", is_primary: false })

			const groupPrimary = { id: "group-primary", name: "Primary Group" }
			const groupSecondary = { id: "group-secondary", name: "Secondary Group" }

			const chapters = [
				// Primary chapter with manual_override = true (user enabled it)
				createChapter({
					id: "ch-primary",
					chapter_number: 1,
					source_id: "primary",
					enabled: true,
					groups: [groupPrimary],
					manual_override: true,
				}),
				// Secondary chapter with higher group priority
				createChapter({
					id: "ch-secondary",
					chapter_number: 1,
					source_id: "secondary",
					enabled: false,
					groups: [groupSecondary],
					manual_override: null,
				}),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			// Secondary group has higher priority, would normally disable primary
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([
				{ group_id: groupPrimary.id, priority: 5 },
				{ group_id: groupSecondary.id, priority: 10 },
			])

			const result = await deduplicateForLanguage(
				"serie-1",
				"en",
				[primarySource, secondarySource],
				mockLog,
			)

			// Primary chapter has manual_override, so it should NOT be disabled
			expect(result.changes.to_disable).not.toContain("ch-primary")
		})

		it("skips manually disabled chapters from being enabled", async () => {
			const primarySource = createSource({ source_id: "primary", is_primary: true })
			const secondarySource = createSource({ source_id: "secondary", is_primary: false })

			const chapters = [
				// Primary has chapter 1 and 3 (missing 2)
				createChapter({ id: "ch-1", chapter_number: 1, source_id: "primary", enabled: true }),
				createChapter({ id: "ch-3", chapter_number: 3, source_id: "primary", enabled: true }),
				// Secondary has chapter 2 but user manually disabled it
				createChapter({
					id: "ch-2-sec",
					chapter_number: 2,
					source_id: "secondary",
					enabled: false,
					manual_override: false, // User manually disabled
				}),
			]

			vi.mocked(db.chapter.findMany).mockResolvedValue(chapters)
			vi.mocked(db.serieChapterPreference.findUnique).mockResolvedValue(null)
			vi.mocked(db.serieGroupPreference.findMany).mockResolvedValue([])

			const result = await deduplicateForLanguage(
				"serie-1",
				"en",
				[primarySource, secondarySource],
				mockLog,
			)

			// Chapter 2 has manual_override = false, so it should NOT be enabled
			expect(result.changes.to_enable).not.toContain("ch-2-sec")
		})
	})
})
