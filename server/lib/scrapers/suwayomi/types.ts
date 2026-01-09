import type { SuwayomiMangaStatus } from "../../suwayomi-client"
import { SourceLanguage, SourceSerieGenre, SourceSerieStatus, SourceSerieType } from "../../../utils/sources/core"

// Map Suwayomi language codes to SourceLanguage
export function mapSuwayomiLang(lang: string): SourceLanguage {
	const langMap: Record<string, SourceLanguage> = {
		"en": SourceLanguage.En,
		"ja": SourceLanguage.Jp,
		"ja-ro": SourceLanguage.JpRo,
		"fr": SourceLanguage.Fr,
		"ko": SourceLanguage.Ko,
		"ko-ro": SourceLanguage.KoRo,
		"zh-hk": SourceLanguage.ZhHk,
		"zh": SourceLanguage.Zh,
		"zh-hans": SourceLanguage.Zh,
		"zh-hant": SourceLanguage.ZhHk,
	}
	return langMap[lang.toLowerCase()] ?? SourceLanguage.En
}

// Map Suwayomi status to SourceSerieStatus
export function mapSuwayomiStatus(status: SuwayomiMangaStatus): SourceSerieStatus {
	const statusMap: Record<SuwayomiMangaStatus, SourceSerieStatus> = {
		UNKNOWN: SourceSerieStatus.Unknown,
		ONGOING: SourceSerieStatus.Ongoing,
		COMPLETED: SourceSerieStatus.Completed,
		LICENSED: SourceSerieStatus.Published,
		PUBLISHING_FINISHED: SourceSerieStatus.Completed,
		CANCELLED: SourceSerieStatus.Canceled,
		ON_HIATUS: SourceSerieStatus.Hiatus,
	}
	return statusMap[status] ?? SourceSerieStatus.Unknown
}

// Map Suwayomi genre strings to SourceSerieGenre
export function mapSuwayomiGenre(genre: string): SourceSerieGenre {
	const normalized = genre.toLowerCase().replace(/[^a-z0-9]/g, "")
	const genreMap: Record<string, SourceSerieGenre> = {
		action: SourceSerieGenre.Action,
		adventure: SourceSerieGenre.Adventure,
		comedy: SourceSerieGenre.Comedy,
		drama: SourceSerieGenre.Drama,
		fantasy: SourceSerieGenre.Fantasy,
		horror: SourceSerieGenre.Horror,
		mystery: SourceSerieGenre.Mystery,
		psychological: SourceSerieGenre.Psychological,
		romance: SourceSerieGenre.Romance,
		scifi: SourceSerieGenre.SciFi,
		sliceoflife: SourceSerieGenre.SliceOfLife,
		sports: SourceSerieGenre.Sports,
		supernatural: SourceSerieGenre.Supernatural,
		thriller: SourceSerieGenre.Thriller,
		shounen: SourceSerieGenre.Shounen,
		shoujo: SourceSerieGenre.Shoujo,
		seinen: SourceSerieGenre.Seinen,
		josei: SourceSerieGenre.Josei,
		harem: SourceSerieGenre.Harem,
		reverseharem: SourceSerieGenre.ReverseHarem,
		isekai: SourceSerieGenre.Isekai,
		mecha: SourceSerieGenre.Mecha,
		martialarts: SourceSerieGenre.MartialArts,
		schoollife: SourceSerieGenre.SchoolLife,
		ecchi: SourceSerieGenre.Ecchi,
		mature: SourceSerieGenre.Mature,
		adult: SourceSerieGenre.Adult,
		gore: SourceSerieGenre.Gore,
		boyslove: SourceSerieGenre.BoysLove,
		girlslove: SourceSerieGenre.GirlsLove,
		yaoi: SourceSerieGenre.Yaoi,
		yuri: SourceSerieGenre.Yuri,
		historical: SourceSerieGenre.Historical,
		military: SourceSerieGenre.Military,
		music: SourceSerieGenre.Music,
		medical: SourceSerieGenre.Medical,
		cooking: SourceSerieGenre.Cooking,
		crime: SourceSerieGenre.Crime,
		doujinshi: SourceSerieGenre.Doujinshi,
		oneshot: SourceSerieGenre.OneShot,
		magic: SourceSerieGenre.Magic,
		demons: SourceSerieGenre.Demons,
		vampires: SourceSerieGenre.Vampires,
		zombies: SourceSerieGenre.Zombies,
		survival: SourceSerieGenre.Survival,
		tragedy: SourceSerieGenre.Tragedy,
		reincarnation: SourceSerieGenre.Reincarnation,
		timetravel: SourceSerieGenre.TimeTravel,
		villainess: SourceSerieGenre.Villainess,
		videogames: SourceSerieGenre.VideoGames,
		fullcolor: SourceSerieGenre.FullColor,
		webtoon: SourceSerieGenre.WebComic,
		longstrip: SourceSerieGenre.LongStrip,
	}
	return genreMap[normalized] ?? SourceSerieGenre.Unknown
}

// Infer serie type from genres
export function inferSerieType(genres: string[]): SourceSerieType {
	const normalizedGenres = genres.map(g => g.toLowerCase())

	if (normalizedGenres.some(g => g.includes("manhwa"))) {
		return SourceSerieType.Manhwa
	}
	if (normalizedGenres.some(g => g.includes("manhua"))) {
		return SourceSerieType.Manhua
	}
	if (normalizedGenres.some(g => g.includes("webtoon") || g.includes("long strip"))) {
		return SourceSerieType.Webtoon
	}
	if (normalizedGenres.some(g => g.includes("doujinshi"))) {
		return SourceSerieType.Doujinshi
	}
	if (normalizedGenres.some(g => g.includes("novel"))) {
		return SourceSerieType.Novel
	}

	return SourceSerieType.Manga
}
