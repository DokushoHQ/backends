export type Maybe<T> = T | null | undefined

export type SourceId = string
export type SourceSerieId = string
export type SourceSerieChapterId = string
export type SourceSerieChapterImageId = string

// Genres
export enum SourceSerieGenre {
	Unknown = "Unknown",
	Other = "Other",
	FourKoma = "Four Koma",
	Action = "Action",
	Adaptation = "Adaptation",
	Adult = "Adult",
	Adventure = "Adventure",
	Aliens = "Aliens",
	Animals = "Animals",
	Anthology = "Anthology",
	AwardWinning = "Award Winning",
	BoysLove = "Boys Love",
	Comedy = "Comedy",
	Cooking = "Cooking",
	Crime = "Crime",
	Crossdressing = "Cross-dressing",
	Delinquents = "Delinquents",
	Demons = "Demons",
	Doujinshi = "Doujinshi",
	Drama = "Drama",
	Ecchi = "Ecchi",
	FanColored = "Fan Colored",
	Fantasy = "Fantasy",
	FullColor = "Full Color",
	GenderBender = "Gender Bender",
	GenderSwap = "Gender Swap",
	Ghost = "Ghost",
	GirlsLove = "Girls Love",
	Gore = "Gore",
	Gyaru = "Gyaru",
	Harem = "Harem",
	Hentai = "Hentai",
	Historical = "Historical",
	Horror = "Horror",
	Incest = "Incest",
	Isekai = "Isekai",
	Josei = "Josei",
	Kids = "Kids",
	Lolicon = "Lolicon",
	LongStrip = "Long Strip",
	Mafia = "Mafia",
	Magic = "Magic",
	MagicalGirls = "Magical Girls",
	MartialArts = "Martial Arts",
	Mature = "Mature",
	Mecha = "Mecha",
	Medical = "Medical",
	Military = "Military",
	MonsterGirls = "Monster Girls",
	Monsters = "Monsters",
	Music = "Music",
	Mystery = "Mystery",
	Ninja = "Ninja",
	OfficeWorkers = "Office Workers",
	OfficialColored = "Official Colored",
	OneShot = "OneShot",
	Philosophical = "Philosophical",
	Police = "Police",
	PostApocalyptic = "Post Apocalyptic",
	Psychological = "Psychological",
	PsychologicalRomance = "Psychological Romance",
	Reincarnation = "Reincarnation",
	ReverseHarem = "Reverse Harem",
	Romance = "Romance",
	Samurai = "Samurai",
	SchoolLife = "School Life",
	SciFi = "Sci-fi",
	Seinen = "Seinen",
	SelfPublished = "Self Published",
	SexualViolence = "Sexual Violence",
	Shotacon = "Shotacon",
	Shoujo = "Shoujo",
	ShoujoAi = "Shoujo Ai",
	Shounen = "Shounen",
	ShounenAi = "Shounen Ai",
	SliceOfLife = "Slice of Life",
	Smut = "Smut",
	Space = "Space",
	Sports = "Sports",
	Superhero = "Superhero",
	Supernatural = "Supernatural",
	Survival = "Survival",
	Suspense = "Suspense",
	Thriller = "Thriller",
	TimeTravel = "Time Travel",
	Toomics = "Toomics",
	TraditionalGames = "Traditional Games",
	Tragedy = "Tragedy",
	Vampires = "Vampires",
	VideoGames = "Video Games",
	Villainess = "Villainess",
	VirtualReality = "Virtual Reality",
	WebComic = "WebComic",
	Wuxia = "Wuxia",
	Yaoi = "Yaoi",
	Yuri = "Yuri",
	Zombies = "Zombies",
}

export const SourceLanguage = {
	En: "En",
	Jp: "Jp",
	JpRo: "JpRo",
	Fr: "Fr",
	Ko: "Ko",
	KoRo: "KoRo",
	ZhHk: "ZhHk",
	Zh: "Zh",
} as const

export type SourceLanguage = (typeof SourceLanguage)[keyof typeof SourceLanguage]

export type MultiLanguage = Partial<Record<SourceLanguage, string[]>>

export enum SourceSerieStatus {
	Ongoing = "Ongoing",
	Completed = "Completed",
	Hiatus = "Hiatus",
	Canceled = "Canceled",
	Publishing = "Publishing",
	Published = "Published",
	Scanlating = "Scanlating",
	Scanlated = "Scanlated",
	Unknown = "Unknown",
}

