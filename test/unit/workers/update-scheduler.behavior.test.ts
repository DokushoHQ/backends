import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "../../../server/utils/db"
import chapterDedupQueue, { JOB_PRIORITY as DEDUP_PRIORITY } from "../../../server/queues/chapter-dedup"
import indexerQueue from "../../../server/queues/indexer"
import pageRetryQueue from "../../../server/queues/page-retry"
import serieInserterQueue, { JOB_PRIORITY as INSERTER_PRIORITY } from "../../../server/queues/serie-inserter"
import { getSourceById } from "../../../server/utils/sources"
import { createMockJob } from "./helpers"

vi.mock("#processor", () => ({
	defineWorker: vi.fn(args => args),
	defineQueue: vi.fn(args => args),
}))

vi.mock("../../../server/utils/db", () => ({
	db: {
		source: { findMany: vi.fn(), update: vi.fn() },
		serieSource: { findMany: vi.fn() },
		chapter: { findMany: vi.fn() },
		serie: { findMany: vi.fn() },
	},
}))

vi.mock("../../../server/queues/chapter-dedup", () => ({
	default: { add: vi.fn() },
	JOB_PRIORITY: { LOW: 10 },
}))

vi.mock("../../../server/queues/indexer", () => ({
	default: { add: vi.fn() },
}))

vi.mock("../../../server/queues/page-retry", () => ({
	default: { add: vi.fn() },
}))

vi.mock("../../../server/queues/serie-inserter", () => ({
	default: { add: vi.fn() },
	JOB_PRIORITY: { HIGH: 1, NORMAL: 5, LOW: 10 },
}))

vi.mock("../../../server/utils/sources", () => ({
	getSourceById: vi.fn(),
}))

async function loadWorker() {
	const mod = await import("../../../server/workers/update-scheduler")
	return mod.default
}

