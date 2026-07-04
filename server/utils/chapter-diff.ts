import type { Language } from "./db"

/** Incoming chapter from a source, already resolved to DB-ready values.
 * Optional fields left `undefined` mean "not provided by the source" and are
 * neither compared nor written (same semantics as the previous upsert spread). */
export type IncomingChapter = {
	external_id: string
	title: string | null
	chapter_number: number
	date_upload: Date
	language: Language
	external_url?: string
	volume_name?: string | null
	volume_number?: number | null
	group_ids: string[]
}

/** Existing chapter row, restricted to the fields used for comparison */
export type ExistingChapterForDiff = {
	id: string
	external_id: string
	title: string | null
	chapter_number: number
	date_upload: Date
	external_url: string | null
	volume_name: string | null
	volume_number: number | null
	source_removed_at: Date | null
	source_removal_acknowledged_at: Date | null
	group_ids: string[]
}

export type ChapterUpdate = {
	existing: ExistingChapterForDiff
	incoming: IncomingChapter
	groups_changed: boolean
}

export type ChapterDiffResult = {
	to_create: IncomingChapter[]
	to_update: ChapterUpdate[]
}

function sameGroups(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false
	const set = new Set(b)
	return a.every(id => set.has(id))
}

/**
 * Compare incoming source chapters with existing DB rows and return only the
 * work to perform. Unchanged chapters produce no writes at all, which keeps
 * the serie-inserter transaction O(changes) instead of O(chapters).
 */
export function diffChapters(
	incoming: IncomingChapter[],
	existing: ExistingChapterForDiff[],
): ChapterDiffResult {
	const existingMap = new Map(existing.map(c => [c.external_id, c]))
	const seen = new Set<string>()
	const to_create: IncomingChapter[] = []
	const to_update: ChapterUpdate[] = []

	for (const c of incoming) {
		if (seen.has(c.external_id)) continue
		seen.add(c.external_id)

		const current = existingMap.get(c.external_id)
		if (!current) {
			to_create.push(c)
			continue
		}

		const groups_changed = !sameGroups(c.group_ids, current.group_ids)
		const fields_changed
			= current.chapter_number !== c.chapter_number
				|| current.date_upload.getTime() !== c.date_upload.getTime()
				|| current.title !== c.title
				|| current.source_removed_at !== null
				|| current.source_removal_acknowledged_at !== null
				|| (c.external_url !== undefined && current.external_url !== c.external_url)
				|| (c.volume_name !== undefined && current.volume_name !== c.volume_name)
				|| (c.volume_number !== undefined && current.volume_number !== c.volume_number)

		if (fields_changed || groups_changed) {
			to_update.push({ existing: current, incoming: c, groups_changed })
		}
	}

	return { to_create, to_update }
}