export enum SourceSerieType {
	Manga = "Manga",
	Manhwa = "Manhwa",
	Manhua = "Manhua",
	Webtoon = "Webtoon",
	Lightnovel = "Lightnovel",
	Novel = "Novel",
	Doujinshi = "Doujinshi",
	Comic = "Comic",
	Oel = "Oel",
	Unknown = "Unknown",
}

export enum SourceFilterOrder {
	ASC = "ASC",
	DESC = "DESC",
}

export enum SourceFilterSort {
	Latest = "Latest",
	Popularity = "Popularity",
	Relevance = "Relevance",
	Alphabetic = "Alphabetic",
}

export type SourceSerieChapterImage = {
	type: "image"
	index: number
	url: URL
}

export type SourceSerieChapterText = {
	type: "text"
	index: number
	text: string
}

export type SourceSerieChapterData = (SourceSerieChapterImage | SourceSerieChapterText)[]

export type SourceScanlationGroup = {
	id: string
	name: string
	url?: URL
}

export type SourceSerieChapter = {
	id: SourceSerieChapterId
	title: MultiLanguage
	chapterNumber: number
	volumeNumber: Maybe<number>
	volumeName: Maybe<string>
	language: SourceLanguage
	dateUpload: Date
	externalUrl: Maybe<URL>
	groups: SourceScanlationGroup[]
}

export type SourceSerie = {
	id: SourceSerieId
	title: MultiLanguage
	alternatesTitles: MultiLanguage
	cover: URL
	synopsis: MultiLanguage
	status: SourceSerieStatus[]
	type: SourceSerieType
	genres: SourceSerieGenre[]
	authors: string[]
	artists: string[]
	/** External URL to the serie on the source website (if known) */
	externalUrl?: URL
}

export type SourceSmallSerie = Pick<SourceSerie, "id" | "title" | "cover">

export type SourcePaginatedSmallSerie = {
	hasNextPage: boolean
	series: SourceSmallSerie[]
}

export type SourceChapters = {
	missingChapters: number[]
	chapters: SourceSerieChapter[]
}

export type FetchSearchSerieFilterGenres = {
	includes: Maybe<SourceSerieGenre[]>
	excludes: Maybe<SourceSerieGenre[]>
}

export type FetchSearchSerieFilter = {
	query?: Maybe<string>
	order?: Maybe<SourceFilterOrder>
	sort?: Maybe<SourceFilterSort>
	artists?: Maybe<string[]>
	authors?: Maybe<string[]>
	types?: Maybe<SourceSerieType[]>
	genres?: Maybe<FetchSearchSerieFilterGenres>
	status?: Maybe<SourceSerieStatus[]>
	onlyEnableTranslation?: Maybe<boolean>
}

export type SupportedFiltersGenres = {
	include: boolean
	exclude: boolean
	acceptedValues: SourceSerieGenre[]
}

export type SupportedFilters = {
	query: boolean
	order: SourceFilterOrder[]
	sort: SourceFilterSort[]
	artists: boolean
	authors: boolean
	types: SourceSerieType[]
	genres: SupportedFiltersGenres
	status: SourceSerieStatus[]
}

export type SourceInformation = {
	id: SourceId
	name: string
	url: URL
	icon: URL
	languages: SourceLanguage[]
	enabledLanguages: SourceLanguage[]
	updatedAt: Date
	version: string
	nsfw: boolean
	searchFilters: SupportedFilters
}

export type SourceApiInformation = {
	api_url: URL
	headers: Map<string, string>
	minimumUpdateInterval: number
	timeout: number
	canBlockScraping: boolean
	rateLimitMax: number // Max requests per rateLimitDuration
	rateLimitDuration: number // Duration in milliseconds
}

export type SourceProvider = {
	sourceInformation(): SourceInformation
	sourceApiInformation(): SourceApiInformation
	serieUrl(serieId: SourceSerieId): URL
	parseUrl(url: string): { serieId: SourceSerieId } | null

	fetchPopularSerie(page: number): Promise<SourcePaginatedSmallSerie>
	fetchLatestUpdates(page: number): Promise<SourcePaginatedSmallSerie>
	fetchSearchSerie(page: number, filters: FetchSearchSerieFilter): Promise<SourcePaginatedSmallSerie>
	fetchSerieDetail(serieId: SourceSerieId): Promise<SourceSerie>
	fetchSerieChapters(serieId: SourceSerieId): Promise<SourceChapters>
	fetchChapterData(serieId: SourceSerieId, chapterId: SourceSerieChapterId): Promise<SourceSerieChapterData>
}

// Config type for sources
export type SourceEnv = {
	ENABLED_LANGUAGE: SourceLanguage[]
	BYPARR_URL?: string
}
