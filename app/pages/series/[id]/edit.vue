<script setup lang="ts">
const route = useRoute()
const { isAdmin } = await useAuth()

const serieId = computed(() => route.params.id as string)

// Redirect non-admins
if (!isAdmin) {
	await navigateTo(`/series/${serieId.value}`)
}

// Fetch serie detail
const { data: serie, pending, error, refresh } = await useFetch(`/api/v1/serie/${serieId.value}`)

const title = computed(() => serie.value?.title ?? "")

// Page meta
definePageMeta({
	title: "Edit Series",
})

useHead({
	title: computed(() => title.value ? `Edit ${title.value} - Tsundoku` : "Edit Series - Tsundoku"),
})

// Refresh handler for child components
const isRefreshing = ref(false)
async function handleRefresh() {
	isRefreshing.value = true
	await refresh()
	isRefreshing.value = false
}
</script>

<template>
	<div class="edit-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UiPageHeader
					:items="[
						{ label: 'Series', to: '/series' },
						{ label: title, to: `/series/${serieId}` },
						{ label: 'Edit' },
					]"
					:back-to="`/series/${serieId}`"
				>
					<template #right>
						<button
							class="btn btn-secondary"
							:disabled="isRefreshing"
							@click="handleRefresh"
						>
							<UIcon
								:name="isRefreshing ? 'i-lucide-loader-2' : 'i-lucide-refresh-cw'"
								:class="['btn-icon', { spin: isRefreshing }]"
							/>
							<span class="btn-label">Refresh</span>
						</button>
					</template>
				</UiPageHeader>
			</template>

			<template #body>
				<!-- Loading state -->
				<div
					v-if="pending"
					class="loading-state"
				>
					<div class="loading-indicator">
						<div class="led active pulse" />
						<span class="loading-text">LOADING DATA...</span>
					</div>
				</div>

				<!-- Error state -->
				<div
					v-else-if="error"
					class="error-state"
				>
					<div class="error-panel">
						<div class="error-header">
							<div class="led error" />
							<span>SYSTEM ERROR</span>
						</div>
						<div class="error-body">
							<p class="error-message">
								{{ error.message }}
							</p>
							<button
								class="btn btn-secondary"
								@click="refresh()"
							>
								<UIcon
									name="i-lucide-refresh-cw"
									class="btn-icon"
								/>
								Retry
							</button>
						</div>
					</div>
				</div>

				<!-- Main content -->
				<div
					v-else-if="serie"
					class="page-content"
				>
					<!-- Identity Section: Cover + Title + Synopsis -->
					<section class="content-section identity-section">
						<div class="identity-grid">
							<!-- Cover Column -->
							<SeriesEditCoverSection
								:serie="serie"
								class="cover-column"
								@updated="handleRefresh"
							/>

							<!-- Identity Text Column -->
							<div class="identity-text">
								<SeriesEditTitleSection
									:serie="serie"
									@updated="handleRefresh"
								/>
								<SeriesEditSynopsisSection
									:serie="serie"
									@updated="handleRefresh"
								/>
							</div>
						</div>
					</section>

					<!-- Chapter Engine Section -->
					<section class="content-section">
						<UiSectionHeader title="CHAPTER ENGINE" />
						<div class="engine-grid">
							<SeriesEditChapterPreferencesSection
								:serie-id="serieId"
								:sources="serie.sources"
								@updated="handleRefresh"
							/>

							<SeriesEditGroupPreferencesSection
								:serie-id="serieId"
								@updated="handleRefresh"
							/>
						</div>
					</section>

					<!-- Override Registry Section -->
					<SeriesEditChapterOverridesSection
						:serie-id="serieId"
						@updated="handleRefresh"
					/>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
/* Loading State */
.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
}

.loading-indicator {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.led {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--ui-text-dimmed);
	box-shadow: 0 0 0 1px var(--ui-border);
}

.led.active {
	background: var(--ui-primary);
	box-shadow:
		0 0 6px color-mix(in oklch, var(--ui-primary) 30%, transparent),
		0 0 0 1px color-mix(in oklch, var(--ui-primary) 60%, transparent);
}

.led.error {
	background: var(--ui-error);
	box-shadow:
		0 0 6px color-mix(in oklch, var(--ui-error) 30%, transparent),
		0 0 0 1px color-mix(in oklch, var(--ui-error) 60%, transparent);
}

.pulse {
	animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

	0%,
	100% {
		opacity: 1;
	}

	50% {
		opacity: 0.5;
	}
}

.loading-text {
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	letter-spacing: 0.1em;
}

/* Error State */
.error-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
}

.error-panel {
	max-width: 24rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-error);
	border-radius: var(--radius-card);
	overflow: hidden;
}

.error-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.625rem 0.875rem;
	background: color-mix(in oklch, var(--ui-error) 10%, transparent);
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-error);
	letter-spacing: 0.05em;
}

.error-body {
	padding: 1rem;
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.error-message {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin: 0;
	word-break: break-word;
}

/* Main Content */
.page-content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	width: 100%;
}

/* Sections */
.content-section {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

/* Identity Section */
.identity-section {
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
	padding: 1.25rem;
}

.identity-grid {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

@media (min-width: 768px) {
	.identity-grid {
		flex-direction: row;
		gap: 1.5rem;
	}

	.cover-column {
		flex-shrink: 0;
		width: 14rem;
	}

	.identity-text {
		flex: 1;
		min-width: 0;
	}
}

.identity-text {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

/* Engine Grid */
.engine-grid {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

@media (min-width: 1024px) {
	.engine-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		align-items: start;
	}
}
</style>
