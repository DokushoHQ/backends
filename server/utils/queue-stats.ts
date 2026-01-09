import type { Job, Queue } from "bullmq"
import chapterDataQueue, {
	QUEUE_NAME as CHAPTER_DATA_NAME,
	DISPLAY_NAME as CHAPTER_DATA_DISPLAY,
} from "../queues/chapter-data"
import coverUpdateQueue, {
	QUEUE_NAME as COVER_UPDATE_NAME,
	DISPLAY_NAME as COVER_UPDATE_DISPLAY,
} from "../queues/cover-update"
import deleteSerieQueue, {
	QUEUE_NAME as DELETE_SERIE_NAME,
	DISPLAY_NAME as DELETE_SERIE_DISPLAY,
} from "../queues/delete-serie"
import emailQueue, {
	QUEUE_NAME as EMAIL_NAME,
	DISPLAY_NAME as EMAIL_DISPLAY,
} from "../queues/email"
import indexerQueue, {
	QUEUE_NAME as INDEXER_NAME,
	DISPLAY_NAME as INDEXER_DISPLAY,
} from "../queues/indexer"
import serieInserterQueue, {
	QUEUE_NAME as SERIE_INSERTER_NAME,
	DISPLAY_NAME as SERIE_INSERTER_DISPLAY,
} from "../queues/serie-inserter"
import updateSchedulerQueue, {
	QUEUE_NAME as UPDATE_SCHEDULER_NAME,
	DISPLAY_NAME as UPDATE_SCHEDULER_DISPLAY,
} from "../queues/update-scheduler"

const queues = {
	serieInserter: serieInserterQueue,
	chapterData: chapterDataQueue,
	coverUpdate: coverUpdateQueue,
	indexer: indexerQueue,
	updateScheduler: updateSchedulerQueue,
	deleteSerie: deleteSerieQueue,
	email: emailQueue,
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
	const [waiting, active, completed, failed, delayed, paused]
		= await Promise.all([
			queue.getWaitingCount(),
			queue.getActiveCount(),
			queue.getCompletedCount(),
			queue.getFailedCount(),
			queue.getDelayedCount(),
			queue.isPaused(),
		])

	return {
		name,
		displayName: queueConfig[name].displayName,
		waiting,
		active,
		completed,
		failed,
		delayed,
		paused,
		total: waiting + active + completed + failed + delayed,
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
			return queue.getWaiting(start, end)
		case "delayed":
			return queue.getDelayed(start, end)
		case "paused":
			return queue.getWaiting(start, end)
		case "latest":
			return queue.getJobs(
				["completed", "failed", "active", "waiting", "delayed"],
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
}

export function serializeJob(job: Job, logs?: string[]): SerializedJob {
	const delay = job.opts?.delay
	const scheduledAt
		= delay && job.timestamp ? job.timestamp + delay : undefined

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
