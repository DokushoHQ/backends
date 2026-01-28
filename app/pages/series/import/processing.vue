<script setup lang="ts">
import { getProcessingStatusIcon, getProcessingStatusClass, getProcessingStatusLabel } from "~/composables/useImportProcessing"

definePageMeta({
	layout: "default",
	middleware: "import-guard",
})

const router = useRouter()
const cart = useImportCart()
const processing = useImportProcessing()

// Prevent navigation away from processing
onBeforeRouteLeave((to, from, next) => {
	// Allow navigation to /series (after close)
	if (to.path.startsWith("/series") && !to.path.startsWith("/series/import")) {
		next()
		return
	}
	// Block other navigation
	next(false)
})

// Start processing on mount
onMounted(async () => {
	cart.hydrateFromStorage()

	if (!processing.processingStarted.value) {
		await processing.startProcessing()
	}
})

function handleClose() {
	// Clear cart and reset
	cart.clearCart()
	processing.reset()
	router.push("/series")
}
</script>

<template>
	<div class="processing-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UiPageHeader
					:title="processing.processingComplete.value ? 'Import Complete' : 'Importing...'"
					:description="processing.processingComplete.value ? 'All series have been processed' : 'Import in progress'"
				/>
			</template>

			<template #body>
				<div class="processing-content">
					<!-- Completion State -->
					<div
						v-if="processing.processingComplete.value"
						class="completion-state"
					>
						<div class="completion-hero">
							<div class="completion-icon-wrapper">
								<div class="completion-icon-glow" />
								<div class="completion-icon">
									<UIcon
										name="i-lucide-check"
										class="icon"
									/>
								</div>
							</div>
							<h3 class="completion-title">
								Import Complete
							</h3>
							<p class="completion-subtitle">
								Successfully processed {{ processing.processingStats.value.total }} series
							</p>
						</div>

						<div class="completion-stats">
							<div
								v-if="processing.processingStats.value.imported > 0"
								class="stat-item stat-item--success"
							>
								<UIcon
									name="i-lucide-download"
									class="stat-icon"
								/>
								<span class="stat-value">{{ processing.processingStats.value.imported }}</span>
								<span class="stat-label">imported</span>
							</div>
							<div
								v-if="processing.processingStats.value.linked > 0"
								class="stat-item stat-item--info"
							>
								<UIcon
									name="i-lucide-link"
									class="stat-icon"
								/>
								<span class="stat-value">{{ processing.processingStats.value.linked }}</span>
								<span class="stat-label">linked</span>
							</div>
							<div
								v-if="processing.processingStats.value.errors > 0"
								class="stat-item stat-item--error"
							>
								<UIcon
									name="i-lucide-x-circle"
									class="stat-icon"
								/>
								<span class="stat-value">{{ processing.processingStats.value.errors }}</span>
								<span class="stat-label">failed</span>
							</div>
						</div>
					</div>

					<!-- Progress Header -->
					<div
						v-else
						class="progress-header"
					>
						<div class="progress-spinner">
							<UIcon
								name="i-lucide-loader-2"
								class="spinner-icon"
							/>
						</div>
						<div class="progress-text">
							<h3 class="progress-title">
								Importing...
							</h3>
							<p class="progress-subtitle">
								{{ cart.cartItems.value.filter(s => s.processingState === 'done' || s.processingState === 'error').length }}
								of {{ cart.cartCount.value }} complete
							</p>
						</div>
					</div>

					<!-- Progress Bar -->
					<div class="progress-bar-container">
						<div class="progress-bar">
							<div
								class="progress-fill"
								:class="{ 'is-complete': processing.processingComplete.value }"
								:style="{ width: `${processing.processingProgress.value}%` }"
							/>
						</div>
						<span class="progress-percent">{{ Math.round(processing.processingProgress.value) }}%</span>
					</div>

					<!-- Item Groups -->
					<div class="item-groups">
						<!-- Import Group -->
						<section
							v-if="processing.importItems.value.length > 0"
							class="item-group"
						>
							<div class="group-header">
								<div class="group-header-icon">
									<UIcon
										name="i-lucide-download"
										class="group-icon"
									/>
								</div>
								<span class="group-title">Importing</span>
								<span class="group-count">{{ processing.importItems.value.length }}</span>
							</div>
							<div class="item-list">
								<div
									v-for="serie in processing.importItems.value"
									:key="`${serie.sourceId}:${serie.externalId}`"
									class="item-row"
									:class="{ 'is-processing': serie.processingState === 'processing' }"
								>
									<div class="item-cover">
										<NuxtImg
											v-if="serie.cover"
											:src="serie.cover"
											:alt="serie.title"
											class="cover-image"
										/>
										<UIcon
											v-else
											name="i-lucide-book-open"
											class="cover-placeholder"
										/>
									</div>
									<div class="item-info">
										<div class="item-title">
											{{ serie.title }}
										</div>
										<div class="item-meta">
											<span class="item-source">{{ serie.sourceName }}</span>
											<span
												v-if="serie.isPrimaryInGroup"
												class="primary-badge"
											>
												Primary
											</span>
										</div>
										<div class="item-message">
											{{ serie.processingMessage || getProcessingStatusLabel(serie.processingState) }}
										</div>
									</div>
									<div
										class="item-status"
										:class="getProcessingStatusClass(serie.processingState)"
									>
										<UIcon
											:name="getProcessingStatusIcon(serie.processingState)"
											class="status-icon"
										/>
									</div>
								</div>
							</div>
						</section>

						<!-- Link to Existing Group -->
						<section
							v-if="processing.linkExistingItems.value.length > 0"
							class="item-group"
						>
							<div class="group-header">
								<div class="group-header-icon group-header-icon--link">
									<UIcon
										name="i-lucide-link"
										class="group-icon"
									/>
								</div>
								<span class="group-title">Linking to Existing</span>
								<span class="group-count">{{ processing.linkExistingItems.value.length }}</span>
							</div>
							<div class="item-list">
								<div
									v-for="serie in processing.linkExistingItems.value"
									:key="`${serie.sourceId}:${serie.externalId}`"
									class="item-row"
									:class="{ 'is-processing': serie.processingState === 'processing' }"
								>
									<div class="item-cover">
										<NuxtImg
											v-if="serie.cover"
											:src="serie.cover"
											:alt="serie.title"
											class="cover-image"
										/>
										<UIcon
											v-else
											name="i-lucide-book-open"
											class="cover-placeholder"
										/>
									</div>
									<div class="item-info">
										<div class="item-title">
											{{ serie.title }}
										</div>
										<div class="item-meta">
											<span class="item-source">{{ serie.sourceName }}</span>
											<UIcon
												name="i-lucide-arrow-right"
												class="link-arrow"
											/>
											<span class="link-target">{{ serie.linkToSerieTitle || 'existing' }}</span>
										</div>
										<div class="item-message">
											{{ serie.processingMessage || `Linking to ${serie.linkToSerieTitle || 'existing'}` }}
										</div>
									</div>
									<div
										class="item-status"
										:class="getProcessingStatusClass(serie.processingState)"
									>
										<UIcon
											:name="getProcessingStatusIcon(serie.processingState)"
											class="status-icon"
										/>
									</div>
								</div>
							</div>
						</section>

						<!-- Post-Import Link Group -->
						<section
							v-if="processing.postImportLinkItems.value.length > 0"
							class="item-group"
						>
							<div class="group-header">
								<div class="group-header-icon group-header-icon--post">
									<UIcon
										name="i-lucide-link-2"
										class="group-icon"
									/>
								</div>
								<span class="group-title">Linking After Import</span>
								<span class="group-count">{{ processing.postImportLinkItems.value.length }}</span>
							</div>
							<div class="item-list">
								<div
									v-for="serie in processing.postImportLinkItems.value"
									:key="`${serie.sourceId}:${serie.externalId}`"
									class="item-row"
									:class="{ 'is-processing': serie.processingState === 'processing' }"
								>
									<div class="item-cover">
										<NuxtImg
											v-if="serie.cover"
											:src="serie.cover"
											:alt="serie.title"
											class="cover-image"
										/>
										<UIcon
											v-else
											name="i-lucide-book-open"
											class="cover-placeholder"
										/>
									</div>
									<div class="item-info">
										<div class="item-title">
											{{ serie.title }}
										</div>
										<div class="item-meta">
											<span class="item-source">{{ serie.sourceName }}</span>
										</div>
										<div class="item-message">
											{{ serie.processingMessage || getProcessingStatusLabel(serie.processingState, serie.linkToCartKey) }}
										</div>
									</div>
									<div
										class="item-status"
										:class="getProcessingStatusClass(serie.processingState)"
									>
										<UIcon
											:name="getProcessingStatusIcon(serie.processingState)"
											class="status-icon"
										/>
									</div>
								</div>
							</div>
						</section>
					</div>
				</div>

				<!-- Footer -->
				<div class="processing-footer">
					<p
						v-if="!processing.processingComplete.value"
						class="footer-note"
					>
						<UIcon
							name="i-lucide-info"
							class="note-icon"
						/>
						Imports will continue in background if you close this page
					</p>
					<UButton
						:color="processing.processingComplete.value ? 'primary' : 'neutral'"
						:variant="processing.processingComplete.value ? 'solid' : 'outline'"
						@click="handleClose"
					>
						<UIcon
							:name="processing.processingComplete.value ? 'i-lucide-check' : 'i-lucide-x'"
							class="w-4 h-4 mr-2"
						/>
						{{ processing.processingComplete.value ? 'Done' : 'Close' }}
					</UButton>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
