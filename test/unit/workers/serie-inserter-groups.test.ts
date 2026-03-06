import { describe, expect, it, vi } from "vitest"
import type { SourceChapters } from "../../../server/utils/sources/core"
import { upsertScanlationGroupsAndBuildMap } from "../../../server/utils/workers/serie-inserter-groups"

describe("upsertScanlationGroupsAndBuildMap", () => {
	it("upserts unique groups and returns external-id to db-id map", async () => {
		const tx = {
			scanlationGroup: {
				upsert: vi.fn().mockResolvedValue(undefined),
				findMany: vi.fn().mockResolvedValue([
					{ id: "gdb-1", external_id: "g-1" },
					{ id: "gdb-2", external_id: "g-2" },
				]),
			},
		}

		const chaptersResult: SourceChapters = {
			missingChapters: [],
			chapters: [
				{
					id: "c1",
					title: {},
					chapterNumber: 1,
					volumeNumber: null,
					volumeName: null,
					language: "En",
					dateUpload: new Date(),
					externalUrl: null,
					groups: [
						{ id: "g-1", name: "Group 1" },
						{ id: "g-2", name: "Group 2", url: new URL("https://example.com/group2") },
					],
				},
				{
					id: "c2",
					title: {},
					chapterNumber: 2,
					volumeNumber: null,
					volumeName: null,
					language: "En",
					dateUpload: new Date(),
					externalUrl: null,
					groups: [{ id: "g-1", name: "Group 1" }],
				},
			],
		}

		const groupMap = await upsertScanlationGroupsAndBuildMap(
			tx as never,
			"source-1",
			chaptersResult,
		)

		expect(tx.scanlationGroup.upsert).toHaveBeenCalledTimes(2)
		expect(tx.scanlationGroup.findMany).toHaveBeenCalledWith({
			where: {
				source_id: "source-1",
				external_id: { in: ["g-1", "g-2"] },
			},
			select: { id: true, external_id: true },
		})
		expect(groupMap.get("g-1")).toBe("gdb-1")
		expect(groupMap.get("g-2")).toBe("gdb-2")
	})
})
