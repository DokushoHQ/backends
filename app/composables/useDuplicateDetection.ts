import { useQuery } from "@tanstack/vue-query"

type JobStatus = {
	id: string
	state: string
	progress: number | object | undefined
	failedReason?: string
}

export function useDuplicateDetection() {
	const toast = useToast()

	const detecting = ref(false)
	const progress = ref(0)
	const jobId = ref<string | null>(null)

	// Poll job status via useQuery when actively detecting
	const jobQuery = useQuery(computed(() => ({
		queryKey: ["duplicate-detection-job", jobId.value],
		queryFn: async (): Promise<JobStatus> => {
			const url: string = `/api/jobs/duplicateDetector/${jobId.value}`
			return apiFetch(url)
		},
		enabled: detecting.value && !!jobId.value,
		refetchInterval: 2000,
		retry: false,
	})))

	// React to job status updates
	watch(() => jobQuery.data.value, (job) => {
		if (!job) return

		if (typeof job.progress === "number") {
			progress.value = job.progress
		}
		else if (job.progress && typeof job.progress === "object" && "percent" in job.progress) {
			progress.value = (job.progress as { percent: number }).percent
		}

		if (job.state === "completed" || job.state === "failed") {
			detecting.value = false
			jobId.value = null

			if (job.state === "completed") {
				toast.add({
					title: "Detection complete",
					description: "Duplicate detection has finished",
					color: "success",
				})
			}
			else {
				toast.add({
					title: "Detection failed",
					description: job.failedReason ?? "Unknown error",
					color: "error",
				})
			}
		}
	})

	// Stop on 404 (job expired/removed)
	watch(() => jobQuery.error.value, (err) => {
		if (!err) return
		const fetchErr = err as { statusCode?: number }
		if (fetchErr.statusCode === 404) {
			detecting.value = false
			jobId.value = null
		}
	})

	async function startDetection() {
		try {
			detecting.value = true
			progress.value = 0

			const url: string = "/api/v1/duplicates/detect"
			const result = await apiFetch(url, {
				method: "POST",
				body: { forceRefresh: true },
			}) as { jobId: string }

			jobId.value = result.jobId

			toast.add({
				title: "Detection started",
				description: "Scanning for duplicate series...",
				color: "success",
			})

			return true
		}
		catch (err: unknown) {
			detecting.value = false
			const error = err as { data?: { message?: string } }
			toast.add({
				title: "Detection failed",
				description: error.data?.message ?? "Unknown error",
				color: "error",
			})
			return false
		}
	}

	async function checkActiveJob() {
		try {
			const url: string = "/api/v1/duplicates/status"
			const status = await apiFetch(url) as {
				jobId: string | null
				progress: number | null
			}
			if (status.jobId) {
				jobId.value = status.jobId
				detecting.value = true
				progress.value = status.progress ?? 0
				return true
			}
		}
		catch {
			// Ignore
		}
		return false
	}

	return {
		detecting: readonly(detecting),
		progress: readonly(progress),
		startDetection,
		checkActiveJob,
	}
}