describe("update-scheduler worker behavior", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("queues dedup and index jobs with expected recompute delays", async () => {
		vi.mocked(db.serie.findMany).mockResolvedValue([
			{ id: "serie-1" },
			{ id: "serie-2" },
		] as never)

		const worker = await loadWorker()
		const job = createMockJob({ data: { type: "RECOMPUTE_ALL" } })

		await worker.processor(job as never)

		expect(chapterDedupQueue.add).toHaveBeenNthCalledWith(
			1,
			"recompute-dedup-serie-1",
			{ serie_id: "serie-1" },
			{ delay: 0, priority: DEDUP_PRIORITY.LOW },
		)
		expect(chapterDedupQueue.add).toHaveBeenNthCalledWith(
			2,
			"recompute-dedup-serie-2",
			{ serie_id: "serie-2" },
			{ delay: 50, priority: DEDUP_PRIORITY.LOW },
		)

		expect(indexerQueue.add).toHaveBeenNthCalledWith(
			1,
			"recompute-index-serie-1",
			{ serie_id: "serie-1", type: "UPDATE" },
			{ delay: 5100 },
		)
		expect(indexerQueue.add).toHaveBeenNthCalledWith(
			2,
			"recompute-index-serie-2",
			{ serie_id: "serie-2", type: "UPDATE" },
			{ delay: 5200 },
		)
	})

	it("queues failed page retries with 5s stagger", async () => {
		vi.mocked(db.chapter.findMany).mockResolvedValue([
			{ id: "chapter-1" },
			{ id: "chapter-2" },
		] as never)

		const worker = await loadWorker()
		const job = createMockJob({ data: { type: "RETRY_FAILED_PAGES" } })

		await worker.processor(job as never)

		expect(pageRetryQueue.add).toHaveBeenNthCalledWith(
			1,
			"scheduled-retry-chapter-1",
			{ chapter_id: "chapter-1" },
			{ delay: 0 },
		)
		expect(pageRetryQueue.add).toHaveBeenNthCalledWith(
			2,
			"scheduled-retry-chapter-2",
			{ chapter_id: "chapter-2" },
			{ delay: 5000 },
		)
	})

	it("queues REFRESH_ALL jobs with backoff filtering and stagger delay", async () => {
		vi.stubGlobal("useRuntimeConfig", () => ({
			schedulerRefreshSpreadMs: 10000,
		}))

		vi.mocked(db.source.findMany).mockResolvedValue([
			{
				id: "source-1",
				external_id: "source-ext-1",
				rate_limit_max: 2,
				rate_limit_duration: 5000,
			},
		] as never)

		vi.mocked(db.serieSource.findMany).mockResolvedValue([
			{
				id: "ss-1",
				external_id: "serie-a",
				last_checked_at: new Date("2026-01-01T00:00:00.000Z"),
				consecutive_failures: 2,
			},
			{
				id: "ss-2",
				external_id: "serie-b",
				last_checked_at: new Date(),
				consecutive_failures: 3,
			},
			{
				id: "ss-3",
				external_id: "serie-c",
				last_checked_at: null,
				consecutive_failures: 0,
			},
		] as never)

		const worker = await loadWorker()
		const job = createMockJob({ data: { type: "REFRESH_ALL" } })

		await worker.processor(job as never)

		expect(serieInserterQueue.add).toHaveBeenCalledTimes(2)
		expect(serieInserterQueue.add).toHaveBeenNthCalledWith(
			1,
			"serie-inserter",
			{ source_id: "source-1", source_serie_id: "serie-a" },
			{ delay: 0, priority: INSERTER_PRIORITY.NORMAL },
		)
		expect(serieInserterQueue.add).toHaveBeenNthCalledWith(
			2,
			"serie-inserter",
			{ source_id: "source-1", source_serie_id: "serie-c" },
			{ delay: 5000, priority: INSERTER_PRIORITY.NORMAL },
		)
	})

	it("queues FETCH_LATEST updates only for tracked stale series and updates fingerprint", async () => {
		vi.stubGlobal("useRuntimeConfig", () => ({
			schedulerMaxPages: 3,
			schedulerFingerprintSize: 3,
			schedulerRecentlyCheckedMs: 60 * 60 * 1000,
		}))
		vi.stubGlobal("getSources", vi.fn().mockResolvedValue([]))

		vi.mocked(db.source.findMany).mockResolvedValue([
			{
				id: "source-1",
				external_id: "source-ext-1",
				rate_limit_max: 2,
				rate_limit_duration: 5000,
				last_fetch_fingerprint: ["old-1", "old-2"],
			},
		] as never)

		vi.mocked(db.serieSource.findMany).mockResolvedValue([
			{
				id: "ss-1",
				external_id: "new-tracked",
				last_checked_at: null,
				consecutive_failures: 0,
			},
			{
				id: "ss-2",
				external_id: "recent-tracked",
				last_checked_at: new Date(),
				consecutive_failures: 0,
			},
		] as never)

		vi.mocked(getSourceById).mockReturnValue({
			fetchLatestUpdates: vi.fn().mockResolvedValue({
				hasNextPage: false,
				series: [
					{ id: "new-tracked" },
					{ id: "recent-tracked" },
					{ id: "untracked" },
					{ id: "old-1" },
					{ id: "old-2" },
				],
			}),
		} as never)
		vi.mocked(db.source.update).mockResolvedValue({} as never)

		const worker = await loadWorker()
		const job = createMockJob({ data: { type: "FETCH_LATEST" } })

		await worker.processor(job as never)

		expect(serieInserterQueue.add).toHaveBeenCalledTimes(1)
		expect(serieInserterQueue.add).toHaveBeenCalledWith(
			"serie-inserter",
			{ source_id: "source-1", source_serie_id: "new-tracked", expect_new_chapters: true },
			{ priority: INSERTER_PRIORITY.HIGH },
		)

		expect(db.source.update).toHaveBeenCalledWith({
			where: { id: "source-1" },
			data: {
				last_fetch_fingerprint: ["new-tracked", "recent-tracked", "untracked"],
			},
		})
	})
})
