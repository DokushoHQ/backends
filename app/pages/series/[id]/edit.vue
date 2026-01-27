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
	title: computed(() => title.value ? `Edit ${title.value} - Dokusho` : "Edit Series - Dokusho"),
})
</script>

<template>
	<div class="edit-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UDashboardNavbar>
					<template #title>
						<UBreadcrumb
							:items="[
								{ label: 'Series', to: '/series' },
								{ label: title.length > 20 ? `${title.slice(0, 20)}...` : title, to: `/series/${serieId}` },
								{ label: 'Edit' },
							]"
						/>
					</template>
					<template #right>
						<UiBackButton
							:to="`/series/${serieId}`"
							label="Back to Series"
						/>
					</template>
				</UDashboardNavbar>
			</template>

			<template #body>
				<!-- Loading state -->
				<div
					v-if="pending"
					class="loading-state"
				>
					<UIcon
						name="i-lucide-loader-2"
						class="loading-spinner"
					/>
				</div>

				<!-- Error state -->
				<div
					v-else-if="error"
					class="error-state"
				>
					<div class="error-icon">
						<UIcon
							name="i-lucide-alert-circle"
							class="icon"
						/>
					</div>
					<h2>Failed to load series</h2>
					<p>{{ error.message }}</p>
					<button
						class="retry-button"
						@click="refresh()"
					>
						<UIcon
							name="i-lucide-refresh-cw"
							class="icon-sm"
						/>
						Try again
					</button>
				</div>

				<!-- Main content -->
				<div
					v-else-if="serie"
					class="edit-content"
				>
					<!-- Identity section: Cover + Title -->
					<div class="identity-row">
						<SeriesEditCoverSection
							:serie="serie"
							class="cover-section"
							@updated="refresh"
						/>
						<div class="identity-text">
							<SeriesEditTitleSection
								:serie="serie"
								@updated="refresh"
							/>
							<SeriesEditSynopsisSection
								:serie="serie"
								@updated="refresh"
							/>
						</div>
					</div>

					<!-- Preferences section -->
					<div class="preferences-row">
						<SeriesEditChapterPreferencesSection
							:serie-id="serieId"
							:sources="serie.sources"
							@updated="refresh"
						/>

						<SeriesEditGroupPreferencesSection
							:serie-id="serieId"
							@updated="refresh"
						/>
					</div>

					<!-- Manual overrides section -->
					<SeriesEditChapterOverridesSection
						:serie-id="serieId"
						@updated="refresh"
					/>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
.edit-content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	max-width: 72rem;
}

/* Identity row: Cover + Title/Synopsis */
.identity-row {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

@media (min-width: 768px) {
	.identity-row {
		flex-direction: row;
		gap: 1.5rem;
	}

	.cover-section {
		flex-shrink: 0;
		width: 16rem;
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

/* Preferences row: Chapter + Group preferences */
.preferences-row {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

@media (min-width: 1024px) {
	.preferences-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		align-items: start;
	}
}

/* Loading state */
.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
}

.loading-spinner {
	width: 2rem;
	height: 2rem;
	color: var(--ui-text-muted);
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Error state */
.error-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	text-align: center;
}

.error-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 4rem;
	height: 4rem;
	margin-bottom: 1.5rem;
	border-radius: 50%;
	background: var(--ui-error-soft);
}

.error-icon .icon {
	width: 2rem;
	height: 2rem;
	color: var(--ui-error);
}

.error-state h2 {
	font-size: var(--font-size-xl);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0 0 0.5rem 0;
}

.error-state p {
	font-size: var(--font-size-base);
	color: var(--ui-text-muted);
	max-width: 24rem;
	margin: 0 0 1.5rem 0;
}

.retry-button {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.625rem 1rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.retry-button:hover {
	background: var(--ui-border);
}

.icon-sm {
	width: 1rem;
	height: 1rem;
}
</style>
