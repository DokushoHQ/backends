<script setup lang="ts">
definePageMeta({
	layout: "default",
	middleware: "import-guard",
})

const router = useRouter()
const cart = useImportCart()
const backup = useImportBackup()

const fileInputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
	cart.hydrateFromStorage()
	// Reset backup state when returning to upload page
	// so user can upload a new file
	if (!backup.isProcessing.value) {
		backup.reset()
	}
})
const isDragging = ref(false)

const supportedExtensions = [".tmb", ".json", ".tachibk", ".proto.gz"]

function isSupportedFile(filename: string): boolean {
	const lowerName = filename.toLowerCase()
	return supportedExtensions.some(ext => lowerName.endsWith(ext))
}

function triggerFileUpload() {
	fileInputRef.value?.click()
}

async function handleFileUpload(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return

	await backup.uploadBackupFile(file)

	// Reset the input so the same file can be uploaded again
	input.value = ""

	// Navigate to selection page if successful
	if (backup.backupResults.value && !backup.backupError.value) {
		router.push("/series/import/backup/select")
	}
}

function handleDragOver(event: DragEvent) {
	event.preventDefault()
	isDragging.value = true
}

function handleDragLeave() {
	isDragging.value = false
}

async function handleDrop(event: DragEvent) {
	event.preventDefault()
	isDragging.value = false

	const file = event.dataTransfer?.files?.[0]
	if (file && isSupportedFile(file.name)) {
		await backup.uploadBackupFile(file)

		// Navigate to selection page if successful
		if (backup.backupResults.value && !backup.backupError.value) {
			router.push("/series/import/backup/select")
		}
	}
}

function handleTryAgain() {
	backup.reset()
}
</script>

<template>
	<div class="backup-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UiPageHeader
					title="Import Backup"
					description="Upload your backup file"
					back-to="/series/import"
				>
					<template #right>
						<ImporterSharedCartBadge
							v-if="cart.cartCount.value > 0"
							:count="cart.cartCount.value"
							@click="router.push('/series/import/review')"
						/>
					</template>
				</UiPageHeader>
			</template>

			<template #body>
				<div class="backup-content">
					<!-- Error State -->
					<div
						v-if="backup.backupError.value"
						class="state-container"
					>
						<div class="state-icon state-icon--error">
							<UIcon
								name="i-lucide-alert-circle"
								class="icon"
							/>
						</div>
						<h3 class="state-title">
							Failed to parse backup
						</h3>
						<p class="state-description">
							{{ backup.backupError.value }}
						</p>
						<UButton
							variant="outline"
							@click="handleTryAgain"
						>
							Try Again
						</UButton>
					</div>

					<!-- Complete State (brief, while navigating) -->
					<div
						v-else-if="backup.backupResults.value"
						class="state-container"
					>
						<div class="state-icon state-icon--success">
							<UIcon
								name="i-lucide-check"
								class="icon"
							/>
						</div>
						<h3 class="state-title">
							Backup parsed successfully
						</h3>
						<p class="state-description">
							{{ backup.backupResults.value.stats.total }} manga found
						</p>
					</div>

					<!-- Processing State -->
					<div
						v-else-if="backup.isProcessing.value"
						class="state-container"
					>
						<div class="state-icon state-icon--loading">
							<UIcon
								name="i-lucide-loader-2"
								class="icon animate-spin"
							/>
						</div>
						<h3 class="state-title">
							{{ backup.stageLabel.value }}
						</h3>

						<!-- Progress Bar -->
						<div class="progress-container">
							<div class="progress-bar">
								<div
									class="progress-fill"
									:style="{ width: `${backup.backupProgress.value.percent}%` }"
								/>
							</div>
							<p class="progress-text">
								<template v-if="backup.backupProgress.value.current !== undefined && backup.backupProgress.value.total">
									{{ backup.backupProgress.value.current }} / {{ backup.backupProgress.value.total }}
								</template>
								<template v-else>
									{{ backup.backupProgress.value.percent }}%
								</template>
							</p>
						</div>
					</div>

					<!-- Upload State -->
					<div
						v-else
						class="upload-container"
					>
						<!-- Drop Zone -->
						<div
							class="drop-zone"
							:class="{ 'drop-zone--active': isDragging }"
							@click="triggerFileUpload"
							@dragover="handleDragOver"
							@dragleave="handleDragLeave"
							@drop="handleDrop"
						>
							<input
								ref="fileInputRef"
								type="file"
								accept=".tmb,.json,.tachibk,.proto.gz"
								class="hidden"
								@change="handleFileUpload"
							>

							<div class="drop-zone-icon">
								<UIcon
									name="i-lucide-archive"
									class="icon"
								/>
							</div>

							<h3 class="drop-zone-title">
								Upload Backup File
							</h3>
							<p class="drop-zone-description">
								Drag and drop your backup file here, or click to browse
							</p>

							<UButton variant="outline">
								<UIcon
									name="i-lucide-upload"
									class="w-4 h-4 mr-2"
								/>
								Select File
							</UButton>
						</div>

						<!-- Supported Formats Info -->
						<div class="formats-info">
							<div class="formats-header">
								<UIcon
									name="i-lucide-info"
									class="formats-icon"
								/>
								<span class="formats-title">Supported formats</span>
							</div>
							<ul class="formats-list">
								<li>
									<strong>.tachibk</strong>
									<span>Tachiyomi/Mihon backup</span>
								</li>
								<li>
									<strong>.tmb</strong>
									<span>Tachimanga backup</span>
								</li>
								<li>
									<strong>.json</strong>
									<span>Dokusho iOS backup</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
