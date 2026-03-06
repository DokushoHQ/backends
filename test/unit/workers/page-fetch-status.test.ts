import { describe, expect, it } from "vitest"
import { resolvePageFetchStatusFromCounts } from "../../../server/utils/workers/page-fetch-status"

describe("resolvePageFetchStatusFromCounts", () => {
	it("returns Success when all pages succeeded", () => {
		expect(resolvePageFetchStatusFromCounts({ successCount: 10, retryableFailedCount: 0, permanentlyFailedCount: 0 })).toBe("Success")
	})

	it("returns Failed when all pages failed retryably", () => {
		expect(resolvePageFetchStatusFromCounts({ successCount: 0, retryableFailedCount: 10, permanentlyFailedCount: 0 })).toBe("Failed")
	})

	it("returns PermanentlyFailed when all pages failed permanently", () => {
		expect(resolvePageFetchStatusFromCounts({ successCount: 0, retryableFailedCount: 0, permanentlyFailedCount: 10 })).toBe("PermanentlyFailed")
	})

	it("returns Incomplete when there is any permanent failure in mixed outcomes", () => {
		expect(resolvePageFetchStatusFromCounts({ successCount: 8, retryableFailedCount: 1, permanentlyFailedCount: 1 })).toBe("Incomplete")
	})

	it("returns Partial for mixed success and retryable failures only", () => {
		expect(resolvePageFetchStatusFromCounts({ successCount: 8, retryableFailedCount: 2, permanentlyFailedCount: 0 })).toBe("Partial")
	})
})
