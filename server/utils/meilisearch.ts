import { type Index, Meilisearch } from "meilisearch"
import type { Language, SerieStatus, SerieType } from "./db"

export type FlattenPrefix = "synopsis" | "title" | "alternates_titles"
export type FlattenRow = `${FlattenPrefix}_${Language}`
export type FlattenData = Partial<Record<FlattenRow, string[]>>

export type SerieIndex = {
	id: string
	external_id: string
	source_id: string
	status: SerieStatus[]
	type: SerieType
	authors: string[]
	artists: string[]
	genres: string[]
	poster: string
} & FlattenData

let _meilisearch: Meilisearch | null = null
let _serieIndex: Index<SerieIndex> | null = null

export function getMeilisearch() {
	if (!_meilisearch) {
		const config = useRuntimeConfig()
		_meilisearch = new Meilisearch({
			host: config.meiliHost,
			apiKey: config.meiliMasterKey,
		})
	}
	return _meilisearch
}

export function getSerieIndex() {
	if (!_serieIndex) {
		_serieIndex = getMeilisearch().index<SerieIndex>("series")
	}
	return _serieIndex
}

// Lazy proxy for backwards compatibility
export const serieIndex = new Proxy({} as Index<SerieIndex>, {
	get(_target, prop: string | symbol) {
		const index = getSerieIndex()
		const value = index[prop as keyof Index<SerieIndex>]
		if (typeof value === "function") {
			return value.bind(index)
		}
		return value
	},
})
