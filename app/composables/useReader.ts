import { useQuery } from "@tanstack/vue-query"

type Page = {
	index: number
	type: string
	url: string | null
	content: string | null
}

type ReadingMode = "vertical" | "paged" | "double"
type ReadingDirection = "ltr" | "rtl"

type Spread = {
	pages: Page[]
}

const RTL_TYPES = new Set(["Manga", "Doujinshi"])

export function useReader(serieId: Ref<string>, chapterId: Ref<string>, serieType: Ref<string | undefined>) {
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

	// Layout derived from serie type
	const isVertical = computed(() => serieType.value === "Webtoon")
	const direction = computed<ReadingDirection>(() =>
		RTL_TYPES.has(serieType.value ?? "") ? "rtl" : "ltr",
	)

	// Mobile forces single page; desktop defaults to double
	const isMobile = useMediaQuery("(max-width: 768px)")
	const horizontalMode = useLocalStorage<"paged" | "double">("reader-horizontal-mode", "double")
	const mode = computed<ReadingMode>({
		get: () => {
			if (isVertical.value) return "vertical"
			if (isMobile.value) return "paged"
			return horizontalMode.value
		},
		set: (v: ReadingMode) => {
			if (v !== "vertical") horizontalMode.value = v as "paged" | "double"
		},
	})
	const currentPage = ref(0)

	// Reset page and cached state on chapter change
	watch(chapterId, () => {
		currentPage.value = 0
		imageDimensions.value = new Map()
		preloadedUrls.value = new Set()
	})

	// Translate position when switching between paged ↔ double
	watch(mode, (newMode, oldMode) => {
		if (newMode === "vertical" || oldMode === "vertical") {
			currentPage.value = 0
			return
		}
		if (oldMode === "paged" && newMode === "double") {
			// Find which spread contains the current individual page
			const target = currentPage.value
			let pageCount = 0
			for (let s = 0; s < spreads.value.length; s++) {
				pageCount += spreads.value[s]!.pages.length
				if (pageCount > target) {
					currentPage.value = s
					return
				}
			}
		}
		else if (oldMode === "double" && newMode === "paged") {
			// Find the first individual page index of the current spread
			let pageIndex = 0
			for (let s = 0; s < currentPage.value && s < spreads.value.length; s++) {
				pageIndex += spreads.value[s]!.pages.length
			}
			currentPage.value = pageIndex
		}
	})

	// Paged/double mode state
	const imagePages = computed(() => pages.value.filter(p => p.type === "image" && p.url))

	// Spread detection for double mode
	const imageDimensions = ref(new Map<number, { w: number, h: number }>())

	watch([imagePages, mode], ([imgs, m]) => {
		if (m !== "double") return
		for (const page of imgs) {
			if (page.url && !imageDimensions.value.has(page.index)) {
				const img = new Image()
				const pageIndex = page.index
				img.onload = () => {
					imageDimensions.value.set(pageIndex, { w: img.naturalWidth, h: img.naturalHeight })
					// Trigger reactivity
					imageDimensions.value = new Map(imageDimensions.value)
				}
				img.src = page.url
			}
		}
	}, { immediate: true })

	function isSpread(pageIndex: number): boolean {
		const dims = imageDimensions.value.get(pageIndex)
		if (!dims) return false
		return dims.w > dims.h * 1.2
	}

	const spreads = computed<Spread[]>(() => {
		const imgs = imagePages.value
		if (imgs.length === 0) return []

		const result: Spread[] = []
		let i = 0

		while (i < imgs.length) {
			const page = imgs[i]!
			if (isSpread(page.index)) {
				result.push({ pages: [page] })
				i++
			}
			else if (i + 1 < imgs.length) {
				const next = imgs[i + 1]!
				if (isSpread(next.index)) {
					// Current is normal but next is spread — current alone
					result.push({ pages: [page] })
					i++
				}
				else {
					result.push({ pages: [page, next] })
					i += 2
				}
			}
			else {
				result.push({ pages: [page] })
				i++
			}
		}

		return result
	})

	const totalPages = computed(() => {
		if (mode.value === "double") return spreads.value.length
		return imagePages.value.length
	})

	const currentSpreadPages = computed<Page[]>(() => {
		if (mode.value !== "double") return []
		return spreads.value[currentPage.value]?.pages ?? []
	})

	// 1-based page range for the current spread (for display counter)
	const currentSpreadPageRange = computed<{ start: number, end: number }>(() => {
		if (mode.value !== "double") return { start: 0, end: 0 }
		const spreadList = spreads.value
		let pageIndex = 0
		for (let s = 0; s < currentPage.value && s < spreadList.length; s++) {
			pageIndex += spreadList[s]!.pages.length
		}
		const spread = spreadList[currentPage.value]
		if (!spread) return { start: 0, end: 0 }
		return {
			start: pageIndex + 1,
			end: pageIndex + spread.pages.length,
		}
	})

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
		if (mode.value === "double") {
			// In double mode, preload from next N spreads
			const spreadList = spreads.value
			let preloaded = 0
			for (let s = startIndex; s < spreadList.length && preloaded < count; s++) {
				for (const page of spreadList[s]!.pages) {
					if (page.url && !preloadedUrls.value.has(page.url)) {
						const img = new Image()
						img.src = page.url
						preloadedUrls.value = new Set([...preloadedUrls.value, page.url])
					}
				}
				preloaded++
			}
		}
		else {
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
				if (mode.value === "paged" || mode.value === "double") {
					e.preventDefault()
					if (direction.value === "rtl") prevPage()
					else nextPage()
				}
				break
			case " ":
				if (mode.value === "paged" || mode.value === "double") {
					e.preventDefault()
					nextPage()
				}
				break
			case "ArrowLeft":
				if (mode.value === "paged" || mode.value === "double") {
					e.preventDefault()
					if (direction.value === "rtl") nextPage()
					else prevPage()
				}
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
		isVertical,
		isMobile,
		direction,
		currentPage,
		totalPages,
		spreads,
		currentSpreadPages,
		currentSpreadPageRange,
		goToPage,
		nextPage,
		prevPage,
		preloadImages,
		toggleFullscreen,
	}
}
