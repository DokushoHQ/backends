import { defineWorker } from "#processor"
import { MetricsTime } from "bullmq"
import type { ChapterDedupJobData, ChapterDedupJobResult } from "../queues/chapter-dedup"
import { chapterDedupJobDataSchema, QUEUE_NAME } from "../queues/chapter-dedup"
import { dedupSameSourceChapters, deduplicateForLanguage, persistDedupResults, persistSameSourceDedupResults } from "../utils/chapter-dedup"
import type { Language } from "../utils/db"
import { db } from "../utils/db"

const config = useRuntimeConfig()

export default defineWorker<typeof QUEUE_NAME, ChapterDedupJobData, ChapterDedupJobResult>({
	name: QUEUE_NAME,
	options: {
		concurrency: 10,
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job) {
		const log = (msg: string) => job.log(`[Attempt ${job.attemptsMade + 1}] ${msg}`)
		const { serie_id, languages } = chapterDedupJobDataSchema.parse(job.data)

		log(`Starting chapter deduplication for serie ${serie_id}`)
		await job.updateProgress(5)

		// Load serie with sources and their priorities
		const serie = await db.serie.findUnique({
			where: { id: serie_id },
			include: {
				sources: {
					select: {
						source_id: true,
						is_primary: true,
						priority: true,
						source: { select: { priority: true } },
					},
					orderBy: { is_primary: "desc" },
				},
				chapters: {
					select: { language: true },
					distinct: ["language"],
				},
			},
		})

		if (!serie) {
			throw new Error(`Serie ${serie_id} not found`)
		}

		if (serie.sources.length === 0) {
			log("Serie has no sources, skipping deduplication")
			return {
				serie_id,
				languages_processed: [],
				total_missing: 0,
				total_available: 0,
				total_ready: 0,
				chapters_enabled: 0,
				chapters_disabled: 0,
			}
		}

		// Determine which languages to process
		const availableLanguages = [...new Set(serie.chapters.map(c => c.language))]
		const languagesToProcess: Language[] = languages && languages.length > 0
			? (languages as Language[]).filter(lang => availableLanguages.includes(lang))
			: availableLanguages

		if (languagesToProcess.length === 0) {
			log("No languages to process")
			return {
				serie_id,
				languages_processed: [],
				total_missing: 0,
				total_available: 0,
				total_ready: 0,
				chapters_enabled: 0,
				chapters_disabled: 0,
			}
		}

		log(`Processing ${languagesToProcess.length} languages: ${languagesToProcess.join(", ")}`)
		await job.updateProgress(10)

		// Transform sources to include priority info
		const sourcesWithPriority = serie.sources.map(s => ({
			source_id: s.source_id,
			is_primary: s.is_primary,
			priority: s.priority,
			source_priority: s.source.priority,
		}))

		let totalMissing = 0
		let totalAvailable = 0
		let totalReady = 0
		let totalEnabled = 0
		let totalDisabled = 0

		// Phase 1: Cross-source deduplication
		log("Phase 1: Cross-source deduplication")
		for (let i = 0; i < languagesToProcess.length; i++) {
			const language = languagesToProcess[i]!
			log(`Processing language ${language} (${i + 1}/${languagesToProcess.length})`)

			// Run deduplication logic
			const result = await deduplicateForLanguage(
				serie_id,
				language,
				sourcesWithPriority,
				log,
				config.subChapterThreshold,
			)

			// Persist results to database
			const { enabled, disabled } = await persistDedupResults(serie_id, language, result)

			totalMissing += result.stats.missing_count
			totalAvailable += result.stats.available_count
			totalReady += result.stats.ready_count
			totalEnabled += enabled
			totalDisabled += disabled

			// Update progress (Phase 1: 10-50%)
			const progress = 10 + Math.floor(((i + 1) / languagesToProcess.length) * 40)
			await job.updateProgress(progress)
		}

		// Phase 2: Same-source deduplication (multiple uploads from different groups)
		// Only process the PRIMARY source - secondary source chapters stay disabled
		// (cross-source dedup already handles which secondary chapters to enable for gaps)
		log("Phase 2: Same-source deduplication (primary source only)")
		let sameSourceDuplicatesProcessed = 0
		let sameSourceEnabled = 0
		let sameSourceDisabled = 0

		const primarySource = serie.sources.find(s => s.is_primary)
		if (primarySource) {
			for (const language of languagesToProcess) {
				log(`Same-source dedup: primary source ${primarySource.source_id}, language ${language}`)

				const result = await dedupSameSourceChapters(serie_id, primarySource.source_id, language, log)
				const { enabled, disabled } = await persistSameSourceDedupResults(result)

				sameSourceDuplicatesProcessed += result.duplicates_processed
				sameSourceEnabled += enabled
				sameSourceDisabled += disabled

				// Update progress (Phase 2: 50-95%)
				const progress = 50 + Math.floor(((languagesToProcess.indexOf(language) + 1) / languagesToProcess.length) * 45)
				await job.updateProgress(progress)
			}
		}
		else {
			log("No primary source found, skipping same-source dedup")
		}

		await job.updateProgress(100)
		log(`Deduplication complete:`)
		log(`  Cross-source: ${totalMissing} missing, ${totalAvailable} available, ${totalReady} ready, +${totalEnabled} enabled, -${totalDisabled} disabled`)
		log(`  Same-source: ${sameSourceDuplicatesProcessed} duplicates processed, +${sameSourceEnabled} enabled, -${sameSourceDisabled} disabled`)

		return {
			serie_id,
			languages_processed: languagesToProcess,
			total_missing: totalMissing,
			total_available: totalAvailable,
			total_ready: totalReady,
			chapters_enabled: totalEnabled,
			chapters_disabled: totalDisabled,
			same_source_duplicates_processed: sameSourceDuplicatesProcessed,
			same_source_enabled: sameSourceEnabled,
			same_source_disabled: sameSourceDisabled,
		}
	},
})
