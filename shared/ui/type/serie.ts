// Multi-language data structure for UI (avoids conflict with server MultiLanguage)
export interface UIMultiLanguage {
	[lang: string]: string[]
}

// Serie type for MetadataEditor component
export interface UISerie {
	id: string
	title: string
	synopsis: string | null
	cover: string | null
	locked_fields: string[] | null
	sources: UISerieSource[]
}

// SerieSource for MetadataEditor (with multi-language fields)
export interface UISerieSource {
	id: string
	title: UIMultiLanguage | null
	alternates_titles: UIMultiLanguage | null
	synopsis: UIMultiLanguage | null
	cover: string | null
	is_primary: boolean
	source: { external_id: string, name: string }
}
