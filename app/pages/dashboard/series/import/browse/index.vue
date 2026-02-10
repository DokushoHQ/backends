<script setup lang="ts">
definePageMeta({
	layout: "default",
	middleware: "import-guard",
})

const router = useRouter()
const cart = useImportCart()
const browse = useImportBrowse()

const DISCLAIMER_STORAGE_KEY = "dokusho-source-disclaimer-dismissed"
const disclaimerDismissed = ref(false)

onMounted(async () => {
	cart.hydrateFromStorage()
	disclaimerDismissed.value = localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "true"

	// Fetch sources if not loaded
	if (browse.sources.value.length === 0) {
		await browse.fetchSources()
	}
})

function dismissDisclaimer() {
	disclaimerDismissed.value = true
	localStorage.setItem(DISCLAIMER_STORAGE_KEY, "true")
}

function showDisclaimer() {
	disclaimerDismissed.value = false
	localStorage.removeItem(DISCLAIMER_STORAGE_KEY)
}

function selectSource(source: { id: string }) {
	router.push(`/dashboard/series/import/browse/${source.id}`)
}
</script>

<template>
	<div class="source-select-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UiPageHeader
					title="Select Source"
					description="Choose a source to browse"
					back-to="/dashboard/series/import"
				>
					<template #right>
						<ImporterSharedCartBadge
							v-if="cart.cartCount.value > 0"
							:count="cart.cartCount.value"
							@click="router.push('/dashboard/series/import/review')"
						/>
					</template>
				</UiPageHeader>
			</template>

			<template #body>
				<!-- Disclaimer Banner -->
				<div
					v-if="!disclaimerDismissed && !browse.loadingSources.value && browse.sources.value.length > 0"
					class="disclaimer-banner"
				>
					<button
						class="disclaimer-close"
						@click="dismissDisclaimer"
					>
						<UIcon
							name="i-lucide-x"
							class="icon"
						/>
					</button>
					<div class="disclaimer-content">
						<UIcon
							name="i-lucide-info"
							class="disclaimer-icon"
						/>
						<div>
							<p class="disclaimer-title">
								About Sources
							</p>
							<p class="disclaimer-text">
								<strong>Native sources</strong> are built-in scrapers with full support for metadata and chapter fetching.
							</p>
							<p class="disclaimer-text">
								<strong>Suwayomi sources</strong> are extensions loaded from your Suwayomi server. While they provide access to many more sources,
								<span class="disclaimer-warning">chapter fetching and metadata retrieval may be unreliable or broken</span> for some of them.
							</p>
						</div>
					</div>
				</div>

				<!-- Loading -->
				<div
					v-if="browse.loadingSources.value"
					class="loading-state"
				>
					<UIcon
						name="i-lucide-loader-2"
						class="loading-spinner"
					/>
				</div>

				<!-- Empty State -->
				<div
					v-else-if="browse.sources.value.length === 0"
					class="empty-state"
				>
					<div class="empty-icon">
						<UIcon
							name="i-lucide-globe"
							class="icon"
						/>
					</div>
					<p class="empty-text">
						No sources available
					</p>
				</div>

				<template v-else>
					<!-- Native Sources -->
					<section
						v-if="browse.nativeSources.value.length > 0"
						class="source-section"
					>
						<div class="section-header">
							<h3 class="section-title">
								Native Sources
							</h3>
							<button
								v-if="disclaimerDismissed"
								class="info-button"
								@click="showDisclaimer"
							>
								<UIcon
									name="i-lucide-info"
									class="icon"
								/>
								<span>About sources</span>
							</button>
						</div>
						<div class="source-grid">
							<button
								v-for="source in browse.nativeSources.value"
								:key="source.id"
								class="source-card"
								@click="selectSource(source)"
							>
								<NuxtImg
									v-if="source.icon"
									:src="source.icon"
									provider="smart"
									:alt="source.name"
									class="source-icon"
								/>
								<div
									v-else
									class="source-icon-placeholder"
								>
									<UIcon
										name="i-lucide-globe"
										class="icon"
									/>
								</div>
								<span class="source-name">{{ source.name }}</span>
							</button>
						</div>
					</section>

					<!-- Suwayomi Sources -->
					<section
						v-if="browse.suwayomiSources.value.length > 0"
						class="source-section"
					>
						<div class="section-header">
							<h3 class="section-title">
								Suwayomi Sources
							</h3>
							<button
								v-if="disclaimerDismissed && browse.nativeSources.value.length === 0"
								class="info-button"
								@click="showDisclaimer"
							>
								<UIcon
									name="i-lucide-info"
									class="icon"
								/>
								<span>About sources</span>
							</button>
						</div>
						<div class="source-grid">
							<button
								v-for="source in browse.suwayomiSources.value"
								:key="source.id"
								class="source-card"
								@click="selectSource(source)"
							>
								<NuxtImg
									v-if="source.icon"
									:src="source.icon"
									provider="smart"
									:alt="source.name"
									class="source-icon"
								/>
								<div
									v-else
									class="source-icon-placeholder"
								>
									<UIcon
										name="i-lucide-globe"
										class="icon"
									/>
								</div>
								<span class="source-name">{{ source.name }}</span>
							</button>
						</div>
					</section>
				</template>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
