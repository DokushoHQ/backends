import { describe, it, expect } from "vitest"
import { findFingerprintPosition } from "../../server/utils/fingerprint"

describe("findFingerprintPosition", () => {
	describe("returns -1 for invalid inputs", () => {
		it("returns -1 for empty fingerprint", () => {
			expect(findFingerprintPosition(["A", "B", "C"], [])).toBe(-1)
		})

		it("returns -1 for empty collectedIds", () => {
			expect(findFingerprintPosition([], ["A", "B"])).toBe(-1)
		})

		it("returns -1 when fingerprint longer than collectedIds", () => {
			expect(findFingerprintPosition(["A", "B"], ["A", "B", "C"])).toBe(-1)
		})
	})

	describe("finds fingerprint at various positions", () => {
		it("finds fingerprint at start (position 0)", () => {
			expect(findFingerprintPosition(["A", "B", "C", "D"], ["A", "B"])).toBe(0)
		})

		it("finds fingerprint in middle", () => {
			expect(findFingerprintPosition(["X", "Y", "A", "B", "C"], ["A", "B"])).toBe(2)
		})

		it("finds fingerprint at end", () => {
			expect(findFingerprintPosition(["X", "Y", "A", "B"], ["A", "B"])).toBe(2)
		})

		it("finds single-element fingerprint", () => {
			expect(findFingerprintPosition(["A", "B", "C"], ["B"])).toBe(1)
		})

		it("finds fingerprint that spans entire array", () => {
			expect(findFingerprintPosition(["A", "B", "C"], ["A", "B", "C"])).toBe(0)
		})
	})

	describe("returns -1 when fingerprint not found", () => {
		it("returns -1 when no match exists", () => {
			expect(findFingerprintPosition(["A", "B", "C"], ["X", "Y"])).toBe(-1)
		})

		it("returns -1 for partial match only", () => {
			// "A" matches but "X" doesn't follow
			expect(findFingerprintPosition(["A", "B", "C"], ["A", "X"])).toBe(-1)
		})

		it("returns -1 when sequence is reversed", () => {
			expect(findFingerprintPosition(["A", "B", "C"], ["B", "A"])).toBe(-1)
		})
	})

	describe("handles multiple possible matches", () => {
		it("returns first match position when multiple exist", () => {
			// "A", "B" appears at position 0 and position 3
			expect(findFingerprintPosition(["A", "B", "X", "A", "B"], ["A", "B"])).toBe(0)
		})
	})

	describe("real-world scenarios", () => {
		it("finds fingerprint in realistic series ID list", () => {
			const collected = ["new1", "new2", "old1", "old2", "old3", "old4", "old5"]
			const fingerprint = ["old1", "old2", "old3"]
			expect(findFingerprintPosition(collected, fingerprint)).toBe(2)
		})

		it("handles fingerprint not found due to updates", () => {
			// Fingerprint was from previous pages that no longer exist
			const collected = ["new1", "new2", "new3", "new4", "new5"]
			const fingerprint = ["old1", "old2", "old3"]
			expect(findFingerprintPosition(collected, fingerprint)).toBe(-1)
		})
	})
})
