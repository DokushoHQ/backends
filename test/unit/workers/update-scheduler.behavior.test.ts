import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "../../../server/utils/db"
import chapterDedupQueue, { JOB_PRIORITY as DEDUP_PRIORITY } from "../../../server/queues/chapter-dedup"
import indexerQueue from "../../../server/queues/indexer"
import pageRetryQueue from "../../../server/queues/page-retry"
import { createMockJob } from "./helpers"

vi.mock("#processor", () => ({
	defineWorker: vi.fn(args => args),
	defineQueue: vi.fn(args => args),
}))

vi.mock("../../../server/utils/db", () => ({
	db: {
		source: { findMany: vi.fn() },
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
})