.processing-content {
	flex: 1;
	overflow-y: auto;
	min-height: 0;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	padding-bottom: 1rem;
}

/* Completion State */
.completion-state {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.completion-hero {
	text-align: center;
	padding: 1.5rem 0 0.5rem;
}

.completion-icon-wrapper {
	position: relative;
	width: 4rem;
	height: 4rem;
	margin: 0 auto 1rem;
}

.completion-icon-glow {
	position: absolute;
	inset: -0.5rem;
	background: var(--ui-success);
	opacity: 0.15;
	border-radius: 50%;
	animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
	0%, 100% { transform: scale(1); opacity: 0.15; }
	50% { transform: scale(1.1); opacity: 0.25; }
}

.completion-icon {
	position: relative;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--ui-success);
	border-radius: 50%;
	aspect-ratio: 1;
}

.completion-icon .icon {
	width: 2rem;
	height: 2rem;
	color: white;
}

.completion-title {
	font-size: var(--font-size-xl);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0 0 0.25rem;
}

.completion-subtitle {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0;
}

.completion-stats {
	display: flex;
	justify-content: center;
	gap: 1rem;
	flex-wrap: wrap;
}

.stat-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.625rem 1rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
}

.stat-icon {
	width: 1rem;
	height: 1rem;
}

