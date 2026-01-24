/**
 * Import Cart Composable
 *
 * Manages the cart state for series import flow.
 * Uses useState for SSR compatibility and syncs to sessionStorage for refresh resilience.
 */

// ==================== Types ====================

export interface SimilarMatch {
	serieId: string
	title: string
	sources: Array<{ id: string, name: string }>
	similarity: number
	cover: string | null
}

export interface CartDuplicateMatch {
	cartKey: string
	title: string
	sourceName: string
	cover: string | null
	similarity: number
}

export interface SelectedSerie {
	// Identification
	sourceId: string
	sourceName: string
	externalId: string

	// Display data
	title: string
	cover: string | null
	type: string
	status: string[]
	chapterCount?: number

	// Library duplicate detection (populated in review step)
	similarMatches?: SimilarMatch[]
	loadingSimilarity?: boolean

	// Cart duplicate detection (populated in review step)
	cartDuplicates?: CartDuplicateMatch[]
	isPrimaryInGroup?: boolean

	// User decision
	action?: "import" | "link"
	linkToSerieId?: string
	linkToSerieTitle?: string
	linkToSerieCover?: string | null
	linkToCartKey?: string // For linking to another cart item

	// Processing state
	processingState?: "pending" | "queued" | "processing" | "done" | "error"
	processingMessage?: string
	jobId?: string
}

// ==================== Storage Key ====================

const STORAGE_KEY = "dokusho-import-cart"

// ==================== Title Similarity Utils ====================

function normalizeTitle(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^\w\s]/g, "") // Remove special chars
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim()
}

function levenshteinDistance(a: string, b: string): number {
	if (a.length === 0) return b.length
	if (b.length === 0) return a.length

	const matrix: number[][] = []

	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i]
	}
	for (let j = 0; j <= a.length; j++) {
		matrix[0]![j] = j
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i]![j] = matrix[i - 1]![j - 1]!
			}
			else {
				matrix[i]![j] = Math.min(
					matrix[i - 1]![j - 1]! + 1, // substitution
					matrix[i]![j - 1]! + 1, // insertion
					matrix[i - 1]![j]! + 1, // deletion
				)
			}
		}
	}

	return matrix[b.length]![a.length]!
}

function calculateTitleSimilarity(a: string, b: string): number {
	const normA = normalizeTitle(a)
	const normB = normalizeTitle(b)

	if (normA === normB) return 1

	const maxLen = Math.max(normA.length, normB.length)
	if (maxLen === 0) return 1

	const distance = levenshteinDistance(normA, normB)
	return 1 - distance / maxLen
}

// ==================== Composable ====================

