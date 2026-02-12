import { DelayedError } from "bullmq"
import { describe, expect, it, vi } from "vitest"
import { maybeDelayForCacheRetry } from "../../../server/utils/workers/serie-inserter-retry"
import { createMockJob } from "./helpers"

describe("maybeDelayForCacheRetry", () => {
	it("does nothing when chapters were found", async () => {
		const job = createMockJob({ data: { expect_new_chapters: true } })
		const log = vi.fn()

		await maybeDelayForCacheRetry({
			job: job as never,
			token: "token",
			hasNewChapters: true,
			hasExistingSerieSource: true,
			log,
		})

		expect(job.updateData).not.toHaveBeenCalled()
		expect(job.moveToDelayed).not.toHaveBeenCalled()
		expect(log).not.toHaveBeenCalled()
	})

	it("delays and throws DelayedError before max retries", async () => {
		const job = createMockJob({
			data: { expect_new_chapters: true, cache_retry_attempt: 0 },
		})
		const log = vi.fn()

		const now = Date.now()
		await expect(maybeDelayForCacheRetry({
			job: job as never,
			token: "token",
			hasNewChapters: false,
			hasExistingSerieSource: true,
			log,
		})).rejects.toBeInstanceOf(DelayedError)

		expect(job.updateData).toHaveBeenCalledWith(
			expect.objectContaining({ cache_retry_attempt: 1 }),
		)
		expect(job.moveToDelayed).toHaveBeenCalledWith(expect.any(Number), "token")
		const delayedUntil = vi.mocked(job.moveToDelayed).mock.calls[0]?.[0] as number
		expect(delayedUntil - now).toBeGreaterThanOrEqual(10 * 60 * 1000 - 2000)
		expect(delayedUntil - now).toBeLessThanOrEqual(10 * 60 * 1000 + 2000)
		expect(log).toHaveBeenCalledWith(
			expect.stringContaining("Retry 1/4 in 10 min"),
		)
	})

	it("logs and returns when max retries reached", async () => {
		const job = createMockJob({
			data: { expect_new_chapters: true, cache_retry_attempt: 4 },
		})
		const log = vi.fn()

		await maybeDelayForCacheRetry({
			job: job as never,
			token: "token",
			hasNewChapters: false,
			hasExistingSerieSource: true,
			log,
		})

		expect(job.updateData).not.toHaveBeenCalled()
		expect(job.moveToDelayed).not.toHaveBeenCalled()
		expect(log).toHaveBeenCalledWith("No new chapters after 4 cache retries")
	})
})
