import { defineWorker } from "#processor"
import { MetricsTime } from "bullmq"
import type { UpdateSchedulerJobData } from "../queues/update-scheduler"
import { QUEUE_NAME, updateSchedulerJobDataSchema } from "../queues/update-scheduler"
import {
	handleFetchLatestTask,
	handleRecomputeAllTask,
	handleRefreshAllTask,
	handleRetryFailedPagesTask,
} from "../utils/workers/update-scheduler-tasks"

export default defineWorker<typeof QUEUE_NAME, UpdateSchedulerJobData, undefined>({
	name: QUEUE_NAME,
	options: {
		concurrency: 1,
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job) {
		const data = updateSchedulerJobDataSchema.parse(job.data)

		if (data.type === "FETCH_LATEST") {
			await handleFetchLatestTask(job, data.sourceId)
		}
		else if (data.type === "REFRESH_ALL") {
			await handleRefreshAllTask(job)
		}
		else if (data.type === "RETRY_FAILED_PAGES") {
			await handleRetryFailedPagesTask(job)
		}
		else if (data.type === "RECOMPUTE_ALL") {
			await handleRecomputeAllTask(job)
		}
	},
})
