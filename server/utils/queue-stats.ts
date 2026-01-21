import type { Job, Queue } from "bullmq"
import backupParserQueue, {
	DISPLAY_NAME as BACKUP_PARSER_DISPLAY,
	QUEUE_NAME as BACKUP_PARSER_NAME,
} from "../queues/backup-parser"
import duplicateDetectorQueue, {
	DISPLAY_NAME as DUPLICATE_DETECTOR_DISPLAY,
	QUEUE_NAME as DUPLICATE_DETECTOR_NAME,
} from "../queues/duplicate-detector"
import duplicateMergeQueue, {
	DISPLAY_NAME as DUPLICATE_MERGE_DISPLAY,
	QUEUE_NAME as DUPLICATE_MERGE_NAME,
} from "../queues/duplicate-merge"
import chapterDataQueue, {
	DISPLAY_NAME as CHAPTER_DATA_DISPLAY,
	QUEUE_NAME as CHAPTER_DATA_NAME,
} from "../queues/chapter-data"
import coverUpdateQueue, {
	DISPLAY_NAME as COVER_UPDATE_DISPLAY,
	QUEUE_NAME as COVER_UPDATE_NAME,
} from "../queues/cover-update"
import deleteSerieQueue, {
	DISPLAY_NAME as DELETE_SERIE_DISPLAY,
	QUEUE_NAME as DELETE_SERIE_NAME,
} from "../queues/delete-serie"
import emailQueue, {
	DISPLAY_NAME as EMAIL_DISPLAY,
	QUEUE_NAME as EMAIL_NAME,
} from "../queues/email"
import indexerQueue, {
	DISPLAY_NAME as INDEXER_DISPLAY,
	QUEUE_NAME as INDEXER_NAME,
} from "../queues/indexer"
import pageRetryQueue, {
	DISPLAY_NAME as PAGE_RETRY_DISPLAY,
	QUEUE_NAME as PAGE_RETRY_NAME,
} from "../queues/page-retry"
import serieInserterQueue, {
	DISPLAY_NAME as SERIE_INSERTER_DISPLAY,
	QUEUE_NAME as SERIE_INSERTER_NAME,
} from "../queues/serie-inserter"
import updateSchedulerQueue, {
	DISPLAY_NAME as UPDATE_SCHEDULER_DISPLAY,
	QUEUE_NAME as UPDATE_SCHEDULER_NAME,
} from "../queues/update-scheduler"

const queues = {
	serieInserter: serieInserterQueue,
	chapterData: chapterDataQueue,
	coverUpdate: coverUpdateQueue,
	indexer: indexerQueue,
	updateScheduler: updateSchedulerQueue,
	deleteSerie: deleteSerieQueue,
	email: emailQueue,
	pageRetry: pageRetryQueue,
	backupParser: backupParserQueue,
	duplicateDetector: duplicateDetectorQueue,
	duplicateMerge: duplicateMergeQueue,
}

export type QueueName = keyof typeof queues

export type JobStatus
	= | "active"
		| "waiting"
		| "completed"
		| "failed"
		| "delayed"
		| "paused"

export const queueConfig: Record<
	QueueName,
	{ name: string, displayName: string }
> = {
	serieInserter: { name: SERIE_INSERTER_NAME, displayName: SERIE_INSERTER_DISPLAY },
	chapterData: { name: CHAPTER_DATA_NAME, displayName: CHAPTER_DATA_DISPLAY },
	coverUpdate: { name: COVER_UPDATE_NAME, displayName: COVER_UPDATE_DISPLAY },
	indexer: { name: INDEXER_NAME, displayName: INDEXER_DISPLAY },
	updateScheduler: { name: UPDATE_SCHEDULER_NAME, displayName: UPDATE_SCHEDULER_DISPLAY },
	deleteSerie: { name: DELETE_SERIE_NAME, displayName: DELETE_SERIE_DISPLAY },
	email: { name: EMAIL_NAME, displayName: EMAIL_DISPLAY },
	pageRetry: { name: PAGE_RETRY_NAME, displayName: PAGE_RETRY_DISPLAY },
	backupParser: { name: BACKUP_PARSER_NAME, displayName: BACKUP_PARSER_DISPLAY },
	duplicateDetector: { name: DUPLICATE_DETECTOR_NAME, displayName: DUPLICATE_DETECTOR_DISPLAY },
	duplicateMerge: { name: DUPLICATE_MERGE_NAME, displayName: DUPLICATE_MERGE_DISPLAY },
}

