import { z } from "zod"
import {
	type MultiLanguage,
	SourceLanguage,
	type SourceScanlationGroup,
	type SourceSerie,
	type SourceSerieChapter,
	type SourceSerieChapterImage,
	SourceSerieGenre,
	SourceSerieType,
} from "../../../utils/sources/core"
import { transformMangadexGenre, transformMangadexLang, transformMangadexStatus } from "./types"

const NO_IMAGE_URL = new URL("https://i.imgur.com/6TrIues.jpeg")

const mangaDexRelationship = z.object({
	id: z.string(),
	type: z.string(),
	related: z.string().nullish(),
	attributes: z.record(z.string(), z.any()).nullish(),
})

const mangaDexTagAttributes = z.object({
	name: z.record(z.string(), z.string()),
	description: z.record(z.string(), z.any()),
	group: z.string(),
	version: z.number(),
})

const mangaDexTag = z.object({
	id: z.string(),
	type: z.string(),
	attributes: mangaDexTagAttributes,
})

const mangaDexMangaAttributes = {
	title: z.record(z.string(), z.string()),
	altTitles: z.array(z.record(z.string(), z.string())),
	description: z.record(z.string(), z.string()),
	isLocked: z.boolean(),
	links: z.record(z.string(), z.string()).nullish(),
	originalLanguage: z.string(),
	lastVolume: z.string().nullable().optional(),
	lastChapter: z.string().nullable().optional(),
	publication_demographic: z.string().nullable().optional(),
	status: z.string(),
	year: z.number().nullable().optional(),
	contentRating: z.string(),
	tags: z.array(mangaDexTag),
	state: z.string().nullish(),
	chapterNumbersResetOnNewVolume: z.boolean().nullish(),
	createdAt: z.string(),
	updatedAt: z.string(),
	version: z.number(),
	availableTranslatedLanguages: z.array(z.string().nullable()),
	latestUploadedChapter: z.string().nullable().optional(),
}

const transformToRecord = (acc: MultiLanguage, [key, value]: [string, string]) => {
	const keyT = transformMangadexLang(key)
	if (keyT && value) {
		if (!acc[keyT]) {
			acc[keyT] = []
		}
		acc[keyT].push(value)
	}

	return acc
}

const getSerieType = (originalLanguage: SourceLanguage, genres: Set<SourceSerieGenre>) => {
	const isLongStrip = genres.has(SourceSerieGenre.LongStrip)
	const isWebComic = genres.has(SourceSerieGenre.WebComic)
	const isDoujinshi = genres.has(SourceSerieGenre.Doujinshi)

	if (isDoujinshi) return SourceSerieType.Doujinshi
	else if (originalLanguage === SourceLanguage.Jp || originalLanguage === SourceLanguage.JpRo)
		return SourceSerieType.Manga
	else if (originalLanguage === SourceLanguage.Ko || originalLanguage === SourceLanguage.KoRo) {
		return isLongStrip || isWebComic ? SourceSerieType.Webtoon : SourceSerieType.Manhwa
	}
	else if (originalLanguage === SourceLanguage.Zh || originalLanguage === SourceLanguage.ZhHk) {
		return SourceSerieType.Manhua
	}
	else {
		return SourceSerieType.Comic
	}
}

const mangadexManga = z
	.object({
		id: z.string(),
		type: z.string(),
		attributes: z.object(mangaDexMangaAttributes),
		relationships: z.array(mangaDexRelationship).nullish(),
	})
	.transform(({ id, attributes, relationships }) => {
		const fileName = relationships?.find(el => el.type === "cover_art")?.attributes?.fileName
		const cover
			= fileName && typeof fileName === "string"
				? `https://uploads.mangadex.org/covers/${id}/${fileName}`
				: NO_IMAGE_URL
		const title: MultiLanguage = Object.entries(attributes.title).reduce(transformToRecord, {})
		const alternatesTitles: MultiLanguage = attributes.altTitles
			.flatMap(alt => Object.entries(alt))
			.reduce(transformToRecord, {})
		const synopsis: MultiLanguage = Object.entries(attributes.description).reduce(transformToRecord, {})
		const genres = new Set(
			attributes.tags
				.filter(tag => tag.attributes.group === "genre")
				.map(tag => transformMangadexGenre(tag.id))
				.filter(genre => genre !== undefined && genre !== null),
		)
		const status = new Set(
			[attributes.status, attributes.state]
				.filter(status => status !== undefined && status !== null)
				.map(transformMangadexStatus)
				.filter(status => status !== undefined && status !== null),
		)
		const originalLanguage = transformMangadexLang(attributes.originalLanguage) ?? SourceLanguage.Jp
		const { artists, authors } = (relationships ?? []).reduce(
			(acc, val) => {
				const person = val.attributes?.name
				if (person && typeof person === "string" && person.length > 0) {
					if (val.type === "author") {
						acc.authors.add(person)
					}
					else if (val.type === "artist") {
						acc.artists.add(person)
					}
				}

				return acc
			},
			{ authors: new Set<string>(), artists: new Set<string>() },
		)

		return {
			id,
			title,
			cover,
			synopsis,
			alternatesTitles,
			artists: [...artists],
			authors: [...authors],
			genres: [...genres],
			status: [...status],
			type: getSerieType(originalLanguage, genres),
		} as SourceSerie
	})

