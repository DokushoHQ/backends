import { describe, expect, it } from "vitest"
import {
	calculateRecomputeDedupDelayMs,
	calculateRecomputeDedupEstimatedMs,
	calculateRecomputeIndexDelayMs,
	RECOMPUTE_DEDUP_BUFFER_MS,
	RECOMPUTE_DEDUP_SPREAD_MS,
	RECOMPUTE_INDEX_SPREAD_MS,
} from "../../../server/utils/workers/update-scheduler-recompute"

describe("update scheduler recompute timing", () => {
	it("keeps recompute delay constants unchanged", () => {
		expect(RECOMPUTE_DEDUP_SPREAD_MS).toBe(50)
		expect(RECOMPUTE_INDEX_SPREAD_MS).toBe(100)
		expect(RECOMPUTE_DEDUP_BUFFER_MS).toBe(5000)
	})

	it("calculates dedup delay from index", () => {
		expect(calculateRecomputeDedupDelayMs(0)).toBe(0)
		expect(calculateRecomputeDedupDelayMs(3)).toBe(150)
	})

	it("calculates dedup estimated time with buffer", () => {
		expect(calculateRecomputeDedupEstimatedMs(0)).toBe(5000)
		expect(calculateRecomputeDedupEstimatedMs(10)).toBe(5500)
	})

	it("calculates index delay after dedup estimate", () => {
		expect(calculateRecomputeIndexDelayMs(0, 5000)).toBe(5000)
		expect(calculateRecomputeIndexDelayMs(4, 5000)).toBe(5400)
	})
})