.source-select-content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

/* Disclaimer Banner */
.disclaimer-banner {
	position: relative;
	padding: 1rem;
	padding-right: 2.5rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
}

.disclaimer-close {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	padding: 0.25rem;
	border-radius: 0.25rem;
	color: var(--ui-text-muted);
	cursor: pointer;
	transition: all 0.15s ease;
}

.disclaimer-close:hover {
	background: var(--ui-bg-muted);
	color: var(--ui-text);
}

.disclaimer-close .icon {
	width: 1rem;
	height: 1rem;
}

.disclaimer-content {
	display: flex;
	gap: 0.75rem;
}

.disclaimer-icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-text-muted);
	flex-shrink: 0;
	margin-top: 0.125rem;
}

.disclaimer-title {
	font-size: var(--font-size-base);
	font-weight: 500;
	color: var(--ui-text);
	margin: 0 0 0.5rem 0;
}

.disclaimer-text {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0;
	line-height: 1.5;
}

.disclaimer-text + .disclaimer-text {
	margin-top: 0.25rem;
}

.disclaimer-text strong {
	color: var(--ui-text);
}

.disclaimer-warning {
	color: var(--ui-warning);
	font-weight: 500;
}

/* Loading State */
.loading-state {
	display: flex;
	justify-content: center;
	padding: 4rem 2rem;
}

.loading-spinner {
	width: 1.5rem;
	height: 1.5rem;
	color: var(--ui-text-muted);
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	text-align: center;
}

.empty-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 4rem;
	height: 4rem;
	margin-bottom: 1rem;
	background: var(--ui-bg-muted);
	border-radius: 50%;
}

.empty-icon .icon {
	width: 2rem;
	height: 2rem;
	color: var(--ui-text-dimmed);
}

.empty-text {
	font-size: var(--font-size-base);
	color: var(--ui-text-muted);
	margin: 0;
}

/* Source Section */
.source-section {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.section-title {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.03em;
	margin: 0;
}

.info-button {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	cursor: pointer;
	transition: color 0.15s ease;
}

.info-button:hover {
	color: var(--ui-text);
}

.info-button .icon {
	width: 1rem;
	height: 1rem;
}

/* Source Grid */
.source-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 0.75rem;
}

@media (min-width: 640px) {
	.source-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

@media (min-width: 768px) {
	.source-grid {
		grid-template-columns: repeat(4, 1fr);
	}
}

@media (min-width: 1024px) {
	.source-grid {
		grid-template-columns: repeat(5, 1fr);
	}
}

@media (min-width: 1280px) {
	.source-grid {
		grid-template-columns: repeat(6, 1fr);
	}
}

/* Source Card */
.source-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.75rem;
	padding: 1.25rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
	text-align: center;
	cursor: pointer;
	transition: all 0.15s ease;
}

.source-card:hover {
	border-color: var(--ui-primary);
	background: var(--ui-bg-muted);
}

.source-icon {
	width: 3rem;
	height: 3rem;
	border-radius: 0.5rem;
	object-fit: contain;
}

.source-icon-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 3rem;
	height: 3rem;
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
}

.source-icon-placeholder .icon {
	width: 1.5rem;
	height: 1.5rem;
	color: var(--ui-text-dimmed);
}

.source-name {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	line-height: 1.3;
}
</style>