export const mangaDexSingleMangaResponse = z.object({
	result: z.string(),
	response: z.string(),
	data: mangadexManga,
})

export const mangadexMultipleMangaResponse = z.object({
	result: z.string(),
	response: z.string(),
	limit: z.number(),
	offset: z.number(),
	total: z.number(),
	data: z.array(mangadexManga),
})

const mangaDexChapterAttributes = z.object({
	volume: z.string().nullable(),
	chapter: z.string().nullable(),
	title: z.string().nullable(),
	translatedLanguage: z.string(),
	externalUrl: z.string().nullable(),
	publishAt: z.string(),
	readableAt: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
	pages: z.number(),
	version: z.number(),
})

const mangaDexAtHomeChapter = z.object({
	hash: z.string(),
	data: z.array(z.string()),
	dataSaver: z.array(z.string()),
})

export const mangaDexAtHomeResponse = z
	.object({
		result: z.string(),
		baseUrl: z.url(),
		chapter: mangaDexAtHomeChapter.nullish(),
	})
	.transform(({ baseUrl, chapter, result }) => {
		return {
			data: chapter?.data.map<SourceSerieChapterImage>((filename, index) => ({
				index: index + 1,
				url: new URL(`/data/${chapter.hash}/${filename}`, baseUrl),
				type: "image",
			})),
			result,
		}
	})

const mangaDexChapter = z
	.object({
		id: z.string(),
		type: z.string(),
		attributes: mangaDexChapterAttributes,
		relationships: z.array(mangaDexRelationship),
	})
	.transform(({ attributes, id, relationships }): SourceSerieChapter | null => {
		// Filter out external chapters (like MangaPlus) that have no hosted pages
		// These chapters redirect to external sites and can't be fetched from MangaDex at-home API
		if (attributes.externalUrl !== null && attributes.pages === 0) {
			return null
		}

		const volumeName = attributes.volume
		const volumeNumber = attributes.volume ? parseInt(attributes.volume, 10) : undefined
		const chapterNumber = attributes.chapter ? parseFloat(attributes.chapter) : 0.0
		const dateUpload = new Date(attributes.publishAt)
		const externalUrl = new URL(`https://mangadex.org/chapter/${id}`)
		const language = transformMangadexLang(attributes.translatedLanguage)
		if (!language) throw new Error("Invalid language")
		const title: MultiLanguage = {
			[language]: [attributes.title ?? `Chapter ${chapterNumber}`],
		}

		const groups: SourceScanlationGroup[] = relationships
			.filter(rel => rel.type === "scanlation_group")
			.map(rel => ({
				id: rel.id,
				name: (rel.attributes?.name as string) ?? "Unknown Group",
				url: rel.attributes?.website ? new URL(rel.attributes.website as string) : undefined,
			}))

		return {
			id,
			title,
			dateUpload,
			language,
			externalUrl,
			volumeName,
			volumeNumber,
			chapterNumber,
			groups,
		}
	})

export const mangadexMultipleChapterResponse = z.object({
	result: z.string(),
	response: z.string(),
	limit: z.number(),
	offset: z.number(),
	total: z.number(),
	data: z.array(mangaDexChapter),
}).transform(response => ({
	...response,
	// Filter out null chapters (external chapters like MangaPlus)
	data: response.data.filter((ch): ch is SourceSerieChapter => ch !== null),
}))

// Minimal chapter schema for latest updates - just extracts manga ID from relationships
const mangaDexChapterForLatest = z
	.object({
		id: z.string(),
		relationships: z.array(mangaDexRelationship),
	})
	.transform(({ relationships }) => {
		const mangaRel = relationships.find(rel => rel.type === "manga")
		return mangaRel?.id
	})

export const mangadexLatestChaptersResponse = z.object({
	result: z.string(),
	limit: z.number(),
	offset: z.number(),
	total: z.number(),
	data: z.array(mangaDexChapterForLatest),
})
