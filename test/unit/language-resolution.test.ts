import { describe, it, expect } from "vitest"
import type { MultiLanguage } from "../../server/utils/sources/core"
import type { LanguageConfig } from "../../server/utils/serie"
import {
	resolveMultiLanguage,
	resolveSerieTitle,
	parseEnabledLanguages,
} from "../../server/utils/serie"

// Test config simulating production settings
const testConfig: LanguageConfig = {
	primaryLanguage: "Fr",
	fallbackPrimaryLanguage: "En",
	enabledLanguages: "Fr,En",
}

describe("parseEnabledLanguages", () => {
	it("parses comma-separated string", () => {
		expect(parseEnabledLanguages("Fr,En")).toEqual(["Fr", "En"])
	})

	it("trims whitespace", () => {
		expect(parseEnabledLanguages("Fr , En")).toEqual(["Fr", "En"])
	})

	it("returns empty array for empty string", () => {
		expect(parseEnabledLanguages("")).toEqual([])
	})

	it("returns empty array for null/undefined", () => {
		expect(parseEnabledLanguages(null as unknown as string)).toEqual([])
		expect(parseEnabledLanguages(undefined as unknown as string)).toEqual([])
	})
})

describe("resolveMultiLanguage", () => {
	describe("priority order", () => {
		it("returns primaryLanguage value first", () => {
			const ml: MultiLanguage = { Fr: ["Titre"], En: ["Title"], JpRo: ["Romanized"] }
			expect(resolveMultiLanguage(ml, "Untitled", testConfig)).toBe("Titre")
		})

		it("falls back to fallbackPrimaryLanguage when primary missing", () => {
			const ml: MultiLanguage = { En: ["Title"], JpRo: ["Romanized"] }
			expect(resolveMultiLanguage(ml, "Untitled", testConfig)).toBe("Title")
		})

		it("falls back to enabledLanguages in order", () => {
			const ml: MultiLanguage = { JpRo: ["Romanized"], Ko: ["Korean"] }
			// Neither Fr nor En exists, should try romanized next
			expect(resolveMultiLanguage(ml, "Untitled", testConfig)).toBe("Romanized")
		})

		it("prefers romanized over asian script", () => {
			const ml: MultiLanguage = { Jp: ["日本語"], JpRo: ["Romanized"] }
			expect(resolveMultiLanguage(ml, "Untitled", testConfig)).toBe("Romanized")
		})

		it("falls back to asian script when no romanized", () => {
			const ml: MultiLanguage = { Jp: ["日本語"], Ko: ["한국어"] }
			expect(resolveMultiLanguage(ml, "Untitled", testConfig)).toBe("日本語") // First in ASIAN order
		})

		it("returns fallback when no values exist", () => {
			expect(resolveMultiLanguage({}, "Untitled", testConfig)).toBe("Untitled")
			expect(resolveMultiLanguage(null, "Untitled", testConfig)).toBe("Untitled")
		})
	})

	describe("edge cases", () => {
		it("handles null input", () => {
			expect(resolveMultiLanguage(null, "Untitled", testConfig)).toBe("Untitled")
		})

		it("handles undefined input", () => {
			expect(resolveMultiLanguage(undefined, "Untitled", testConfig)).toBe("Untitled")
		})

		it("handles empty arrays in languages", () => {
			const ml: MultiLanguage = { Fr: [], En: ["Title"] }
			expect(resolveMultiLanguage(ml, "Untitled", testConfig)).toBe("Title")
		})

		it("uses first element of array", () => {
			const ml: MultiLanguage = { Fr: ["Premier", "Deuxième"] }
			expect(resolveMultiLanguage(ml, "Untitled", testConfig)).toBe("Premier")
		})
	})
})

describe("resolveSerieTitle", () => {
	describe("title and alternates priority", () => {
		it("prefers title[primary] over alternates[primary]", () => {
			const title: MultiLanguage = { Fr: ["Titre Principal"] }
			const alternates: MultiLanguage = { Fr: ["Titre Alternatif"] }
			expect(resolveSerieTitle(title, alternates, "Untitled", testConfig)).toBe("Titre Principal")
		})

		it("uses alternates[primary] when title[primary] missing", () => {
			const title: MultiLanguage = { En: ["English Title"] }
			const alternates: MultiLanguage = { Fr: ["Titre Français"] }
			expect(resolveSerieTitle(title, alternates, "Untitled", testConfig)).toBe("Titre Français")
		})

		it("uses title[fallback] before alternates[fallback]", () => {
			const title: MultiLanguage = { En: ["English Title"], JpRo: ["Romanized"] }
			const alternates: MultiLanguage = { En: ["Alt English"] }
			// No Fr anywhere, should use En from title
			expect(resolveSerieTitle(title, alternates, "Untitled", testConfig)).toBe("English Title")
		})

		it("uses alternates[fallback] when title[fallback] missing", () => {
			const title: MultiLanguage = { JpRo: ["Romanized"] }
			const alternates: MultiLanguage = { En: ["Alt English"] }
			expect(resolveSerieTitle(title, alternates, "Untitled", testConfig)).toBe("Alt English")
		})

		it("falls back to romanized from title when no primary/fallback", () => {
			const title: MultiLanguage = { JpRo: ["Romanized"], Jp: ["日本語"] }
			const alternates: MultiLanguage = { Ko: ["한국어"] }
			expect(resolveSerieTitle(title, alternates, "Untitled", testConfig)).toBe("Romanized")
		})

		it("falls back to romanized from alternates", () => {
			const title: MultiLanguage = { Jp: ["日本語"] }
			const alternates: MultiLanguage = { JpRo: ["Romanized"] }
			expect(resolveSerieTitle(title, alternates, "Untitled", testConfig)).toBe("Romanized")
		})
	})

	describe("complex scenarios", () => {
		it("handles MangaDex-like data with JpRo title but Fr alternate", () => {
			// Real scenario: MangaDex returns JpRo as main title, Fr in alternates
			const title: MultiLanguage = { JpRo: ["Shingeki no Kyojin"] }
			const alternates: MultiLanguage = { Fr: ["L'Attaque des Titans"], En: ["Attack on Titan"] }
			expect(resolveSerieTitle(title, alternates, "Untitled", testConfig)).toBe("L'Attaque des Titans")
		})

		it("handles series with only asian script", () => {
			const title: MultiLanguage = { Jp: ["進撃の巨人"] }
			const alternates: MultiLanguage = { Ko: ["진격의 거인"] }
			expect(resolveSerieTitle(title, alternates, "Untitled", testConfig)).toBe("進撃の巨人")
		})

		it("handles null title with valid alternates", () => {
			const alternates: MultiLanguage = { Fr: ["Titre Français"] }
			expect(resolveSerieTitle(null, alternates, "Untitled", testConfig)).toBe("Titre Français")
		})

		it("handles null alternates with valid title", () => {
			const title: MultiLanguage = { Fr: ["Titre Principal"] }
			expect(resolveSerieTitle(title, null, "Untitled", testConfig)).toBe("Titre Principal")
		})

		it("returns fallback when both are null", () => {
			expect(resolveSerieTitle(null, null, "Untitled", testConfig)).toBe("Untitled")
			expect(resolveSerieTitle(null, null, "Custom Fallback", testConfig)).toBe("Custom Fallback")
		})
	})
})
