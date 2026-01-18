<script setup lang="ts">
import { useImportWizardInjected } from "~/composables/useImportWizard"

const wizard = useImportWizardInjected()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

function triggerFileUpload() {
	fileInputRef.value?.click()
}

async function handleFileUpload(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return

	await wizard.uploadBackupFile(file)

	// Reset the input so the same file can be uploaded again
	input.value = ""
}

function handleDragOver(event: DragEvent) {
	event.preventDefault()
	isDragging.value = true
}

function handleDragLeave() {
	isDragging.value = false
}

const supportedExtensions = [".tmb", ".json", ".tachibk", ".proto.gz"]

function isSupportedFile(filename: string): boolean {
	const lowerName = filename.toLowerCase()
	return supportedExtensions.some(ext => lowerName.endsWith(ext))
}

async function handleDrop(event: DragEvent) {
	event.preventDefault()
	isDragging.value = false

	const file = event.dataTransfer?.files?.[0]
	if (file && isSupportedFile(file.name)) {
		await wizard.uploadBackupFile(file)
	}
}

const isProcessing = computed(() => wizard.backupUploading.value || wizard.backupPolling.value)

const stageLabel = computed(() => {
	switch (wizard.backupProgress.value.stage) {
		case "extracting": return "Extracting backup file..."
		case "parsing": return "Parsing manga database..."
		case "mapping": return "Mapping sources..."
		case "checking": return "Checking existing imports..."
		case "complete": return "Complete!"
		default: return "Processing..."
	}
})
</script>

<template>
	<div class="h-full flex flex-col min-h-0">
		<!-- Main content -->
		<div class="flex-1 flex flex-col items-center justify-center px-4">
			<!-- Error State -->
			<div
				v-if="wizard.backupError.value"
				class="text-center max-w-md"
			>
				<div class="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
					<UIcon
						name="i-lucide-alert-circle"
						class="w-8 h-8 text-destructive"
					/>
				</div>
				<h3 class="text-lg font-semibold mb-2">
					Failed to parse backup
				</h3>
				<p class="text-sm text-muted-foreground mb-4">
					{{ wizard.backupError.value }}
				</p>
				<UButton
					variant="outline"
					@click="wizard.startBackupImport()"
				>
					Try Again
				</UButton>
			</div>

			<!-- Processing State -->
			<div
				v-else-if="isProcessing"
				class="text-center max-w-md w-full"
			>
				<div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
					<UIcon
						name="i-lucide-loader-2"
						class="w-8 h-8 text-primary animate-spin"
					/>
				</div>
				<h3 class="text-lg font-semibold mb-2">
					{{ stageLabel }}
				</h3>

				<!-- Progress Bar -->
				<div class="w-full bg-muted rounded-full h-2 overflow-hidden mb-3">
					<div
						class="h-full bg-primary transition-all duration-300"
						:style="{ width: `${wizard.backupProgress.value.percent}%` }"
					/>
				</div>

				<!-- Progress Details -->
				<p class="text-sm text-muted-foreground">
					<template v-if="wizard.backupProgress.value.current !== undefined && wizard.backupProgress.value.total">
						{{ wizard.backupProgress.value.current }} / {{ wizard.backupProgress.value.total }}
					</template>
					<template v-else>
						{{ wizard.backupProgress.value.percent }}%
					</template>
				</p>
			</div>

			<!-- Upload State -->
			<div
				v-else
				class="text-center max-w-md w-full"
			>
				<!-- Drop Zone -->
				<div
					class="border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer"
					:class="[
						isDragging
							? 'border-primary bg-primary/5'
							: 'border-border hover:border-primary hover:bg-muted/50',
					]"
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

					<div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
						<UIcon
							name="i-lucide-archive"
							class="w-8 h-8 text-primary"
						/>
					</div>

					<h3 class="text-lg font-semibold mb-2">
						Upload Backup File
					</h3>
					<p class="text-sm text-muted-foreground mb-4">
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

				<!-- Info Box -->
				<div class="mt-6 p-4 rounded-lg bg-muted/50 text-left">
					<h4 class="text-sm font-medium mb-2 flex items-center gap-2">
						<UIcon
							name="i-lucide-info"
							class="w-4 h-4 text-primary"
						/>
						Supported formats
					</h4>
					<ul class="text-xs text-muted-foreground space-y-1">
						<li>
							<strong>.tachibk</strong> - Tachiyomi/Mihon backup
						</li>
						<li>
							<strong>.tmb</strong> - Tachimanga backup
						</li>
						<li>
							<strong>.json</strong> - Dokusho iOS backup
						</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="flex-shrink-0 pt-4 border-t border-border flex justify-between items-center mt-4">
			<UButton
				variant="outline"
				:disabled="isProcessing"
				@click="wizard.goToEntry()"
			>
				<UIcon
					name="i-lucide-arrow-left"
					class="w-4 h-4 mr-2"
				/>
				Back
			</UButton>
			<div v-if="wizard.cartCount.value > 0">
				<UButton @click="wizard.goToReview()">
					Continue to Review ({{ wizard.cartCount.value }})
					<UIcon
						name="i-lucide-arrow-right"
						class="w-4 h-4 ml-2"
					/>
				</UButton>
			</div>
		</div>
	</div>
</template>
