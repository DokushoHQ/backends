import { useQuery } from "@tanstack/vue-query"

type Page = {
	index: number
	type: string
	url: string | null
	content: string | null
}

type ReadingMode = "vertical" | "paged"

export function useReader(serieId: Ref<string>, chapterId: Ref<string>) {
	const orpc = useOrpc()

	const dataQuery = useQuery(computed(() =>
		orpc.chapter.getData.queryOptions({
			input: { serieId: serieId.value, chapterId: chapterId.value },
		}),
	))

	const navQuery = useQuery(computed(() =>
		orpc.chapter.getNavigation.queryOptions({
			input: { serieId: serieId.value, chapterId: chapterId.value },
		}),
	))

	const pages = computed<Page[]>(() => dataQuery.data.value?.pages ?? [])
	const loading = computed(() => dataQuery.isLoading.value || navQuery.isLoading.value)
	const error = computed(() => {
		const err = dataQuery.error.value || navQuery.error.value
		return err ? (err instanceof Error ? err.message : "Failed to load chapter") : null
	})
	const prevChapter = computed(() => navQuery.data.value?.prev ?? null)
	const nextChapter = computed(() => navQuery.data.value?.next ?? null)

	// Settings (persisted)
	const mode = useLocalStorage<ReadingMode>("reader-mode", "vertical")
	const currentPage = ref(0)

	// Reset page on chapter change
	watch(chapterId, () => {
		currentPage.value = 0
	})

	// Paged mode state
	const totalPages = computed(() => imagePages.value.length)
	const imagePages = computed(() => pages.value.filter(p => p.type === "image" && p.url))

	function goToPage(page: number) {
		if (page >= 0 && page < totalPages.value) {
			currentPage.value = page
		}
	}

	function nextPage() {
		if (currentPage.value < totalPages.value - 1) {
			goToPage(currentPage.value + 1)
		}
	}

	function prevPage() {
		if (currentPage.value > 0) {
			goToPage(currentPage.value - 1)
		}
	}

	// Image preloading
	const preloadedUrls = ref<Set<string>>(new Set())

	function preloadImages(startIndex: number, count: number = 3) {
		const imgs = imagePages.value
		for (let i = startIndex; i < Math.min(startIndex + count, imgs.length); i++) {
			const url = imgs[i]?.url
			if (url && !preloadedUrls.value.has(url)) {
				const img = new Image()
				img.src = url
				preloadedUrls.value = new Set([...preloadedUrls.value, url])
			}
		}
	}

	// Preload next pages when current page changes
	watch(currentPage, (page) => {
		preloadImages(page + 1)
	})

	// Keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

		switch (e.key) {
			case "ArrowRight":
			case " ":
				e.preventDefault()
				if (mode.value === "paged") nextPage()
				break
			case "ArrowLeft":
				e.preventDefault()
				if (mode.value === "paged") prevPage()
				break
			case "]":
				if (nextChapter.value) {
					navigateTo(`/read/${serieId.value}/${nextChapter.value.id}`)
				}
				break
			case "[":
				if (prevChapter.value) {
					navigateTo(`/read/${serieId.value}/${prevChapter.value.id}`)
				}
				break
			case "f":
			case "F":
				if (!e.ctrlKey && !e.metaKey) {
					e.preventDefault()
					toggleFullscreen()
				}
				break
		}
	}

	function toggleFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen()
		}
		else {
			document.documentElement.requestFullscreen()
		}
	}

	onMounted(() => {
		window.addEventListener("keydown", handleKeydown)
	})

	onUnmounted(() => {
		window.removeEventListener("keydown", handleKeydown)
	})

	return {
		pages,
		imagePages,
		loading,
		error,
		prevChapter,
		nextChapter,
		mode,
		currentPage,
		totalPages,
		goToPage,
		nextPage,
		prevPage,
		preloadImages,
		toggleFullscreen,
	}
}
