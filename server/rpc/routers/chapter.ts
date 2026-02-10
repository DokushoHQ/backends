import { ORPCError } from "@orpc/server"
import { z } from "zod"
import { authed } from "../middleware/auth"
import { db } from "../../utils/db"
import { languageSchema } from "../../utils/schemas"

export const getData = authed
	.input(z.object({
		serieId: z.string().uuid(),
		chapterId: z.string().uuid(),
	}))
	.handler(async ({ input }) => {
		const chapter = await db.chapter.findUnique({
			where: { id: input.chapterId, serie_id: input.serieId },
			include: {
				data: {
					orderBy: { index: "asc" },
					select: { index: true, type: true, url: true, content: true },
				},
			},
		})

		if (!chapter) {
			throw new ORPCError("NOT_FOUND", { message: "Chapter not found" })
		}

		return {
			pages: chapter.data,
			hasData: chapter.data.length > 0,
		}
	})

export const getNavigation = authed
	.input(z.object({
		serieId: z.string().uuid(),
		chapterId: z.string().uuid(),
		language: languageSchema.optional(),
	}))
	.handler(async ({ input }) => {
		const currentChapter = await db.chapter.findUnique({
			where: { id: input.chapterId, serie_id: input.serieId },
			select: { chapter_number: true, language: true },
		})

		if (!currentChapter) {
			throw new ORPCError("NOT_FOUND", { message: "Chapter not found" })
		}

		const lang = input.language ?? currentChapter.language

		const [prev, next] = await Promise.all([
			db.chapter.findFirst({
				where: {
					serie_id: input.serieId,
					enabled: true,
					language: lang,
					chapter_number: { lt: currentChapter.chapter_number },
				},
				orderBy: { chapter_number: "desc" },
				select: { id: true, chapter_number: true, title: true },
			}),
			db.chapter.findFirst({
				where: {
					serie_id: input.serieId,
					enabled: true,
					language: lang,
					chapter_number: { gt: currentChapter.chapter_number },
				},
				orderBy: { chapter_number: "asc" },
				select: { id: true, chapter_number: true, title: true },
			}),
		])

		return { prev, next }
	})

export const chapterRouter = {
	getData,
	getNavigation,
}
