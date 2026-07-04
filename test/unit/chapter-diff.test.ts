import { describe, it, expect } from "vitest"
import type { ExistingChapterForDiff, IncomingChapter } from "../../server/utils/chapter-diff"
import { diffChapters } from "../../server/utils/chapter-diff"

const incoming = (overrides: Partial<IncomingChapter> = {}): IncomingChapter => ({
	external_id: "ext-1",
	title: "Chapter 1",
	chapter_number: 1,
	date_upload: new Date("2024-01-01T00:00:00Z"),
	language: "En",
	group_ids: [],
	...overrides,
})

const existing = (overrides: Partial<ExistingChapterForDiff> = {}): ExistingChapterForDiff => ({
	id: "db-1",
	external_id: "ext-1",
	title: "Chapter 1",
	chapter_number: 1,
	date_upload: new Date("2024-01-01T00:00:00Z"),
	external_url: null,
	volume_name: null,
	volume_number: null,
	source_removed_at: null,
	source_removal_acknowledged_at: null,
	group_ids: [],
	...overrides,
})

describe("diffChapters", () => {
	it("classifies unknown chapters as to_create", () => {
		const result = diffChapters([incoming({ external_id: "new-1" })], [existing()])
		expect(result.to_create).toHaveLength(1)
		expect(result.to_create[0]!.external_id).toBe("new-1")
		expect(result.to_update).toHaveLength(0)
	})

	it("skips identical chapters entirely", () => {
		const result = diffChapters([incoming()], [existing()])
		expect(result.to_create).toHaveLength(0)
		expect(result.to_update).toHaveLength(0)
	})

	it("detects a changed date_upload", () => {
		const result = diffChapters(
			[incoming({ date_upload: new Date("2024-06-01T00:00:00Z") })],
			[existing()],
		)
		expect(result.to_update).toHaveLength(1)
		expect(result.to_update[0]!.groups_changed).toBe(false)
	})

	it("detects a changed title", () => {
		const result = diffChapters([incoming({ title: "Renamed" })], [existing()])
		expect(result.to_update).toHaveLength(1)
	})

	it("detects a changed chapter_number", () => {
		const result = diffChapters([incoming({ chapter_number: 1.5 })], [existing()])
		expect(result.to_update).toHaveLength(1)
	})

	it("updates a chapter that reappeared on source (source_removed_at set)", () => {
		const result = diffChapters(
			[incoming()],
			[existing({ source_removed_at: new Date("2024-03-01T00:00:00Z") })],
		)
		expect(result.to_update).toHaveLength(1)
	})

	it("updates a chapter with a stale removal acknowledgment", () => {
		const result = diffChapters(
			[incoming()],
			[existing({ source_removal_acknowledged_at: new Date("2024-03-01T00:00:00Z") })],
		)
		expect(result.to_update).toHaveLength(1)
	})

	it("ignores undefined optional fields (source did not provide them)", () => {
		// volume_name/volume_number/external_url absents de la source :
		// on ne compare pas, même si la DB a une valeur
		const result = diffChapters(
			[incoming()],
			[existing({ volume_name: "Vol. 1", volume_number: 1, external_url: "https://x" })],
		)
		expect(result.to_update).toHaveLength(0)
	})

	it("detects changed optional fields when provided", () => {
		const result = diffChapters(
			[incoming({ volume_number: 2 })],
			[existing({ volume_number: 1 })],
		)
		expect(result.to_update).toHaveLength(1)
	})

	it("detects group membership changes", () => {
		const result = diffChapters(
			[incoming({ group_ids: ["g1", "g2"] })],
			[existing({ group_ids: ["g1"] })],
		)
		expect(result.to_update).toHaveLength(1)
		expect(result.to_update[0]!.groups_changed).toBe(true)
	})

	it("treats same groups in different order as unchanged", () => {
		const result = diffChapters(
			[incoming({ group_ids: ["g2", "g1"] })],
			[existing({ group_ids: ["g1", "g2"] })],
		)
		expect(result.to_update).toHaveLength(0)
	})

	it("treats duplicate incoming group ids as their unique set", () => {
		const result = diffChapters(
			[incoming({ group_ids: ["g1", "g1"] })],
			[existing({ group_ids: ["g1"] })],
		)
		expect(result.to_update).toHaveLength(0)
	})

	it("detects group changes hidden by duplicate ids", () => {
		const result = diffChapters(
			[incoming({ group_ids: ["g1", "g1"] })],
			[existing({ group_ids: ["g1", "g2"] })],
		)
		expect(result.to_update).toHaveLength(1)
		expect(result.to_update[0]!.groups_changed).toBe(true)
	})

	it("deduplicates incoming chapters sharing an external_id", () => {
		const result = diffChapters(
			[incoming({ external_id: "dup" }), incoming({ external_id: "dup", title: "Other" })],
			[],
		)
		expect(result.to_create).toHaveLength(1)
	})
})
