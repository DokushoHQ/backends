import { describe, expect, it } from "vitest"
import {
	calculateStaggerIntervalMs,
	FAILURE_BACKOFF_DAYS,
	isEligibleForRefresh,
} from "../../../server/utils/workers/update-scheduler-policy"

describe("update scheduler policy", () => {
	it("keeps failure backoff mapping unchanged", () => {
		expect(FAILURE_BACKOFF_DAYS).toEqual({
			1: 0,
			2: 1,
			3: 3,
			4: 7,
			5: 14,
		})
	})

	it("always allows refresh when there are no consecutive failures", () => {
		expect(isEligibleForRefresh({
			lastCheckedAt: new Date("2026-01-01T00:00:00.000Z"),
			consecutiveFailures: 0,
			now: new Date("2026-01-01T12:00:00.000Z"),
		})).toBe(true)
	})

	it("respects day-based backoff when failures exist", () => {
		expect(isEligibleForRefresh({
			lastCheckedAt: new Date("2026-01-01T00:00:00.000Z"),
			consecutiveFailures: 2,
			now: new Date("2026-01-01T12:00:00.000Z"),
		})).toBe(false)

		expect(isEligibleForRefresh({
			lastCheckedAt: new Date("2026-01-01T00:00:00.000Z"),
			consecutiveFailures: 2,
			now: new Date("2026-01-02T12:00:00.000Z"),
		})).toBe(true)
	})

	it("caps failures above 5 to 14-day skip", () => {
		expect(isEligibleForRefresh({
			lastCheckedAt: new Date("2026-01-01T00:00:00.000Z"),
			consecutiveFailures: 9,
			now: new Date("2026-01-10T00:00:00.000Z"),
		})).toBe(false)

		expect(isEligibleForRefresh({
			lastCheckedAt: new Date("2026-01-01T00:00:00.000Z"),
			consecutiveFailures: 9,
			now: new Date("2026-01-15T00:00:00.000Z"),
		})).toBe(true)
	})

	it("calculates stagger interval with rate-limit floor", () => {
		expect(calculateStaggerIntervalMs({
			rateLimitDurationMs: 5000,
			rateLimitMax: 2,
			spreadMs: 1000,
			totalItems: 10,
		})).toBe(2500)

		expect(calculateStaggerIntervalMs({
			rateLimitDurationMs: 5000,
			rateLimitMax: 2,
			spreadMs: 60000,
			totalItems: 10,
		})).toBe(6000)
	})
})
