import { useQuery } from "@tanstack/vue-query"

type Page = {
	index: number
	type: string
	url: string | null
	content: string | null
}

type ReadingMode = "vertical" | "paged" | "double"
type ReadingDirection = "ltr" | "rtl"
type HorizontalReadingMode = "paged" | "double"

type Spread = {
	pages: Page[]
}

const RTL_TYPES = new Set(["Manga", "Doujinshi"])
const VERTICAL_TYPES = new Set(["Webtoon", "Manhwa"])

export function useReader(serieId: Ref<string>, chapterId: Ref<string>, serieType: Ref<string | undefined>) {
	const orpc = useOrpc()
	const route = useRoute()
	const toast = useToast()

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
	const isVertical = computed(() => VERTICAL_TYPES.has(serieType.value ?? ""))
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
	function routeQueryValue(queryValue: string | string[] | null | undefined) {
		return Array.isArray(queryValue) ? queryValue[0] : queryValue
	}

	function routeWantsLastPage() {
		return routeQueryValue(route.query.at) === "last"
	}

	function routeRequestedPage(): number | null {
		const value = routeQueryValue(route.query.page)
		if (!value) return null
		const parsed = Number(value)
		if (!Number.isFinite(parsed) || parsed < 1) return null
		return Math.floor(parsed)
	}

	const initialWantsLast = routeWantsLastPage()
	const pendingStartAtLast = ref(initialWantsLast)
	const pendingStartPage = ref<number | null>(initialWantsLast ? null : routeRequestedPage())
	const chapterBoundaryNavigationInProgress = ref(false)
	const pendingModeTranslation = ref<{
		from: HorizontalReadingMode
		to: HorizontalReadingMode
		sourceIndex: number
	} | null>(null)

	// Reset page and cached state on chapter change
	watch(chapterId, () => {
		const wantsLast = routeWantsLastPage()
		pendingStartAtLast.value = wantsLast
		pendingStartPage.value = wantsLast ? null : routeRequestedPage()
		chapterBoundaryNavigationInProgress.value = false
		currentPage.value = 0
		pendingModeTranslation.value = null
		imageDimensions.value = new Map()
		preloadedUrls.value = new Set()
	})

	// Paged/double mode state
	const imagePages = computed(() => pages.value.filter(p => p.type === "image" && p.url))

	// Spread detection for double mode — load dimensions incrementally around current page
	const imageDimensions = ref(new Map<number, { w: number, h: number }>())
	const DIMENSION_LOOKAHEAD = 6
	const imageDimensionsLoaded = computed(() =>
		imagePages.value.length > 0
		&& imagePages.value.every(p => imageDimensions.value.has(p.index)),
	)

	function loadDimensions(imgs: Page[], startIdx: number, count: number) {
		if (!import.meta.client) return
		const end = Math.min(startIdx + count, imgs.length)
		for (let i = Math.max(0, startIdx); i < end; i++) {
			const page = imgs[i]!
			if (page.url && !imageDimensions.value.has(page.index)) {
				const img = new Image()
				const pageIndex = page.index
				img.onload = () => {
					imageDimensions.value.set(pageIndex, { w: img.naturalWidth, h: img.naturalHeight })
					imageDimensions.value = new Map(imageDimensions.value)
				}
				img.onerror = () => {
					console.warn(`Failed to load dimensions for page ${pageIndex}`)
					imageDimensions.value.set(pageIndex, { w: 0, h: 0 })
					imageDimensions.value = new Map(imageDimensions.value)
				}
				img.src = page.url
			}
		}
	}

	function dimensionsReadyThroughPage(pageIndex: number) {
		if (mode.value !== "double") return true
		if (imagePages.value.length === 0) return false

		const clampedPageIndex = Math.min(Math.max(pageIndex, 0), imagePages.value.length - 1)
		const requiredCount = clampedPageIndex + 1
		loadDimensions(imagePages.value, 0, requiredCount)

		for (let i = 0; i < requiredCount; i++) {
			const page = imagePages.value[i]
			if (!page || !imageDimensions.value.has(page.index)) return false
		}
		return true
	}

	// Load initial batch when entering double mode or pages change
	watch([imagePages, mode], ([imgs, m]) => {
		if (m !== "double") return
		loadDimensions(imgs, 0, DIMENSION_LOOKAHEAD)
	}, { immediate: true })

	// Load more dimensions as the user pages forward
	watch(currentPage, (page) => {
		if (mode.value !== "double") return
		// Convert spread index to approximate image index (2 pages per spread)
		const imgIdx = page * 2
		loadDimensions(imagePages.value, imgIdx, DIMENSION_LOOKAHEAD)
	})

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
	const spreadsReady = computed(() => {
		if (!imageDimensionsLoaded.value) return false
		let spreadPageCount = 0
		for (const spread of spreads.value) spreadPageCount += spread.pages.length
		return spreadPageCount === imagePages.value.length
	})

	function clampTranslatedIndex(index: number, targetMode: HorizontalReadingMode) {
		const maxIndex = targetMode === "double"
			? Math.max(spreads.value.length - 1, 0)
			: Math.max(imagePages.value.length - 1, 0)
		return Math.min(Math.max(index, 0), maxIndex)
	}

	function fallbackTranslateIndex(from: HorizontalReadingMode, to: HorizontalReadingMode, sourceIndex: number) {
		if (from === "paged" && to === "double") return Math.floor(sourceIndex / 2)
		if (from === "double" && to === "paged") return sourceIndex * 2
		return sourceIndex
	}

	function translateIndexWithSpreads(from: HorizontalReadingMode, to: HorizontalReadingMode, sourceIndex: number) {
		if (from === "paged" && to === "double") {
			let pageCount = 0
			for (let s = 0; s < spreads.value.length; s++) {
				pageCount += spreads.value[s]!.pages.length
				if (pageCount > sourceIndex) return s
			}
			return Math.max(spreads.value.length - 1, 0)
		}
		if (from === "double" && to === "paged") {
			let pageIndex = 0
			for (let s = 0; s < sourceIndex && s < spreads.value.length; s++) {
				pageIndex += spreads.value[s]!.pages.length
			}
			return pageIndex
		}
		return sourceIndex
	}

	// Translate position when switching between paged ↔ double
	watch(mode, (newMode, oldMode) => {
		if (newMode === "vertical" || oldMode === "vertical") {
			pendingModeTranslation.value = null
			currentPage.value = 0
			return
		}
		const from = oldMode as HorizontalReadingMode
		const to = newMode as HorizontalReadingMode
		const sourceIndex = currentPage.value

		if (!spreadsReady.value) {
			pendingModeTranslation.value = { from, to, sourceIndex }
			currentPage.value = clampTranslatedIndex(fallbackTranslateIndex(from, to, sourceIndex), to)
			return
		}

		pendingModeTranslation.value = null
		currentPage.value = clampTranslatedIndex(translateIndexWithSpreads(from, to, sourceIndex), to)
	})

	// Retry deferred paged/double translation once dimensions + spreads are fully ready
	watch(spreadsReady, (ready) => {
		if (!ready) return
		const pending = pendingModeTranslation.value
		if (!pending) return
		if (mode.value !== pending.to) return

		currentPage.value = clampTranslatedIndex(
			translateIndexWithSpreads(pending.from, pending.to, pending.sourceIndex),
			pending.to,
		)
		pendingModeTranslation.value = null
	})

	const totalPages = computed(() => {
		if (mode.value === "double") return spreads.value.length
		return imagePages.value.length
	})

	// Optional chapter-entry hint: open the requested page/spread from query.
	watch([chapterId, totalPages, mode, () => dataQuery.isFetching.value, () => imageDimensions.value.size], ([, count, m, isFetching]) => {
		if (pendingStartPage.value === null) return
		if (isFetching) return
		if (count <= 0) return

		if (m === "paged") {
			currentPage.value = Math.min(Math.max(pendingStartPage.value - 1, 0), count - 1)
			pendingStartPage.value = null
			pendingStartAtLast.value = false
			return
		}

		// In double mode, `page` query is the individual page number (1-based).
		const targetPageIndex = Math.max(pendingStartPage.value - 1, 0)
		if (!dimensionsReadyThroughPage(targetPageIndex)) {
			currentPage.value = clampTranslatedIndex(Math.floor(targetPageIndex / 2), "double")
			return
		}
		const spreadIndex = translateIndexWithSpreads("paged", "double", targetPageIndex)
		currentPage.value = clampTranslatedIndex(spreadIndex, "double")
		pendingStartPage.value = null
		pendingStartAtLast.value = false
	}, { immediate: true })

	// Optional chapter-entry hint: open the last page/spread (used when crossing to previous chapter).
	watch([chapterId, totalPages, mode, () => dataQuery.isFetching.value, () => imageDimensions.value.size], ([, count, m, isFetching]) => {
		if (!pendingStartAtLast.value) return
		if (isFetching) return
		if (count <= 0) return

		if (m === "paged") {
			currentPage.value = count - 1
			pendingStartAtLast.value = false
			return
		}

		const lastPageIndex = Math.max(imagePages.value.length - 1, 0)
		if (!dimensionsReadyThroughPage(lastPageIndex)) {
			currentPage.value = clampTranslatedIndex(Math.floor(lastPageIndex / 2), "double")
			return
		}
		const spreadIndex = translateIndexWithSpreads("paged", "double", lastPageIndex)
		currentPage.value = clampTranslatedIndex(spreadIndex, "double")
		pendingStartAtLast.value = false
	}, { immediate: true })

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

	// Keep chapter progress in URL so reload restores current page.
	watch([currentPage, mode, totalPages, currentSpreadPageRange], ([page, m, count, range]) => {
		if (m !== "paged" && m !== "double") return
		if (count <= 0) return
		if (pendingStartAtLast.value || pendingStartPage.value !== null) return

		const currentPageQuery = routeQueryValue(route.query.page)
		const targetPageQuery = String(m === "double"
			? Math.max(range.start, 1)
			: page + 1)
		const currentAt = routeQueryValue(route.query.at)
		if (currentPageQuery === targetPageQuery && currentAt !== "last") return

		void navigateTo({
			path: route.path,
			query: { page: targetPageQuery },
		}, { replace: true })
	})

	function goToPage(page: number) {
		if (page >= 0 && page < totalPages.value) {
			currentPage.value = page
		}
	}

	function goToNextChapter() {
		if (!nextChapter.value || chapterBoundaryNavigationInProgress.value) return
		chapterBoundaryNavigationInProgress.value = true
		void navigateTo(`/read/${serieId.value}/${nextChapter.value.id}`)
	}

	function goToPrevChapter(atLast: boolean) {
		if (!prevChapter.value || chapterBoundaryNavigationInProgress.value) return
		chapterBoundaryNavigationInProgress.value = true
		if (atLast) {
			void navigateTo({
				path: `/read/${serieId.value}/${prevChapter.value.id}`,
				query: { at: "last" },
			})
			return
		}
		void navigateTo(`/read/${serieId.value}/${prevChapter.value.id}`)
	}

	function nextPage() {
		if (currentPage.value < totalPages.value - 1) {
			goToPage(currentPage.value + 1)
			return
		}
		if (mode.value === "paged" || mode.value === "double") {
			goToNextChapter()
		}
	}

	function prevPage() {
		if (currentPage.value > 0) {
			goToPage(currentPage.value - 1)
			return
		}
		if (mode.value === "paged" || mode.value === "double") {
			goToPrevChapter(true)
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
				goToNextChapter()
				break
			case "[":
				goToPrevChapter(false)
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

	let lastScrollY = 0
	function handleVerticalScrollBoundary() {
		if (!import.meta.client) return

		const currentY = window.scrollY
		const delta = currentY - lastScrollY
		lastScrollY = currentY

		if (mode.value !== "vertical") return
		if (chapterBoundaryNavigationInProgress.value) return

		const doc = document.documentElement
		const atBottom = window.innerHeight + currentY >= doc.scrollHeight - 2
		const atTop = currentY <= 0

		if (delta > 0 && atBottom) {
			goToNextChapter()
		}
		else if (delta < 0 && atTop) {
			goToPrevChapter(true)
		}
	}

	function toggleFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen().catch((e) => {
				console.warn("Failed to exit fullscreen:", e)
				toast.add({ title: "Could not exit fullscreen", color: "warning" })
			})
		}
		else {
			document.documentElement.requestFullscreen().catch((e) => {
				console.warn("Failed to enter fullscreen:", e)
				toast.add({ title: "Could not enter fullscreen", color: "warning" })
			})
		}
	}

	onMounted(() => {
		lastScrollY = window.scrollY
		window.addEventListener("keydown", handleKeydown)
		window.addEventListener("scroll", handleVerticalScrollBoundary, { passive: true })
	})

	onUnmounted(() => {
		window.removeEventListener("keydown", handleKeydown)
		window.removeEventListener("scroll", handleVerticalScrollBoundary)
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
