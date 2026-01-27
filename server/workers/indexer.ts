import { defineWorker } from "#processor"
import { MetricsTime, type Job } from "bullmq"
import type { IndexerJobData } from "../queues/indexer"
import { QUEUE_NAME, indexerJobDataSchema } from "../queues/indexer"
import { db } from "../utils/db"
import { serieIndex } from "../utils/meilisearch"
import type { SerieField } from "../utils/serie"
import { getMultiLanguageValues, resolveMultiLanguage } from "../utils/serie"
import { SourceLanguage, type MultiLanguage } from "../utils/sources/core"

async function processUpdate(job: Job<IndexerJobData>, serieId: string) {
	job.log(`Indexing serie ${serieId}`)

	// 1. Load serie with all sources and relations
	const serie = await db.serie.findUnique({
		where: { id: serieId },
		include: {
			sources: {
				orderBy: { is_primary: "desc" },
				include: { source: { select: { name: true, id: true } } },
			},
			genres: { select: { title: true } },
			authors: { select: { name: true } },
			artists: { select: { name: true } },
			chapters: {
				where: { enabled: true },
				select: { language: true },
				distinct: ["language"],
			},
			_count: { select: { chapters: { where: { enabled: true } } } },
			// Chapter availability data for cross-source deduplication
			chapter_availability: {
				select: {
					language: true,
					missing_count: true,
					available_count: true,
					ready_count: true,
				},
			},
		},
	})

	if (!serie || serie.sources.length === 0) {
		// No sources, remove from index
		job.log("No sources found, removing from index")
		await serieIndex.deleteDocument(serieId)
		return
	}

	// Query max date_upload per language for language-specific sorting
	// Using date_upload (when chapter was released) rather than created_at (when we imported it)
	const chapterDatesByLanguage = await db.chapter.groupBy({
		by: ["language"],
		where: { serie_id: serieId, enabled: true },
		_max: { date_upload: true },
	})

	const primarySource = serie.sources[0]
	if (!primarySource) {
		job.log("No primary source found, removing from index")
		await serieIndex.deleteDocument(serieId)
		return
	}

	await job.updateProgress(30)

	const lockedFields = new Set(serie.locked_fields as SerieField[])

	// 2. Build updates for non-locked fields
	const updates: {
		title?: string
		synopsis?: string | null
		status?: typeof serie.status
		type?: typeof serie.type
		cover?: string | null
	} = {}

	if (!lockedFields.has("title")) {
		updates.title = resolveMultiLanguage(primarySource.title as MultiLanguage)
	}
	if (!lockedFields.has("synopsis")) {
		const synopsis = resolveMultiLanguage(primarySource.synopsis as MultiLanguage | null, "")
		updates.synopsis = synopsis || null
	}
	if (!lockedFields.has("status")) {
		updates.status = primarySource.status
	}
	if (!lockedFields.has("type")) {
		updates.type = primarySource.type
	}

	// Cover logic:
	// - If locked with custom_cover: use custom_cover
	// - If locked without custom_cover: don't change
	// - If not locked: use primary source's S3 URL
	if (lockedFields.has("cover")) {
		if (serie.custom_cover) {
			updates.cover = serie.custom_cover
		}
		// else: locked but no custom_cover = don't update, keep existing
	}
	else {
		// Use S3 URL from primary source (set by Cover Update worker)
		// Fallback to source URL if S3 not yet processed
		updates.cover = primarySource.cover ?? primarySource.cover_source_url
	}

	await job.updateProgress(50)

	// 3. Update PostgreSQL
	const updated = await db.serie.update({
		where: { id: serieId },
		data: {
			...updates,
			refreshed_at: new Date(),
		},
	})

	await job.updateProgress(70)

	// 4. Build language-specific search data from all sources
	const languages = Object.keys(SourceLanguage) as (keyof typeof SourceLanguage)[]
	const titlesByLang: Record<string, string[]> = {}
	const synopsesByLang: Record<string, string[]> = {}
	const alternatesByLang: Record<string, string[]> = {}

	for (const source of serie.sources) {
		for (const lang of languages) {
			const titles = getMultiLanguageValues(source.title as MultiLanguage, lang)
			const synopses = getMultiLanguageValues(source.synopsis as MultiLanguage | null, lang)
			const alternates = getMultiLanguageValues(source.alternates_titles as MultiLanguage | null, lang)

			titlesByLang[lang] = [...(titlesByLang[lang] ?? []), ...titles]
			synopsesByLang[lang] = [...(synopsesByLang[lang] ?? []), ...synopses]
			alternatesByLang[lang] = [...(alternatesByLang[lang] ?? []), ...alternates]
		}
	}

	// Deduplicate and build flat fields for Meilisearch
	const flatFields: Record<string, string[]> = {}
	for (const lang of languages) {
		const titles = [...new Set(titlesByLang[lang] ?? [])]
		const synopses = [...new Set(synopsesByLang[lang] ?? [])]
		const alternates = [...new Set(alternatesByLang[lang] ?? [])]

		if (titles.length) flatFields[`title_${lang}`] = titles
		if (synopses.length) flatFields[`synopsis_${lang}`] = synopses
		if (alternates.length) flatFields[`alternates_titles_${lang}`] = alternates
	}

	// 5. Calculate chapter availability stats
	const totalMissingChapters = serie.chapter_availability.reduce((sum, a) => sum + a.missing_count, 0)
	const totalReadyChapters = serie.chapter_availability.reduce((sum, a) => sum + a.ready_count, 0)
	const languagesWithGaps = serie.chapter_availability
		.filter(a => a.missing_count > 0)
		.map(a => a.language)

	// 6. Build language-specific updated_at timestamps (e.g., En_updated_at, Fr_updated_at)
	const languageUpdatedAt: Record<string, number> = {}
	for (const { language, _max } of chapterDatesByLanguage) {
		if (_max.date_upload) {
			languageUpdatedAt[`${language}_updated_at`] = _max.date_upload.getTime()
		}
	}

	// 7. Update Meilisearch
	await serieIndex.updateDocuments(
		[
			{
				id: updated.id,
				// Resolved display values (includes custom locked values)
				title: updated.title,
				synopsis: updated.synopsis ?? undefined,
				// Language-specific search fields
				...flatFields,
				// Metadata
				artists: serie.artists.map(a => a.name),
				authors: serie.authors.map(a => a.name),
				genres: serie.genres.map(g => g.title),
				sources: serie.sources.map(s => s.source.name),
				status: updated.status,
				type: updated.type,
				poster: updated.cover ?? "",
				// Source info
				external_ids: serie.sources.map(s => s.external_id),
				source_ids: serie.sources.map(s => s.source.id),
				// Sorting and filtering
				updated_at: updated.updated_at.getTime(),
				...languageUpdatedAt, // Language-specific timestamps (e.g., En_updated_at)
				soft_deleted: serie.soft_deleted_at !== null,
				chapter_count: serie._count.chapters,
				languages_available: serie.chapters.map(c => c.language),
				// Chapter availability (cross-source deduplication)
				// has_unfilled_gaps: gaps exist that aren't covered by ready secondary chapters
				// gaps_all_filled: all gaps are covered by ready secondary chapters
				has_missing_chapters: totalMissingChapters > 0,
				has_unfilled_gaps: totalMissingChapters > totalReadyChapters,
				gaps_all_filled: totalMissingChapters > 0 && totalReadyChapters >= totalMissingChapters,
				total_missing_chapters: totalMissingChapters,
				total_fillable_chapters: totalReadyChapters,
				languages_with_gaps: languagesWithGaps,
			},
		],
		{ primaryKey: "id" },
	)

	await job.updateProgress(100)
	job.log(`Serie indexed successfully: ${updated.title}`)
}

async function processDelete(job: Job<IndexerJobData>, serieId: string) {
	job.log(`Deleting serie ${serieId} from index`)
	await serieIndex.deleteDocument(serieId)
	await job.updateProgress(100)
	job.log("Serie removed from index")
}

export default defineWorker<typeof QUEUE_NAME, IndexerJobData, undefined>({
	name: QUEUE_NAME,
	options: {
		concurrency: 100,
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job) {
		const { serie_id, type } = indexerJobDataSchema.parse(job.data)

		await job.updateProgress(10)

		if (type === "DELETE") {
			await processDelete(job, serie_id)
		}
		else if (type === "UPDATE") {
			await processUpdate(job, serie_id)
		}
	},
})