export const allQueueNames = Object.keys(queueConfig) as QueueName[]

export function isValidQueueName(name: string): name is QueueName {
	return name in queueConfig
}

export function getQueue(name: QueueName): Queue {
	return queues[name]
}

export async function getQueueStats(name: QueueName) {
	const queue = queues[name]
	const [counts, paused] = await Promise.all([
		queue.getJobCounts("waiting", "prioritized", "active", "completed", "failed", "delayed", "waiting-children"),
		queue.isPaused(),
	])

	// Combine all "waiting" type states for display
	const waiting = counts.waiting
	const prioritized = counts.prioritized
	const waitingChildren = counts["waiting-children"]

	return {
		name,
		displayName: queueConfig[name].displayName,
		waiting,
		prioritized,
		waitingChildren,
		active: counts.active,
		completed: counts.completed,
		failed: counts.failed,
		delayed: counts.delayed,
		paused,
		total: waiting + prioritized + waitingChildren + counts.active + counts.completed + counts.failed + counts.delayed,
	}
}

export async function getAllQueueStats() {
	return Promise.all(allQueueNames.map(getQueueStats))
}

export async function getJobs(
	name: QueueName,
	status: JobStatus | "latest",
	start = 0,
	end = 19,
): Promise<Job[]> {
	const queue = queues[name]

	switch (status) {
		case "completed":
			return queue.getCompleted(start, end)
		case "failed":
			return queue.getFailed(start, end)
		case "active":
			return queue.getActive(start, end)
		case "waiting":
			return queue.getJobs(["prioritized", "waiting", "waiting-children"], start, end)
		case "delayed":
			return queue.getDelayed(start, end)
		case "paused":
			return queue.getJobs(["waiting", "prioritized", "paused"], start, end)
		case "latest":
			return queue.getJobs(
				["active", "failed", "completed", "waiting", "prioritized", "delayed", "waiting-children"],
				start,
				end,
			)
	}
}

export async function getJobById(
	name: QueueName,
	jobId: string,
): Promise<Job | undefined> {
	const queue = queues[name]
	return queue.getJob(jobId)
}

export async function getJobLogs(
	name: QueueName,
	jobId: string,
): Promise<{ logs: string[], count: number }> {
	const queue = queues[name]
	return queue.getJobLogs(jobId)
}

export interface SerializedJob {
	id: string
	name: string
	data: Record<string, unknown>
	opts: Record<string, unknown>
	progress: number | string | object
	attemptsMade: number
	processedOn?: number
	finishedOn?: number
	timestamp: number
	failedReason?: string
	stacktrace?: string[]
	returnvalue?: unknown
	logs?: string[]
	delay?: number
	scheduledAt?: number
	state?: string
}

export async function serializeJob(job: Job, logs?: string[]): Promise<SerializedJob> {
	const delay = job.opts?.delay
	const scheduledAt
		= delay && job.timestamp ? job.timestamp + delay : undefined
	const state = await job.getState()

	return {
		id: job.id ?? "unknown",
		name: job.name ?? "unnamed",
		data: (job.data as Record<string, unknown>) ?? {},
		opts: (job.opts as Record<string, unknown>) ?? {},
		progress: (job.progress as number | string | object) ?? 0,
		attemptsMade: job.attemptsMade ?? 0,
		processedOn: job.processedOn,
		finishedOn: job.finishedOn,
		timestamp: job.timestamp ?? Date.now(),
		failedReason: job.failedReason,
		stacktrace: job.stacktrace,
		returnvalue: job.returnvalue,
		logs,
		delay,
		scheduledAt,
		state,
	}
}

export async function serializeJobWithLogs(
	name: QueueName,
	job: Job,
): Promise<SerializedJob> {
	let logs: string[] = []
	try {
		if (job.id) {
			const result = await getJobLogs(name, job.id)
			logs = result.logs
		}
	}
	catch {
		// Logs might not be available for some job types
	}
	return serializeJob(job, logs)
}

export async function removeJob(
	name: QueueName,
	jobId: string,
): Promise<boolean> {
	const queue = queues[name]
	const job = await queue.getJob(jobId)
	if (job) {
		await job.remove()
		return true
	}
	return false
}

export async function pauseQueue(name: QueueName): Promise<void> {
	const queue = queues[name]
	await queue.pause()
}

export async function resumeQueue(name: QueueName): Promise<void> {
	const queue = queues[name]
	await queue.resume()
}
