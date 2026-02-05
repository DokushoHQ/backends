import { z } from "zod"
import { authed } from "../middleware/auth"
import { db } from "../../utils/db"
import { serieIndex } from "../../utils/meilisearch"
import { getSources } from "../../utils/sources"

const PAGE_SIZE = 24

export const list = authed
	.input(z.object({
		page: z.number().int().min(1).default(1),
		q: z.string().trim().optional(),
		genre: z.string().optional(),
		author: z.string().optional(),
		artist: z.string().optional(),
		status: z.string().optional(),
		type: z.string().optional(),
		language: z.string().optional(),
	}))
	.handler(async ({ input }) => {
		const { page, q: searchQuery, genre, author, artist, status, type, language } = input

		const filters: string[] = ["soft_deleted = false"]
		if (genre) filters.push(`genres = "${genre}"`)
		if (author) filters.push(`authors = "${author}"`)
		if (artist) filters.push(`artists = "${artist}"`)
		if (status) filters.push(`status = "${status}"`)
		if (type) filters.push(`type = "${type}"`)
		if (language) filters.push(`languages_available = "${language}"`)

		const sortField = language ? `${language}_updated_at:desc` : "updated_at:desc"

		const searchResult = await serieIndex.search(searchQuery ?? "", {
			limit: PAGE_SIZE,
			offset: (page - 1) * PAGE_SIZE,
			filter: filters.join(" AND "),
			...(!searchQuery && { sort: [sortField] }),
		})

		const ids = searchResult.hits.map(hit => hit.id)
		if (ids.length === 0) {
			return {
				data: [],
				pagination: { page, pageSize: PAGE_SIZE, total: 0, totalPages: 0 },
			}
		}

		const hitsMap = new Map(searchResult.hits.map(hit => [hit.id, hit]))

		const seriesMap = new Map(
			(await db.serie.findMany({
				where: { id: { in: ids } },
				select: {
					id: true,
					title: true,
					synopsis: true,
					cover: true,
					type: true,
					status: true,
					updated_at: true,
					_count: { select: { chapters: { where: { enabled: true } } } },
				},
			})).map(s => [s.id, s]),
		)

		const series = ids.map((id) => {
			const dbData = seriesMap.get(id)
			if (!dbData) return null
			const hit = hitsMap.get(id)
			const lastChapterAt = language
				? (hit?.[`${language}_updated_at` as keyof typeof hit] as number | undefined)
				: hit?.updated_at
			return {
				...dbData,
				sources: (hit?.sources as string[]) ?? [],
				last_chapter_at: lastChapterAt ? new Date(lastChapterAt) : null,
			}
		}).filter(Boolean)

		const total = searchResult.estimatedTotalHits ?? series.length

		return {
			data: series,
			pagination: {
				page,
				pageSize: PAGE_SIZE,
				total,
				totalPages: Math.ceil(total / PAGE_SIZE),
			},
		}
	})

export const get = authed
	.input(z.object({
		id: z.string().uuid(),
	}))
	.handler(async ({ input }) => {
		const sources = await getSources()

		const serie = await db.serie.findUnique({
			where: { id: input.id },
			include: {
				sources: {
					select: {
						id: true,
						external_id: true,
						is_primary: true,
						priority: true,
						external_url: true,
						title: true,
						synopsis: true,
						cover: true,
						source: { select: { id: true, external_id: true, name: true, icon: true } },
					},
					orderBy: [{ is_primary: "desc" }, { priority: "asc" }],
				},
				genres: { select: { id: true, title: true } },
				authors: { select: { id: true, name: true } },
				artists: { select: { id: true, name: true } },
				_count: { select: { chapters: { where: { enabled: true } } } },
			},
		})

		if (!serie) {
			throw new Error("Serie not found")
		}

		// Build external URLs
		const sourcesWithUrls = await Promise.all(
			serie.sources.map(async (s) => {
				let url = s.external_url
				if (!url) {
					try {
						const sourceImpl = sources.find(src => src.sourceInformation().id === s.source.external_id)
						if (sourceImpl) {
							url = sourceImpl.serieUrl(s.external_id).toString()
						}
					}
					catch {
						// Ignore
					}
				}
				return { ...s, external_url: url }
			}),
		)

		return { ...serie, sources: sourcesWithUrls }
	})

export const chapters = authed
	.input(z.object({
		serieId: z.string().uuid(),
		language: z.string().optional(),
	}))
	.handler(async ({ input }) => {
		const chapters = await db.chapter.findMany({
			where: {
				serie_id: input.serieId,
				enabled: true,
				...(input.language ? { language: input.language as never } : {}),
			},
			include: {
				groups: { select: { id: true, name: true, url: true } },
				source: { select: { id: true, external_id: true, name: true } },
			},
			orderBy: [{ chapter_number: "desc" }, { id: "asc" }],
		})

		return { chapters }
	})

export const serieRouter = {
	list,
	get,
	chapters,
}
