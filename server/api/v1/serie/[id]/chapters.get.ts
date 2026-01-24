import { z } from "zod"

const paramsSchema = z.object({
	id: z.string().min(1, "Serie ID required"),
})

const querySchema = z.object({
	includeDisabled: z
		.string()
		.optional()
		.transform((v) => v === "true"),
	lang: z.enum(SourceLanguage),
})

export default defineEventHandler(async (event) => {
	await requireAuth(event)

	const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
	const { includeDisabled, lang } = await getValidatedQuery(event, querySchema.parse)

	const chapters = await db.chapter.findMany({
		where: {
			serie_id: id,

			...(includeDisabled ? {} : { enabled: true }),
			...(lang ? { language: lang } : {}),
		},
		include: {
			groups: {
				select: { id: true, name: true, url: true },
			},
			source: {
				select: { id: true, external_id: true, name: true },
			},
		},
		orderBy: [{ chapter_number: "desc" }, { id: "asc" }],
	})

	return { chapters }
})