.stat-item--success .stat-icon { color: var(--ui-success); }
.stat-item--info .stat-icon { color: var(--ui-primary); }
.stat-item--error .stat-icon { color: var(--ui-error); }

.stat-value {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
}

.stat-label {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

/* Progress Header */
.progress-header {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 1rem;
	padding: 1rem 0;
}

.progress-spinner {
	width: 2.5rem;
	height: 2.5rem;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--ui-primary-soft);
	border-radius: 50%;
}

.spinner-icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-primary);
	animation: spin 1s linear infinite;
}

.progress-text {
	text-align: left;
}

.progress-title {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
}

.progress-subtitle {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0.125rem 0 0;
}

/* Progress Bar */
.progress-bar-container {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.progress-bar {
	flex: 1;
	height: 0.5rem;
	background: var(--ui-bg-muted);
	border-radius: 0.25rem;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	background: linear-gradient(90deg, var(--ui-primary), color-mix(in oklch, var(--ui-primary) 80%, white));
	border-radius: 0.25rem;
	transition: width 0.3s ease;
	position: relative;
}

.progress-fill::after {
	content: '';
	position: absolute;
	inset: 0;
	background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
	animation: shimmer 1.5s ease infinite;
}

.progress-fill.is-complete {
	background: var(--ui-success);
}

.progress-fill.is-complete::after {
	display: none;
}

@keyframes shimmer {
	0% { transform: translateX(-100%); }
	100% { transform: translateX(100%); }
}

.progress-percent {
	flex-shrink: 0;
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text-muted);
	min-width: 2.5rem;
	text-align: right;
}

