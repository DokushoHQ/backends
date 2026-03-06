import { beforeEach, describe, expect, it, vi } from "vitest"
import { DelayedError } from "bullmq"
import { db } from "../../../server/utils/db"
import { getSourceById } from "../../../server/utils/sources"
import { createMockJob } from "./helpers"

const { flowAdd } = vi.hoisted(() => ({
	flowAdd: vi.fn(),
}))

vi.mock("#processor", () => ({
	defineWorker: vi.fn(args => args),
	defineQueue: vi.fn(args => args),
}))

vi.mock("../../../server/utils/db", () => ({
	db: {
		serieSource: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		source: {
			findUniqueOrThrow: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}))

vi.mock("../../../server/utils/flow-producer", () => ({
	getFlowProducer: vi.fn(() => ({
		add: flowAdd,
	})),
}))

vi.mock("../../../server/utils/sources", () => ({
	getSourceById: vi.fn(),
}))

vi.mock("../../../server/utils/serie", () => ({
	resolveMultiLanguage: vi.fn(() => "Test Serie"),
	resolveSerieTitle: vi.fn(() => "Test Serie"),
}))

async function loadWorker() {
	const mod = await import("../../../server/workers/serie-inserter")
	return mod.default
}

describe("serie-inserter worker behavior", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubGlobal("getSources", vi.fn().mockResolvedValue([]))

		vi.mocked(db.serieSource.findUnique).mockResolvedValue({
			id: "serie-source-1",
			serie_id: "serie-1",
		} as never)
		vi.mocked(db.source.findUniqueOrThrow).mockResolvedValue({
			external_id: "source-external",
		} as never)
		vi.mocked(getSourceById).mockReturnValue({
			fetchSerieDetail: vi.fn().mockResolvedValue({
				title: { En: ["Test Serie"] },
			}),
			fetchSerieChapters: vi.fn().mockResolvedValue({
				chapters: [],
			}),
		} as never)
		vi.mocked(db.serieSource.update).mockResolvedValue({} as never)
	})

	it("delays with retry metadata when expected chapters are missing", async () => {
		vi.mocked(db.$transaction).mockResolvedValue({
			chapter_ids: [],
			serie_id: "serie-1",
			serie_source_id: "serie-source-1",
			has_new_chapters: false,
		})

		const worker = await loadWorker()
		const job = createMockJob({
			data: {
				source_id: "source-db-id",
				source_serie_id: "source-serie-id",
				expect_new_chapters: true,
			},
		})

		const now = Date.now()
		await expect(worker.processor(job as never, "token")).rejects.toBeInstanceOf(DelayedError)

		expect(job.updateData).toHaveBeenCalledWith(
			expect.objectContaining({
				cache_retry_attempt: 1,
			}),
		)

		expect(job.moveToDelayed).toHaveBeenCalledWith(expect.any(Number), "token")
		const delayedUntil = vi.mocked(job.moveToDelayed).mock.calls[0]?.[0] as number
		expect(delayedUntil - now).toBeGreaterThanOrEqual(10 * 60 * 1000 - 2000)
		expect(delayedUntil - now).toBeLessThanOrEqual(10 * 60 * 1000 + 2000)
		expect(flowAdd).not.toHaveBeenCalled()
	})

	it("does not delay after max cache retries and continues normal flow", async () => {
		vi.mocked(db.$transaction).mockResolvedValue({
			chapter_ids: [],
			serie_id: "serie-1",
			serie_source_id: "serie-source-1",
			has_new_chapters: false,
		})

		const worker = await loadWorker()
		const job = createMockJob({
			data: {
				source_id: "source-db-id",
				source_serie_id: "source-serie-id",
				expect_new_chapters: true,
				cache_retry_attempt: 4,
			},
		})

		await expect(worker.processor(job as never, "token")).resolves.toEqual({
			serie_id: "serie-1",
			chapters_queued: 0,
		})

		expect(job.updateData).not.toHaveBeenCalled()
		expect(job.moveToDelayed).not.toHaveBeenCalled()
		expect(flowAdd).toHaveBeenCalledTimes(1)
		expect(db.serieSource.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "serie-source-1" },
				data: expect.objectContaining({
					consecutive_failures: 0,
				}),
			}),
		)
	})

	it("builds the chapter flow with middle indexer attached to first chapter", async () => {
		vi.mocked(db.$transaction).mockResolvedValue({
			chapter_ids: ["chapter-1", "chapter-2"],
			serie_id: "serie-1",
			serie_source_id: "serie-source-1",
			has_new_chapters: true,
		})

		const worker = await loadWorker()
		const job = createMockJob({
			data: {
				source_id: "source-db-id",
				source_serie_id: "source-serie-id",
			},
		})

		await worker.processor(job as never, "token")

		expect(flowAdd).toHaveBeenCalledTimes(1)
		const payload = vi.mocked(flowAdd).mock.calls[0]?.[0] as Record<string, unknown>
		expect(payload).toMatchObject({
			name: "indexer-final-serie-1",
			queueName: "indexer",
			data: { serie_id: "serie-1", type: "UPDATE" },
		})

		const firstLevelChildren = payload.children as Array<Record<string, unknown>>
		expect(firstLevelChildren).toHaveLength(1)
		expect(firstLevelChildren[0]).toMatchObject({
			name: "dedup-final-serie-1",
			queueName: "chapter-dedup",
		})

		const chapterJobs = firstLevelChildren[0]?.children as Array<Record<string, unknown>>
		expect(chapterJobs).toHaveLength(2)
		expect(chapterJobs[0]).toMatchObject({
			name: "chapter-chapter-1",
			queueName: "chapter-data",
		})
		expect(chapterJobs[1]).toMatchObject({
			name: "chapter-chapter-2",
			queueName: "chapter-data",
		})

		const firstChapterChildren = chapterJobs[0]?.children as Array<Record<string, unknown>>
		expect(firstChapterChildren).toHaveLength(1)
		expect(firstChapterChildren[0]).toMatchObject({
			name: "indexer-middle-serie-1",
			queueName: "indexer",
		})

		const earlyChildren = firstChapterChildren[0]?.children as Array<Record<string, unknown>>
		expect(earlyChildren).toHaveLength(2)
		expect(earlyChildren).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "cover-serie-source-1", queueName: "cover-update" }),
				expect.objectContaining({ name: "dedup-early-serie-1", queueName: "chapter-dedup" }),
			]),
		)
	})

	it("builds compact flow when there are no chapter jobs", async () => {
		vi.mocked(db.$transaction).mockResolvedValue({
			chapter_ids: [],
			serie_id: "serie-1",
			serie_source_id: "serie-source-1",
			has_new_chapters: false,
		})

		const worker = await loadWorker()
		const job = createMockJob({
			data: {
				source_id: "source-db-id",
				source_serie_id: "source-serie-id",
			},
		})

		await worker.processor(job as never, "token")

		expect(flowAdd).toHaveBeenCalledTimes(1)
		const payload = vi.mocked(flowAdd).mock.calls[0]?.[0] as Record<string, unknown>
		const firstLevelChildren = payload.children as Array<Record<string, unknown>>
		expect(firstLevelChildren).toHaveLength(1)
		expect(firstLevelChildren[0]).toMatchObject({
			name: "dedup-serie-1",
			queueName: "chapter-dedup",
		})

		const leafChildren = firstLevelChildren[0]?.children as Array<Record<string, unknown>>
		expect(leafChildren).toHaveLength(1)
		expect(leafChildren[0]).toMatchObject({
			name: "cover-serie-source-1",
			queueName: "cover-update",
			data: { type: "SOURCE", serie_source_id: "serie-source-1" },
		})
	})
})
