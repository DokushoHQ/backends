<script setup lang="ts">
definePageMeta({
	layout: "default",
	middleware: "import-guard",
})

const router = useRouter()
const cart = useImportCart()
const urls = useImportUrls()

const fileInputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
	cart.hydrateFromStorage()
})

function triggerFileUpload() {
	fileInputRef.value?.click()
}

async function handleFileUpload(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return

	await urls.parseFile(file)

	// Reset the input so the same file can be uploaded again
	input.value = ""
}

async function handleAddToCart() {
	await urls.addParsedUrlsToCart()
	router.push("/series/import/review")
}
</script>

<template>
	<div class="urls-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UDashboardNavbar
					title="Import URLs"
					description="Paste URLs or upload a file"
				>
					<template #leading>
						<UButton
							icon="i-lucide-arrow-left"
							variant="ghost"
							size="sm"
							@click="router.push('/series/import')"
						/>
					</template>
					<template #right>
						<ImporterSharedCartBadge
							v-if="cart.cartCount.value > 0"
							:count="cart.cartCount.value"
							@click="router.push('/series/import/review')"
						/>
					</template>
				</UDashboardNavbar>
			</template>

			<template #body>
				<div class="urls-layout">
					<!-- Left: Input Section -->
					<div class="input-section">
						<div class="section-label">
							Paste URLs
						</div>
						<div class="textarea-wrapper">
							<UTextarea
								v-model="urls.urlInput.value"
								placeholder="https://mangadex.org/title/...
https://weebcentral.com/series/..."
								class="url-textarea"
								:disabled="urls.isLoading.value"
							/>
						</div>
						<p class="input-hint">
							Paste one URL per line
						</p>
						<UButton
							class="w-full mt-4"
							:loading="urls.parsingUrls.value"
							:disabled="!urls.urlInput.value.trim() || urls.isLoading.value"
							@click="urls.parseUrls()"
						>
							<UIcon
								name="i-lucide-scan-search"
								class="w-4 h-4 mr-2"
							/>
							Parse URLs
						</UButton>

						<!-- Divider -->
						<div class="divider">
							<div class="divider-line" />
							<span class="divider-text">or</span>
							<div class="divider-line" />
						</div>

						<!-- File Upload -->
						<input
							ref="fileInputRef"
							type="file"
							accept=".csv,.txt"
							class="hidden"
							@change="handleFileUpload"
						>
						<UButton
							variant="outline"
							class="w-full"
							:loading="urls.parsingFile.value"
							:disabled="urls.isLoading.value"
							@click="triggerFileUpload"
						>
							<UIcon
								name="i-lucide-upload"
								class="w-4 h-4 mr-2"
							/>
							Upload CSV / TXT
						</UButton>
						<p class="input-hint">
							CSV must have a column named "url"
						</p>

						<!-- File parsing error -->
						<div
							v-if="urls.parseFileError.value"
							class="error-box"
						>
							<UIcon
								name="i-lucide-alert-circle"
								class="error-icon"
							/>
							{{ urls.parseFileError.value }}
						</div>
					</div>

					<!-- Right: Results Section -->
					<div
						v-if="urls.parsedUrls.value.length > 0 || urls.parseFileStats.value"
						class="results-section"
					>
						<div class="results-header">
							<span class="section-label">Parsed Results</span>
							<UBadge variant="subtle">
								{{ urls.parsedUrls.value.length }}
							</UBadge>
						</div>

						<!-- File stats -->
						<div
							v-if="urls.parseFileStats.value && (urls.parseFileStats.value.duplicatesRemoved > 0 || urls.parseFileStats.value.invalidUrlsRemoved > 0)"
							class="file-stats"
						>
							<span v-if="urls.parseFileStats.value.totalInFile > 0">
								{{ urls.parseFileStats.value.totalInFile }} URLs in file
							</span>
							<span v-if="urls.parseFileStats.value.duplicatesRemoved > 0">
								({{ urls.parseFileStats.value.duplicatesRemoved }} duplicates removed)
							</span>
							<span v-if="urls.parseFileStats.value.invalidUrlsRemoved > 0">
								({{ urls.parseFileStats.value.invalidUrlsRemoved }} invalid URLs removed)
							</span>
						</div>

						<!-- Empty results state -->
						<div
							v-if="urls.parsedUrls.value.length === 0"
							class="empty-results"
						>
							<UIcon
								name="i-lucide-file-x"
								class="empty-icon"
							/>
							<p class="empty-text">
								No valid URLs found
							</p>
							<p class="empty-hint">
								All URLs were duplicates, invalid, or didn't match any source
							</p>
						</div>

						<!-- Scrollable results list -->
						<div
							v-else
							class="results-list"
						>
							<div
								v-for="(item, index) in urls.parsedUrls.value"
								:key="index"
								class="result-item"
								:class="{
									'result-item--valid': item.status === 'valid',
									'result-item--imported': item.status === 'imported',
									'result-item--invalid': item.status === 'invalid',
								}"
								@click="item.status === 'valid' && urls.toggleUrlSelection(index)"
							>
								<!-- Valid URL -->
								<template v-if="item.status === 'valid'">
									<UCheckbox
										:model-value="item.selected"
										@click.stop
										@update:model-value="urls.toggleUrlSelection(index)"
									/>
									<div class="result-content">
										<div class="result-header">
											<span class="result-source">{{ item.sourceName }}</span>
											<UBadge
												color="success"
												variant="subtle"
												size="xs"
											>
												Valid
											</UBadge>
										</div>
										<p class="result-url">
											{{ item.url }}
										</p>
									</div>
								</template>

								<!-- Already imported -->
								<template v-else-if="item.status === 'imported'">
									<UIcon
										name="i-lucide-check-circle"
										class="result-status-icon result-status-icon--imported"
									/>
									<div class="result-content">
										<div class="result-header">
											<span class="result-source result-source--muted">{{ item.sourceName }}</span>
											<UBadge
												variant="subtle"
												size="xs"
											>
												Already Imported
											</UBadge>
										</div>
										<p class="result-url">
											{{ item.url }}
										</p>
									</div>
								</template>

								<!-- Invalid URL -->
								<template v-else>
									<UIcon
										name="i-lucide-alert-circle"
										class="result-status-icon result-status-icon--invalid"
									/>
									<div class="result-content">
										<div class="result-header">
											<span class="result-error">{{ item.error || 'Invalid URL' }}</span>
											<UBadge
												color="error"
												variant="subtle"
												size="xs"
											>
												Invalid
											</UBadge>
										</div>
										<p class="result-url">
											{{ item.url }}
										</p>
									</div>
								</template>
							</div>
						</div>

						<!-- Add button -->
						<UButton
							v-if="urls.validCount.value > 0"
							class="w-full mt-4"
							:loading="urls.addingToCart.value"
							@click="handleAddToCart"
						>
							<UIcon
								name="i-lucide-plus"
								class="w-4 h-4 mr-2"
							/>
							Add {{ urls.validCount.value }} to Selection
						</UButton>
					</div>

					<!-- Empty state for right panel -->
					<div
						v-else
						class="results-section results-section--empty"
					>
						<UIcon
							name="i-lucide-link"
							class="empty-icon-large"
						/>
						<p class="empty-text">
							Paste URLs and click Parse
						</p>
						<p class="empty-hint">
							Or upload a CSV/TXT file
						</p>
					</div>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