/* Item Groups */
.item-groups {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
	flex: 1;
	min-height: 0;
	overflow-y: auto;
}

.item-group {
	display: flex;
	flex-direction: column;
}

.group-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 0.625rem;
}

.group-header-icon {
	width: 1.5rem;
	height: 1.5rem;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--ui-primary-soft);
	border-radius: 0.375rem;
}

.group-header-icon--link {
	background: color-mix(in oklch, var(--ui-info) 15%, transparent);
}

.group-header-icon--link .group-icon {
	color: var(--ui-info);
}

.group-header-icon--post {
	background: color-mix(in oklch, var(--ui-warning) 15%, transparent);
}

.group-header-icon--post .group-icon {
	color: var(--ui-warning);
}

.group-icon {
	width: 0.875rem;
	height: 0.875rem;
	color: var(--ui-primary);
}

.group-title {
	font-size: var(--font-size-sm);
	font-weight: 600;
	color: var(--ui-text);
}

.group-count {
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	padding: 0.125rem 0.5rem;
	border-radius: 1rem;
}

.item-list {
	border: 1px solid var(--ui-border);
	border-radius: 0.625rem;
	background: var(--ui-bg-elevated);
	overflow: hidden;
}

.item-row {
	display: flex;
	align-items: center;
	gap: 0.875rem;
	padding: 0.875rem 1rem;
	border-bottom: 1px solid var(--ui-border);
	transition: background-color 0.15s ease;
}

.item-row:last-child {
	border-bottom: none;
}

.item-row.is-processing {
	background: var(--ui-primary-soft);
}

/* Item Cover */
.item-cover {
	flex-shrink: 0;
	width: 2.25rem;
	height: 3.25rem;
	border-radius: 0.25rem;
	overflow: hidden;
	background: var(--ui-bg-muted);
	display: flex;
	align-items: center;
	justify-content: center;
}

.cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.cover-placeholder {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-dimmed);
}

/* Item Info */
.item-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
}

.item-title {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.item-meta {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

.item-source {
	flex-shrink: 0;
}

.link-arrow {
	width: 0.75rem;
	height: 0.75rem;
	color: var(--ui-text-dimmed);
}

.link-target {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	color: var(--ui-primary);
}

.item-message {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
}

/* Item Status */
.item-status {
	flex-shrink: 0;
	width: 1.75rem;
	height: 1.75rem;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: var(--ui-bg-muted);
}

.status-icon {
	width: 1rem;
	height: 1rem;
}

.status--done {
	background: color-mix(in oklch, var(--ui-success) 15%, transparent);
}

.status--done .status-icon {
	color: var(--ui-success);
}

.status--error {
	background: color-mix(in oklch, var(--ui-error) 15%, transparent);
}

.status--error .status-icon {
	color: var(--ui-error);
}

.status--processing {
	background: var(--ui-primary-soft);
}

.status--processing .status-icon {
	color: var(--ui-primary);
	animation: spin 1s linear infinite;
}

.status--queued {
	background: color-mix(in oklch, var(--ui-warning) 15%, transparent);
}

.status--queued .status-icon {
	color: var(--ui-warning);
}

.status--pending {
	background: var(--ui-bg-muted);
}

.status--pending .status-icon {
	color: var(--ui-text-dimmed);
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Primary Badge */
.primary-badge {
	flex-shrink: 0;
	padding: 0.125rem 0.375rem;
	font-size: 0.5625rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: white;
	background: var(--ui-primary);
	border-radius: 0.25rem;
}

/* Footer */
.processing-footer {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding-top: 1rem;
	margin-top: auto;
	border-top: 1px solid var(--ui-border);
}

.footer-note {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin: 0;
}

.note-icon {
	width: 0.875rem;
	height: 0.875rem;
	flex-shrink: 0;
}

@media (max-width: 640px) {
	.processing-footer {
		flex-direction: column;
		align-items: stretch;
	}

	.footer-note {
		order: 2;
		justify-content: center;
		margin-top: 0.5rem;
	}

	.completion-stats {
		flex-direction: column;
		align-items: center;
	}

	.stat-item {
		width: 100%;
		max-width: 200px;
		justify-content: center;
	}
}
</style>
