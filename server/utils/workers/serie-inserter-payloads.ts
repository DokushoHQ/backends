import type { Prisma } from "../db"
import { resolveMultiLanguage, resolveSerieTitle } from "../serie"
import type { SourceSerie } from "../sources/core"

type BuildSerieSourceCreateDataParams = {
	serieId: string
	sourceId: string
	sourceSerieId: string
	serieData: SourceSerie
	isPrimary: boolean
}

function buildSerieSourceBaseData(serieData: SourceSerie) {
	return {
		title: serieData.title as Prisma.InputJsonValue,
		alternates_titles: serieData.alternatesTitles as Prisma.InputJsonValue,
		synopsis: serieData.synopsis as Prisma.InputJsonValue,
		cover_source_url: serieData.cover.toString(),
		status: serieData.status,
		type: serieData.type,
		...(serieData.externalUrl && { external_url: serieData.externalUrl.toString() }),
	}
}

export function buildSerieSourceUpdateData(serieData: SourceSerie) {
	return {
		...buildSerieSourceBaseData(serieData),
		updated_at: new Date(),
	}
}

export function buildSerieSourceCreateData({
	serieId,
	sourceId,
	sourceSerieId,
	serieData,
	isPrimary,
}: BuildSerieSourceCreateDataParams) {
	return {
		serie_id: serieId,
		source_id: sourceId,
		external_id: sourceSerieId,
		...buildSerieSourceBaseData(serieData),
		is_primary: isPrimary,
		priority: isPrimary ? 1 : 5,
	}
}

export function buildSerieCreateData(serieData: SourceSerie) {
	return {
		title: resolveSerieTitle(serieData.title, serieData.alternatesTitles),
		synopsis: resolveMultiLanguage(serieData.synopsis, "") || null,
		type: serieData.type,
		status: serieData.status,
	}
}
