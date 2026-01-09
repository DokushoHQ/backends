import {
	type Maybe,
	SourceFilterOrder,
	SourceFilterSort,
	SourceSerieGenre,
	SourceSerieStatus,
	SourceSerieType,
} from "../../../utils/sources/core"

type WeebCentralGenre = string

const GENRES_MAP = new Map<SourceSerieGenre, WeebCentralGenre>([
	[SourceSerieGenre.Action, "Action"],
	[SourceSerieGenre.Adult, "Adult"],
	[SourceSerieGenre.Adventure, "Adventure"],
	[SourceSerieGenre.Comedy, "Comedy"],
	[SourceSerieGenre.Doujinshi, "Doujinshi"],
	[SourceSerieGenre.Drama, "Drama"],
	[SourceSerieGenre.Ecchi, "Ecchi"],
	[SourceSerieGenre.Fantasy, "Fantasy"],
	[SourceSerieGenre.GenderBender, "GenderBender"],
	[SourceSerieGenre.Harem, "Harem"],
	[SourceSerieGenre.Hentai, "Hentai"],
	[SourceSerieGenre.Historical, "Historical"],
	[SourceSerieGenre.Horror, "Horror"],
	[SourceSerieGenre.Isekai, "Isekai"],
	[SourceSerieGenre.Josei, "Josei"],
	[SourceSerieGenre.Lolicon, "Lolicon"],
	[SourceSerieGenre.MartialArts, "MartialArts"],
	[SourceSerieGenre.Mature, "Mature"],
	[SourceSerieGenre.Mecha, "Mecha"],
	[SourceSerieGenre.Mystery, "Mystery"],
	[SourceSerieGenre.Psychological, "Psychological"],
	[SourceSerieGenre.Romance, "Romance"],
	[SourceSerieGenre.SchoolLife, "SchoolLife"],
	[SourceSerieGenre.SciFi, "SciFi"],
	[SourceSerieGenre.Seinen, "Seinen"],
	[SourceSerieGenre.Shotacon, "Shotacon"],
	[SourceSerieGenre.Shoujo, "Shoujo"],
	[SourceSerieGenre.ShoujoAi, "ShoujoAi"],
	[SourceSerieGenre.Shounen, "Shounen"],
	[SourceSerieGenre.ShounenAi, "ShounenAi"],
	[SourceSerieGenre.SliceOfLife, "SliceOfLife"],
	[SourceSerieGenre.Smut, "Smut"],
	[SourceSerieGenre.Sports, "Sports"],
	[SourceSerieGenre.Supernatural, "Supernatural"],
	[SourceSerieGenre.Tragedy, "Tragedy"],
	[SourceSerieGenre.Yaoi, "Yaoi"],
	[SourceSerieGenre.Yuri, "Yuri"],
	[SourceSerieGenre.Other, "Other"],
])

export const WEEBCENTRAL_GENRES = [...GENRES_MAP.entries().map(([key]) => key)]

const GENRES_INVERSE_MAP = new Map(GENRES_MAP.entries().map(([key, value]) => [value, key]))

export function transformWeebcentralGenre(genre: WeebCentralGenre): Maybe<SourceSerieGenre> {
	return GENRES_INVERSE_MAP.get(genre)
}

export function transformSourceGenre(genre: SourceSerieGenre): Maybe<WeebCentralGenre> {
	return GENRES_MAP.get(genre)
}

type WeebCentralStatus = string

const STATUS_MAP = new Map<SourceSerieStatus, WeebCentralStatus>([
	[SourceSerieStatus.Ongoing, "Ongoing"],
	[SourceSerieStatus.Completed, "Complete"],
	[SourceSerieStatus.Hiatus, "Hiatus"],
	[SourceSerieStatus.Canceled, "Canceled"],
])

export const WEEBCENTRAL_STATUS = [...STATUS_MAP.entries().map(([key]) => key)]

const STATUS_INVERSE_MAP = new Map(STATUS_MAP.entries().map(([key, value]) => [value, key]))

export function transformWeebcentralStatus(status: WeebCentralStatus): Maybe<SourceSerieStatus> {
	return STATUS_INVERSE_MAP.get(status)
}

export function transformSourceStatus(status: SourceSerieStatus): Maybe<WeebCentralStatus> {
	return STATUS_MAP.get(status)
}

type WeebCentralType = string

const TYPES_MAP = new Map<SourceSerieType, WeebCentralType>([
	[SourceSerieType.Manga, "Manga"],
	[SourceSerieType.Manhwa, "Manhwa"],
	[SourceSerieType.Manhua, "Manhua"],
	[SourceSerieType.Oel, "OEL"],
])

export const WEEBCENTRAL_TYPES = [...TYPES_MAP.entries().map(([key]) => key)]

const TYPES_INVERSE_MAP = new Map(TYPES_MAP.entries().map(([key, value]) => [value, key]))

export function transformWeebcentralType(type: WeebCentralType): Maybe<SourceSerieType> {
	return TYPES_INVERSE_MAP.get(type)
}

export function transformSourceType(type: SourceSerieType): Maybe<WeebCentralType> {
	return TYPES_MAP.get(type)
}

type WeebCentralSort = string

const SORT_MAP = new Map<SourceFilterSort, WeebCentralSort>([
	[SourceFilterSort.Relevance, "Best Match"],
	[SourceFilterSort.Popularity, "Popularity"],
	[SourceFilterSort.Latest, "Latest Updates"],
	[SourceFilterSort.Alphabetic, "Alphabet"],
])

export const WEEBCENTRAL_SORT = [...SORT_MAP.entries().map(([key]) => key)]

const SORT_INVERSE_MAP = new Map(SORT_MAP.entries().map(([key, value]) => [value, key]))

export function transformWeebcentralSort(sort: WeebCentralSort): Maybe<SourceFilterSort> {
	return SORT_INVERSE_MAP.get(sort)
}

export function transformSourceSort(sort: SourceFilterSort): Maybe<WeebCentralSort> {
	return SORT_MAP.get(sort)
}

type WeebCentralOrder = string

const ORDER_MAP = new Map<SourceFilterOrder, WeebCentralOrder>([
	[SourceFilterOrder.ASC, "Ascending"],
	[SourceFilterOrder.DESC, "Descending"],
])

export const WEEBCENTRAL_ORDER = [...ORDER_MAP.entries().map(([key]) => key)]

const ORDER_INVERSE_MAP = new Map(ORDER_MAP.entries().map(([key, value]) => [value, key]))

export function transformWeebcentralOrder(order: WeebCentralOrder): Maybe<SourceFilterOrder> {
	return ORDER_INVERSE_MAP.get(order)
}

export function transformSourceOrder(order: SourceFilterOrder): Maybe<WeebCentralOrder> {
	return ORDER_MAP.get(order)
}
