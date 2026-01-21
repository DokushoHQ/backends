export function useDuplicateDetection() {
	const toast = useToast()

	const detecting = ref(false)
	const progress = ref(0)
	const jobId = ref<string | null>(null)

	let pollInterval: ReturnType<typeof setInterval> | null = null

	function startPolling() {
		if (pollInterval) return
		pollInterval = setInterval(pollJobStatus, 2000)
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval)
			pollInterval = null
		}
	}

	async function pollJobStatus() {
		if (!jobId.value) return

		try {
			const job = await $fetch(`/api/jobs/duplicateDetector/${jobId.value}`) as {
				id: string
				state: string
				progress: number | object | undefined
				failedReason?: string
			}

			if (typeof job.progress === "number") {
				progress.value = job.progress
			}
			else if (job.progress && typeof job.progress === "object" && "percent" in job.progress) {
				progress.value = (job.progress as { percent: number }).percent
			}

			if (job.state === "completed" || job.state === "failed") {
				stopPolling()
				detecting.value = false
				jobId.value = null

				if (job.state === "completed") {
					toast.add({
						title: "Detection complete",
						description: "Duplicate detection has finished",
						color: "success",
					})
					return { completed: true }
				}
				else {
					toast.add({
						title: "Detection failed",
						description: job.failedReason ?? "Unknown error",
						color: "error",
					})
					return { completed: false, error: job.failedReason }
				}
			}
		}
		catch (err: unknown) {
			const error = err as { statusCode?: number }
			if (error.statusCode === 404) {
				stopPolling()
				detecting.value = false
				jobId.value = null
			}
		}

		return { completed: false }
	}

	async function startDetection() {
		try {
			detecting.value = true
			progress.value = 0

			const result = await $fetch("/api/v1/duplicates/detect", {
				method: "POST",
				body: { forceRefresh: true },
			}) as { jobId: string }

			jobId.value = result.jobId
			startPolling()

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
			const status = await $fetch("/api/v1/duplicates/status") as {
				jobId: string | null
				progress: number | null
			}
			if (status.jobId) {
				jobId.value = status.jobId
				detecting.value = true
				progress.value = status.progress ?? 0
				startPolling()
				return true
			}
		}
		catch {
			// Ignore
		}
		return false
	}

	onUnmounted(() => {
		stopPolling()
	})

	return {
		detecting: readonly(detecting),
		progress: readonly(progress),
		jobId: readonly(jobId),
		startDetection,
		checkActiveJob,
		pollJobStatus,
	}
}
