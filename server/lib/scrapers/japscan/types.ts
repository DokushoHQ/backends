import {
	type Maybe,
	SourceFilterOrder,
	SourceFilterSort,
	SourceSerieGenre,
	SourceSerieStatus,
	SourceSerieType,
} from "../../../utils/sources/core"

type JapscanGenre = string

const GENRES_MAP = new Map<SourceSerieGenre, JapscanGenre>([
	[SourceSerieGenre.Action, "Action"],
	[SourceSerieGenre.Adventure, "Aventure"],
	[SourceSerieGenre.Comedy, "Comédie"],
	[SourceSerieGenre.Drama, "Drame"],
	[SourceSerieGenre.Ecchi, "Ecchi"],
	[SourceSerieGenre.Fantasy, "Fantastique"],
	[SourceSerieGenre.Gore, "Gore"],
	[SourceSerieGenre.Harem, "Harem"],
	[SourceSerieGenre.Historical, "Historique"],
	[SourceSerieGenre.Horror, "Horreur"],
	[SourceSerieGenre.Isekai, "Isekai"],
	[SourceSerieGenre.Josei, "Josei"],
	[SourceSerieGenre.MartialArts, "Arts Martiaux"],
	[SourceSerieGenre.Mature, "Mature"],
	[SourceSerieGenre.Mecha, "Mecha"],
	[SourceSerieGenre.Military, "Militaire"],
	[SourceSerieGenre.Mystery, "Mystère"],
	[SourceSerieGenre.Psychological, "Psychologique"],
	[SourceSerieGenre.Romance, "Romance"],
	[SourceSerieGenre.SchoolLife, "Vie Scolaire"],
	[SourceSerieGenre.SciFi, "Sci-Fi"],
	[SourceSerieGenre.Seinen, "Seinen"],
	[SourceSerieGenre.Shoujo, "Shoujo"],
	[SourceSerieGenre.Shounen, "Shounen"],
	[SourceSerieGenre.SliceOfLife, "Tranche de vie"],
	[SourceSerieGenre.Sports, "Sports"],
	[SourceSerieGenre.Supernatural, "Surnaturel"],
	[SourceSerieGenre.Thriller, "Thriller"],
	[SourceSerieGenre.Tragedy, "Tragédie"],
])

export const JAPSCAN_GENRES = [...GENRES_MAP.entries().map(([key]) => key)]

const GENRES_INVERSE_MAP = new Map(GENRES_MAP.entries().map(([key, value]) => [value, key]))

export function transformJapscanGenre(genre: JapscanGenre): Maybe<SourceSerieGenre> {
	return GENRES_INVERSE_MAP.get(genre)
}

export function transformSourceGenre(genre: SourceSerieGenre): Maybe<JapscanGenre> {
	return GENRES_MAP.get(genre)
}

type JapscanStatus = string

const STATUS_MAP = new Map<SourceSerieStatus, JapscanStatus>([
	[SourceSerieStatus.Ongoing, "En Cours"],
	[SourceSerieStatus.Completed, "Terminé"],
])

export const JAPSCAN_STATUS = [...STATUS_MAP.entries().map(([key]) => key)]

const STATUS_INVERSE_MAP = new Map(STATUS_MAP.entries().map(([key, value]) => [value, key]))

export function transformJapscanStatus(status: JapscanStatus): Maybe<SourceSerieStatus> {
	return STATUS_INVERSE_MAP.get(status)
}

export function transformSourceStatus(status: SourceSerieStatus): Maybe<JapscanStatus> {
	return STATUS_MAP.get(status)
}

type JapscanType = string

const TYPES_MAP = new Map<SourceSerieType, JapscanType>([
	[SourceSerieType.Manga, "Manga"],
	[SourceSerieType.Manhwa, "Manhwa"],
	[SourceSerieType.Manhua, "Manhua"],
])

export const JAPSCAN_TYPES = [...TYPES_MAP.entries().map(([key]) => key)]

const TYPES_INVERSE_MAP = new Map(TYPES_MAP.entries().map(([key, value]) => [value, key]))

export function transformJapscanType(type: JapscanType): Maybe<SourceSerieType> {
	return TYPES_INVERSE_MAP.get(type)
}

export function transformSourceType(type: SourceSerieType): Maybe<JapscanType> {
	return TYPES_MAP.get(type)
}

type JapscanSort = string

const SORT_MAP = new Map<SourceFilterSort, JapscanSort>([
	[SourceFilterSort.Popularity, "popular"],
	[SourceFilterSort.Latest, "updated"],
	[SourceFilterSort.Alphabetic, "name"],
])

export const JAPSCAN_SORT = [...SORT_MAP.entries().map(([key]) => key)]

const SORT_INVERSE_MAP = new Map(SORT_MAP.entries().map(([key, value]) => [value, key]))

export function transformJapscanSort(sort: JapscanSort): Maybe<SourceFilterSort> {
	return SORT_INVERSE_MAP.get(sort)
}

export function transformSourceSort(sort: SourceFilterSort): Maybe<JapscanSort> {
	return SORT_MAP.get(sort)
}

type JapscanOrder = string

const ORDER_MAP = new Map<SourceFilterOrder, JapscanOrder>([
	[SourceFilterOrder.ASC, "asc"],
	[SourceFilterOrder.DESC, "desc"],
])

export const JAPSCAN_ORDER = [...ORDER_MAP.entries().map(([key]) => key)]

const ORDER_INVERSE_MAP = new Map(ORDER_MAP.entries().map(([key, value]) => [value, key]))

export function transformJapscanOrder(order: JapscanOrder): Maybe<SourceFilterOrder> {
	return ORDER_INVERSE_MAP.get(order)
}

export function transformSourceOrder(order: SourceFilterOrder): Maybe<JapscanOrder> {
	return ORDER_MAP.get(order)
}

export type JapscanSearchResult = {
	url: string
	name: string
	image: string
}
