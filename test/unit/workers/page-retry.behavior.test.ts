import { beforeEach, describe, expect, it, vi } from "vitest"
import { db } from "../../../server/utils/db"
import { GifTooLargeError, uploadImageFile } from "../../../server/utils/s3"
import { createMockJob } from "./helpers"

vi.mock("#processor", () => ({
	defineWorker: vi.fn(args => args),
	defineQueue: vi.fn(args => args),
}))

vi.mock("../../../server/utils/db", () => ({
	db: {
		chapter: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		chapterData: {
			findMany: vi.fn(),
			update: vi.fn(),
			count: vi.fn(),
		},
	},
}))

vi.mock("../../../server/utils/s3", () => ({
	uploadImageFile: vi.fn(),
	GifTooLargeError: class GifTooLargeError extends Error {},
}))

const chapterId = "11111111-1111-1111-8111-111111111111"
const serieId = "22222222-2222-2222-8222-222222222222"

async function loadWorker() {
	const mod = await import("../../../server/workers/page-retry")
	return mod.default
}

describe("page-retry worker behavior", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(db.chapter.findUnique).mockResolvedValue({ id: chapterId, serie_id: serieId } as never)
		vi.mocked(db.chapter.update).mockResolvedValue({} as never)
		vi.mocked(db.chapterData.update).mockResolvedValue({} as never)
	})

	it("marks page as permanently_failed and sets chapter status to Incomplete", async () => {
		vi.mocked(db.chapterData.findMany).mockResolvedValue([
			{
				id: "33333333-3333-3333-8333-333333333333",
				index: 1,
				source_url: "https://example.com/p1.jpg",
			},
		] as never)

		vi.mocked(uploadImageFile).mockRejectedValue(new GifTooLargeError(20, 10))
		vi.mocked(db.chapterData.count)
			.mockResolvedValueOnce(1)
			.mockResolvedValueOnce(0)
			.mockResolvedValueOnce(1)

		const worker = await loadWorker()
		const job = createMockJob({ data: { chapter_id: chapterId } })

		await worker.processor(job as never)

		expect(db.chapterData.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "33333333-3333-3333-8333-333333333333" },
				data: { permanently_failed: true },
			}),
		)

		expect(db.chapter.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: chapterId },
				data: { page_fetch_status: "Incomplete" },
			}),
		)
	})

	it("exits early when there are no failed pages", async () => {
		vi.mocked(db.chapterData.findMany).mockResolvedValue([])

		const worker = await loadWorker()
		const job = createMockJob({ data: { chapter_id: chapterId } })

		await worker.processor(job as never)

		expect(db.chapterData.count).not.toHaveBeenCalled()
		expect(db.chapter.update).not.toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ page_fetch_status: expect.any(String) }),
			}),
		)
	})
})