.backup-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 1rem;
}

/* State Container */
.state-container {
	text-align: center;
	max-width: 24rem;
	width: 100%;
}

.state-icon {
	width: 4rem;
	height: 4rem;
	aspect-ratio: 1;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto 1rem;
	flex-shrink: 0;
}

.state-icon .icon {
	width: 2rem;
	height: 2rem;
	flex-shrink: 0;
}

.state-icon--error {
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

.state-icon--success {
	background: var(--ui-success-soft);
	color: var(--ui-success);
}

.state-icon--loading {
	background: var(--ui-primary-soft);
	color: var(--ui-primary);
}

.state-title {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0 0 0.5rem;
}

.state-description {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0 0 1rem;
}

/* Progress */
.progress-container {
	width: 100%;
	margin-top: 1rem;
}

.progress-bar {
	width: 100%;
	height: 0.5rem;
	background: var(--ui-bg-muted);
	border-radius: 0.25rem;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	background: var(--ui-primary);
	transition: width 0.3s ease;
}

.progress-text {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0.75rem 0 0;
}

/* Upload Container */
.upload-container {
	max-width: 28rem;
	width: 100%;
}

/* Drop Zone */
.drop-zone {
	border: 2px dashed var(--ui-border);
	border-radius: var(--radius-card);
	padding: 2.5rem 2rem;
	text-align: center;
	cursor: pointer;
	transition: all 0.15s ease;
}

.drop-zone:hover {
	border-color: color-mix(in oklch, var(--ui-primary) 50%, transparent);
	background: var(--ui-bg-muted);
}

.drop-zone--active {
	border-color: var(--ui-primary);
	background: var(--ui-primary-soft);
}

.drop-zone-icon {
	width: 4rem;
	height: 4rem;
	border-radius: 50%;
	background: var(--ui-primary-soft);
	color: var(--ui-primary);
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto 1rem;
}

.drop-zone-icon .icon {
	width: 2rem;
	height: 2rem;
}

.drop-zone-title {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0 0 0.5rem;
}

.drop-zone-description {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0 0 1.25rem;
}

/* Formats Info */
.formats-info {
	margin-top: 1.5rem;
	padding: 1rem;
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
}

.formats-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 0.75rem;
}

.formats-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-primary);
}

.formats-title {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.formats-list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
}

.formats-list li {
	display: flex;
	gap: 0.5rem;
	font-size: var(--font-size-xs);
}

.formats-list li strong {
	color: var(--ui-text);
	font-weight: 500;
}

.formats-list li span {
	color: var(--ui-text-muted);
}

/* Animation */
@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.animate-spin {
	animation: spin 1s linear infinite;
}
</style>
