import { describe, expect, it } from "vitest"
import {
	CACHE_RETRY_DELAYS_MS,
	getCacheRetryDelayLabel,
	getCacheRetryDelayMs,
	MAX_CACHE_RETRIES,
} from "../../../server/utils/workers/cache-retry"

describe("cache retry policy", () => {
	it("keeps retry limit at 4", () => {
		expect(MAX_CACHE_RETRIES).toBe(4)
	})

	it("keeps retry delays unchanged", () => {
		expect(CACHE_RETRY_DELAYS_MS).toEqual([
			10 * 60 * 1000,
			60 * 60 * 1000,
			2 * 60 * 60 * 1000,
			6 * 60 * 60 * 1000,
		])
	})

	it("returns expected delay labels", () => {
		expect(getCacheRetryDelayLabel(0)).toBe("10 min")
		expect(getCacheRetryDelayLabel(1)).toBe("1h")
		expect(getCacheRetryDelayLabel(2)).toBe("2h")
		expect(getCacheRetryDelayLabel(3)).toBe("6h")
		expect(getCacheRetryDelayLabel(99)).toBe("6h")
	})

	it("clamps out-of-range delay lookups to the last delay", () => {
		expect(getCacheRetryDelayMs(0)).toBe(10 * 60 * 1000)
		expect(getCacheRetryDelayMs(1)).toBe(60 * 60 * 1000)
		expect(getCacheRetryDelayMs(2)).toBe(2 * 60 * 60 * 1000)
		expect(getCacheRetryDelayMs(3)).toBe(6 * 60 * 60 * 1000)
		expect(getCacheRetryDelayMs(99)).toBe(6 * 60 * 60 * 1000)
	})
})
