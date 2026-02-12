import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	SourceSerieStatus,
	SourceSerieType,
	type SourceSerie,
} from "../../../server/utils/sources/core"
import {
	buildSerieCreateData,
	buildSerieSourceCreateData,
	buildSerieSourceUpdateData,
} from "../../../server/utils/workers/serie-inserter-payloads"

const baseSerieData: SourceSerie = {
	id: "source-serie-id",
	title: { En: ["Main Title"], Fr: ["Titre"] },
	alternatesTitles: { En: ["Alt Title"] },
	cover: new URL("https://example.com/cover.jpg"),
	synopsis: { En: ["Summary"] },
	status: [SourceSerieStatus.Ongoing],
	type: SourceSerieType.Manga,
	genres: [],
	authors: [],
	artists: [],
}

describe("serie inserter payload builders", () => {
	beforeEach(() => {
		vi.stubGlobal("useRuntimeConfig", () => ({
			primaryLanguage: "En",
			fallbackPrimaryLanguage: "En",
			enabledLanguages: "En",
		}))
	})

	it("builds update payload with updated_at and no external_url when absent", () => {
		const payload = buildSerieSourceUpdateData(baseSerieData)

		expect(payload).toMatchObject({
			title: baseSerieData.title,
			alternates_titles: baseSerieData.alternatesTitles,
			synopsis: baseSerieData.synopsis,
			cover_source_url: "https://example.com/cover.jpg",
			status: [SourceSerieStatus.Ongoing],
			type: SourceSerieType.Manga,
		})
		expect(payload.updated_at).toBeInstanceOf(Date)
		expect(payload).not.toHaveProperty("external_url")
	})

	it("includes external_url when available", () => {
		const payload = buildSerieSourceUpdateData({
			...baseSerieData,
			externalUrl: new URL("https://example.com/serie"),
		})

		expect(payload.external_url).toBe("https://example.com/serie")
	})

	it("builds create payload with primary priority mapping", () => {
		const primaryPayload = buildSerieSourceCreateData({
			serieId: "serie-1",
			sourceId: "source-1",
			sourceSerieId: "ext-1",
			serieData: baseSerieData,
			isPrimary: true,
		})
		const secondaryPayload = buildSerieSourceCreateData({
			serieId: "serie-1",
			sourceId: "source-1",
			sourceSerieId: "ext-1",
			serieData: baseSerieData,
			isPrimary: false,
		})

		expect(primaryPayload.priority).toBe(1)
		expect(primaryPayload.is_primary).toBe(true)
		expect(secondaryPayload.priority).toBe(5)
		expect(secondaryPayload.is_primary).toBe(false)
	})

	it("builds serie create payload using resolved title and synopsis", () => {
		const payload = buildSerieCreateData(baseSerieData)

		expect(payload).toMatchObject({
			title: "Main Title",
			synopsis: "Summary",
			type: SourceSerieType.Manga,
			status: [SourceSerieStatus.Ongoing],
		})
	})
})
