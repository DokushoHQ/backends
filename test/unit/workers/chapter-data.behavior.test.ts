import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChapterNotFoundError } from "../../../server/utils/sources/core"
import { db } from "../../../server/utils/db"
import { deleteByPrefix, uploadImageFile } from "../../../server/utils/s3"
import { getSourceById } from "../../../server/utils/sources"
import { createMockJob } from "./helpers"

vi.mock("#processor", () => ({
	defineWorker: vi.fn(args => args),
	defineQueue: vi.fn(args => args),
}))

vi.mock("../../../server/utils/db", () => ({
	db: {
		chapter: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		chapterData: {
			deleteMany: vi.fn(),
			createMany: vi.fn(),
		},
	},
}))

vi.mock("../../../server/utils/s3", () => ({
	deleteByPrefix: vi.fn(),
	uploadImageFile: vi.fn(),
	GifTooLargeError: class GifTooLargeError extends Error {},
}))

vi.mock("../../../server/utils/sources", () => ({
	getSourceById: vi.fn(),
}))

const serieId = "11111111-1111-1111-8111-111111111111"
const chapterId = "22222222-2222-2222-8222-222222222222"
const sourceId = "33333333-3333-3333-8333-333333333333"

const baseChapter = {
	id: chapterId,
	serie_id: serieId,
	source_id: sourceId,
	external_id: "ch-ext-1",
	source: { external_id: "source-ext" },
	serie: {
		sources: [{ external_id: "serie-ext-1", source_id: sourceId }],
	},
}

async function loadWorker() {
	const mod = await import("../../../server/workers/chapter-data")
	return mod.default
}

describe("chapter-data worker behavior", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubGlobal("getSources", vi.fn().mockResolvedValue([]))
		vi.mocked(db.chapter.findFirst).mockResolvedValue(baseChapter as never)
		vi.mocked(db.chapter.update).mockResolvedValue({} as never)
		vi.mocked(db.chapterData.deleteMany).mockResolvedValue({ count: 0 } as never)
		vi.mocked(db.chapterData.createMany).mockResolvedValue({ count: 0 } as never)
		vi.mocked(deleteByPrefix).mockResolvedValue(0)
	})

	it("marks chapter as PermanentlyFailed on ChapterNotFoundError without failing the job", async () => {
		vi.mocked(getSourceById).mockReturnValue({
			fetchChapterData: vi.fn().mockRejectedValue(new ChapterNotFoundError("ch-ext-1")),
		} as never)

		const worker = await loadWorker()
		const job = createMockJob({
			data: {
				serie_id: serieId,
				source_id: sourceId,
				chapter_id: chapterId,
				type: "UPDATE",
			},
		})

		await expect(worker.processor(job as never)).resolves.toBeUndefined()

		expect(db.chapter.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: chapterId },
				data: { page_fetch_status: "PermanentlyFailed" },
			}),
		)
		expect(uploadImageFile).not.toHaveBeenCalled()
	})

	it("throws when all pages fail with retryable errors", async () => {
		vi.mocked(getSourceById).mockReturnValue({
			fetchChapterData: vi.fn().mockResolvedValue([
				{ type: "image", url: new URL("https://example.com/page-1.jpg"), index: 1 },
			]),
		} as never)
		vi.mocked(uploadImageFile).mockRejectedValue(new Error("upload failed"))

		const worker = await loadWorker()
		const job = createMockJob({
			data: {
				serie_id: serieId,
				source_id: sourceId,
				chapter_id: chapterId,
				type: "UPDATE",
			},
		})

		await expect(worker.processor(job as never)).rejects.toThrow("Chapter page fetch failed completely")

		expect(db.chapter.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: chapterId },
				data: { page_fetch_status: "Failed" },
			}),
		)
		expect(db.chapterData.createMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: [
					expect.objectContaining({
						chapter_id: chapterId,
						index: 1,
						url: null,
					}),
				],
			}),
		)
	})
})