.urls-layout {
	display: flex;
	flex-direction: column;
	flex: 1;
	gap: 1.5rem;
	min-height: 0;
}

@media (min-width: 1024px) {
	.urls-layout {
		flex-direction: row;
	}
}

/* Input Section */
.input-section {
	display: flex;
	flex-direction: column;
}

@media (min-width: 1024px) {
	.input-section {
		flex: 1;
	}
}

.section-label {
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.03em;
	margin-bottom: 0.5rem;
}

.textarea-wrapper {
	flex: 1;
	min-height: 12rem;
	width: 100%;
}

.url-textarea {
	width: 100%;
	height: 100%;
	font-family: ui-monospace, monospace;
	font-size: var(--font-size-sm);
}

.url-textarea :deep(textarea) {
	width: 100%;
	height: 100%;
	min-height: 100%;
}

.input-hint {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin-top: 0.5rem;
}

/* Divider */
.divider {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	margin: 1rem 0;
}

.divider-line {
	flex: 1;
	height: 1px;
	background: var(--ui-border);
}

.divider-text {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

/* Error Box */
.error-box {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-top: 0.75rem;
	padding: 0.75rem;
	font-size: var(--font-size-sm);
	color: var(--ui-error);
	background: var(--ui-error-soft);
	border: 1px solid color-mix(in oklch, var(--ui-error) 20%, transparent);
	border-radius: 0.5rem;
}

.error-icon {
	width: 1rem;
	height: 1rem;
	flex-shrink: 0;
}

/* Results Section */
.results-section {
	display: flex;
	flex-direction: column;
	min-height: 0;
}

@media (min-width: 1024px) {
	.results-section {
		flex: 1;
		border-left: 1px solid var(--ui-border);
		padding-left: 1.5rem;
	}
}

.results-section--empty {
	align-items: center;
	justify-content: center;
	text-align: center;
}

.results-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 0.75rem;
}

.file-stats {
	padding: 0.5rem;
	margin-bottom: 0.75rem;
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
}

/* Empty Results */
.empty-results {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
}

.empty-icon {
	width: 3rem;
	height: 3rem;
	color: var(--ui-text-dimmed);
	opacity: 0.5;
	margin-bottom: 0.75rem;
}

.empty-icon-large {
	width: 3rem;
	height: 3rem;
	color: var(--ui-text-dimmed);
	opacity: 0.5;
	margin-bottom: 0.75rem;
}

.empty-text {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0;
}

.empty-hint {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	margin: 0.25rem 0 0;
}

/* Results List */
.results-list {
	flex: 1;
	overflow-y: auto;
	min-height: 0;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.result-item {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
}

.result-item--valid {
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.result-item--valid:hover {
	background: var(--ui-bg-muted);
}

.result-item--imported,
.result-item--invalid {
	background: var(--ui-bg-muted);
	opacity: 0.7;
}

.result-status-icon {
	width: 1.25rem;
	height: 1.25rem;
	flex-shrink: 0;
}

.result-status-icon--imported {
	color: var(--ui-text-muted);
}

.result-status-icon--invalid {
	color: var(--ui-error);
}

.result-content {
	flex: 1;
	min-width: 0;
}

.result-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.result-source {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.result-source--muted {
	color: var(--ui-text-muted);
}

.result-error {
	font-size: var(--font-size-sm);
	color: var(--ui-error);
}

.result-url {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin: 0.125rem 0 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