export function useImportCart() {
	// Use useState for SSR-compatible global state
	const selectedSeries = useState<Map<string, SelectedSerie>>("import-cart", () => new Map())

	// Track if we've hydrated from storage
	const hydrated = useState("import-cart-hydrated", () => false)

	// ==================== Session Storage Sync ====================

	function hydrateFromStorage() {
		if (import.meta.client && !hydrated.value) {
			const stored = sessionStorage.getItem(STORAGE_KEY)
			if (stored) {
				try {
					const data = JSON.parse(stored) as Array<[string, SelectedSerie]>
					selectedSeries.value = new Map(data)
				}
				catch {
					// Ignore invalid data
				}
			}
			hydrated.value = true
		}
	}

	function saveToStorage() {
		if (import.meta.client) {
			const data = Array.from(selectedSeries.value.entries())
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
		}
	}

	// Watch for changes and save to storage
	watch(selectedSeries, () => {
		saveToStorage()
	}, { deep: true })

	// ==================== Cart Key ====================

	function getCartKey(sourceId: string, externalId: string): string {
		return `${sourceId}:${externalId}`
	}

	// ==================== Computed ====================

	const cartCount = computed(() => selectedSeries.value.size)
	const cartItems = computed(() => Array.from(selectedSeries.value.values()))

	const allDecisionsMade = computed(() => {
		if (cartCount.value === 0) return false
		// Check that each item has a complete action:
		// - "import" is always complete (if isPrimaryInGroup or no cart duplicates)
		// - "link" requires a linkToSerieId or linkToCartKey
		return cartItems.value.every((s) => {
			if (s.action === "import") return true
			if (s.action === "link" && (s.linkToSerieId || s.linkToCartKey)) return true
			return false
		})
	})

	const hasCartDuplicates = computed(() =>
		cartItems.value.some(s => s.cartDuplicates && s.cartDuplicates.length > 0),
	)

	// ==================== Cart Methods ====================

	function isInCart(sourceId: string, externalId: string): boolean {
		return selectedSeries.value.has(getCartKey(sourceId, externalId))
	}

	function addToCart(serie: Omit<SelectedSerie, "action" | "processingState">) {
		const key = getCartKey(serie.sourceId, serie.externalId)
		if (!selectedSeries.value.has(key)) {
			selectedSeries.value.set(key, { ...serie })
		}
	}

	function removeFromCart(sourceId: string, externalId: string) {
		selectedSeries.value.delete(getCartKey(sourceId, externalId))
	}

	function toggleSelection(serie: Omit<SelectedSerie, "action" | "processingState">) {
		const key = getCartKey(serie.sourceId, serie.externalId)
		if (selectedSeries.value.has(key)) {
			selectedSeries.value.delete(key)
		}
		else {
			selectedSeries.value.set(key, { ...serie })
		}
	}

	function clearCart() {
		selectedSeries.value.clear()
		if (import.meta.client) {
			sessionStorage.removeItem(STORAGE_KEY)
		}
	}

	function getCartItem(sourceId: string, externalId: string): SelectedSerie | undefined {
		return selectedSeries.value.get(getCartKey(sourceId, externalId))
	}

	function updateCartItem(sourceId: string, externalId: string, updates: Partial<SelectedSerie>) {
		const key = getCartKey(sourceId, externalId)
		const item = selectedSeries.value.get(key)
		if (item) {
			Object.assign(item, updates)
		}
	}

	// ==================== Actions ====================

	function setAction(sourceId: string, externalId: string, action: "import" | "link", linkToSerieId?: string, linkToSerieTitle?: string, linkToSerieCover?: string | null) {
		const key = getCartKey(sourceId, externalId)
		const item = selectedSeries.value.get(key)
		if (item) {
			item.action = action
			item.linkToSerieId = linkToSerieId
			item.linkToSerieTitle = linkToSerieTitle
			item.linkToSerieCover = linkToSerieCover
		}
	}

	// ==================== Cart Duplicate Detection ====================

	const SIMILARITY_THRESHOLD = 0.85

	function detectCartDuplicates() {
		const items = cartItems.value
		const itemKeys = items.map(s => getCartKey(s.sourceId, s.externalId))

		// Clear existing cart duplicates
		for (const item of items) {
			item.cartDuplicates = []
			item.isPrimaryInGroup = undefined
		}

		// Compare each item with all others
		for (let i = 0; i < items.length; i++) {
			const itemA = items[i]!
			const keyA = itemKeys[i]!

			for (let j = i + 1; j < items.length; j++) {
				const itemB = items[j]!
				const keyB = itemKeys[j]!

				// Skip if same source (can't be duplicate from same source)
				if (itemA.sourceId === itemB.sourceId) continue

				const similarity = calculateTitleSimilarity(itemA.title, itemB.title)

				if (similarity >= SIMILARITY_THRESHOLD) {
					// Add mutual references
					const selectedA = selectedSeries.value.get(keyA)
					const selectedB = selectedSeries.value.get(keyB)

					if (selectedA) {
						if (!selectedA.cartDuplicates) selectedA.cartDuplicates = []
						selectedA.cartDuplicates.push({
							cartKey: keyB,
							title: itemB.title,
							sourceName: itemB.sourceName,
							cover: itemB.cover,
							similarity,
						})
					}

					if (selectedB) {
						if (!selectedB.cartDuplicates) selectedB.cartDuplicates = []
						selectedB.cartDuplicates.push({
							cartKey: keyA,
							title: itemA.title,
							sourceName: itemA.sourceName,
							cover: itemA.cover,
							similarity,
						})
					}
				}
			}
		}

		// Auto-set first item in each duplicate group as primary
		const processed = new Set<string>()
		for (const item of items) {
			const key = getCartKey(item.sourceId, item.externalId)
			if (processed.has(key)) continue

			if (item.cartDuplicates && item.cartDuplicates.length > 0) {
				// This item is part of a duplicate group - make it primary
				const selectedItem = selectedSeries.value.get(key)
				if (selectedItem) {
					selectedItem.isPrimaryInGroup = true
					selectedItem.action = "import"
					processed.add(key)

					// Set all duplicates as non-primary and link to this one
					for (const dup of item.cartDuplicates) {
						const dupItem = selectedSeries.value.get(dup.cartKey)
						if (dupItem && !processed.has(dup.cartKey)) {
							dupItem.isPrimaryInGroup = false
							dupItem.action = "link"
							dupItem.linkToCartKey = key
							processed.add(dup.cartKey)
						}
					}
				}
			}
		}
	}

	function setGroupPrimary(newPrimaryCartKey: string) {
		const newPrimary = selectedSeries.value.get(newPrimaryCartKey)
		if (!newPrimary || !newPrimary.cartDuplicates) return

		// Collect all cart keys in this duplicate group
		const groupKeys = new Set<string>([newPrimaryCartKey])
		for (const dup of newPrimary.cartDuplicates) {
			groupKeys.add(dup.cartKey)
		}

		// Update all items in the group
		for (const cartKey of groupKeys) {
			const item = selectedSeries.value.get(cartKey)
			if (!item) continue

			if (cartKey === newPrimaryCartKey) {
				// This is the new primary
				item.isPrimaryInGroup = true
				item.action = "import"
				item.linkToCartKey = undefined
				item.linkToSerieId = undefined
			}
			else {
				// This links to the new primary
				item.isPrimaryInGroup = false
				item.action = "link"
				item.linkToCartKey = newPrimaryCartKey
				item.linkToSerieId = undefined
			}
		}
	}

	return {
		// State
		selectedSeries,

		// Computed
		cartCount,
		cartItems,
		allDecisionsMade,
		hasCartDuplicates,

		// Methods
		hydrateFromStorage,
		getCartKey,
		isInCart,
		addToCart,
		removeFromCart,
		toggleSelection,
		clearCart,
		getCartItem,
		updateCartItem,

		// Actions
		setAction,

		// Cart Duplicate Detection
		detectCartDuplicates,
		setGroupPrimary,
	}
}
