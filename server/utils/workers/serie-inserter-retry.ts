import { DelayedError, type Job } from "bullmq"
import type { SerieInserterJobData } from "../../queues/serie-inserter"
import {
	getCacheRetryDelayLabel,
	getCacheRetryDelayMs,
	MAX_CACHE_RETRIES,
} from "./cache-retry"

type MaybeDelayForCacheRetryParams = {
	job: Job<SerieInserterJobData>
	token: string | undefined
	hasNewChapters: boolean
	hasExistingSerieSource: boolean
	log: (msg: string) => void
}

export async function maybeDelayForCacheRetry({
	job,
	token,
	hasNewChapters,
	hasExistingSerieSource,
	log,
}: MaybeDelayForCacheRetryParams): Promise<void> {
	if (hasNewChapters || !job.data.expect_new_chapters || !hasExistingSerieSource) {
		return
	}

	const retryAttempt = job.data.cache_retry_attempt ?? 0
	if (retryAttempt >= MAX_CACHE_RETRIES) {
		log(`No new chapters after ${MAX_CACHE_RETRIES} cache retries`)
		return
	}

	const delayMs = getCacheRetryDelayMs(retryAttempt)
	const delayDesc = getCacheRetryDelayLabel(retryAttempt)
	log(`No new chapters found but expected (source cache issue?). Retry ${retryAttempt + 1}/${MAX_CACHE_RETRIES} in ${delayDesc}`)

	await job.updateData({
		...job.data,
		cache_retry_attempt: retryAttempt + 1,
	})
	await job.moveToDelayed(Date.now() + delayMs, token)

	throw new DelayedError()
}
