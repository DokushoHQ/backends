<script setup lang="ts">
import { useImportWizardInjected } from "~/composables/useImportWizard"

const wizard = useImportWizardInjected()

const fileInputRef = ref<HTMLInputElement | null>(null)

const validCount = computed(() =>
	wizard.parsedUrls.value.filter(u => u.status === "valid" && u.selected).length,
)

function toggleUrlSelection(index: number) {
	const item = wizard.parsedUrls.value[index]
	if (item && item.status === "valid") {
		item.selected = !item.selected
	}
}

function triggerFileUpload() {
	fileInputRef.value?.click()
}

async function handleFileUpload(event: Event) {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (!file) return

	await wizard.parseFile(file)

	// Reset the input so the same file can be uploaded again
	input.value = ""
}

const isLoading = computed(() => wizard.parsingUrls.value || wizard.parsingFile.value)
</script>

<template>
	<div class="h-full flex flex-col min-h-0">
		<!-- Main content -->
		<div class="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
			<!-- Left: Input Section -->
			<div class="lg:flex-1 flex flex-col min-h-0">
				<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
					Paste URLs
				</p>
				<div class="flex-1 min-h-[200px] flex flex-col">
					<UTextarea
						v-model="wizard.urlInput.value"
						placeholder="https://mangadex.org/title/...
https://weebcentral.com/series/..."
						class="flex-1 font-mono text-sm [&>textarea]:h-full [&>textarea]:min-h-full"
						:disabled="isLoading"
					/>
				</div>
				<p class="text-xs text-muted-foreground mt-2">
					Paste one URL per line
				</p>
				<UButton
					class="mt-4 w-full lg:w-auto"
					:loading="wizard.parsingUrls.value"
					:disabled="!wizard.urlInput.value.trim() || isLoading"
					@click="wizard.parseUrls()"
				>
					<UIcon
						name="i-lucide-scan-search"
						class="w-4 h-4 mr-2"
					/>
					Parse URLs
				</UButton>

				<!-- Divider -->
				<div class="flex items-center gap-3 my-4">
					<div class="flex-1 h-px bg-border" />
					<span class="text-xs text-muted-foreground">or</span>
					<div class="flex-1 h-px bg-border" />
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
					class="w-full lg:w-auto"
					:loading="wizard.parsingFile.value"
					:disabled="isLoading"
					@click="triggerFileUpload"
				>
					<UIcon
						name="i-lucide-upload"
						class="w-4 h-4 mr-2"
					/>
					Upload CSV / TXT
				</UButton>
				<p class="text-xs text-muted-foreground mt-2">
					CSV must have a column named "url"
				</p>

				<!-- File parsing error -->
				<div
					v-if="wizard.parseFileError.value"
					class="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
				>
					<div class="flex items-center gap-2 text-destructive text-sm">
						<UIcon
							name="i-lucide-alert-circle"
							class="w-4 h-4 flex-shrink-0"
						/>
						{{ wizard.parseFileError.value }}
					</div>
				</div>
			</div>

			<!-- Right: Results Section (desktop) / Below (mobile) -->
			<div
				v-if="wizard.parsedUrls.value.length > 0 || wizard.parseFileStats.value"
				class="lg:flex-1 flex flex-col min-h-0 lg:border-l lg:border-border lg:pl-6"
			>
				<div class="flex items-center justify-between mb-3">
					<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
						Parsed Results
					</p>
					<UBadge variant="subtle">
						{{ wizard.parsedUrls.value.length }}
					</UBadge>
				</div>

				<!-- File stats -->
				<div
					v-if="wizard.parseFileStats.value && (wizard.parseFileStats.value.duplicatesRemoved > 0 || wizard.parseFileStats.value.invalidUrlsRemoved > 0)"
					class="mb-3 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground"
				>
					<span v-if="wizard.parseFileStats.value.totalInFile > 0">
						{{ wizard.parseFileStats.value.totalInFile }} URLs in file
					</span>
					<span
						v-if="wizard.parseFileStats.value.duplicatesRemoved > 0"
						class="ml-2"
					>
						({{ wizard.parseFileStats.value.duplicatesRemoved }} duplicates removed)
					</span>
					<span
						v-if="wizard.parseFileStats.value.invalidUrlsRemoved > 0"
						class="ml-2"
					>
						({{ wizard.parseFileStats.value.invalidUrlsRemoved }} invalid URLs removed)
					</span>
				</div>

				<!-- Empty results state -->
				<div
					v-if="wizard.parsedUrls.value.length === 0"
					class="flex-1 flex items-center justify-center"
				>
					<div class="text-center text-muted-foreground">
						<UIcon
							name="i-lucide-file-x"
							class="w-12 h-12 mx-auto mb-3 opacity-50"
						/>
						<p class="text-sm">
							No valid URLs found
						</p>
						<p class="text-xs mt-1">
							All URLs were duplicates, invalid, or didn't match any source
						</p>
					</div>
				</div>

				<!-- Scrollable results list -->
				<div
					v-else
					class="flex-1 overflow-y-auto min-h-0 space-y-2"
				>
					<div
						v-for="(item, index) in wizard.parsedUrls.value"
						:key="index"
						class="p-3 rounded-lg border border-border"
						:class="[
							item.status === 'valid' ? 'bg-card hover:bg-muted/50 cursor-pointer' : 'bg-muted/30',
						]"
						@click="item.status === 'valid' && toggleUrlSelection(index)"
					>
						<!-- Valid URL -->
						<template v-if="item.status === 'valid'">
							<div class="flex items-center gap-3">
								<UCheckbox
									:model-value="item.selected"
									@click.stop
									@update:model-value="toggleUrlSelection(index)"
								/>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="text-sm font-medium">
											{{ item.sourceName }}
										</span>
										<UBadge
											color="success"
											variant="subtle"
											size="xs"
										>
											Valid
										</UBadge>
									</div>
									<p class="text-xs text-muted-foreground truncate mt-0.5">
										{{ item.url }}
									</p>
								</div>
							</div>
						</template>

						<!-- Already imported -->
						<template v-else-if="item.status === 'imported'">
							<div class="flex items-center gap-3">
								<UIcon
									name="i-lucide-check-circle"
									class="w-5 h-5 text-muted-foreground flex-shrink-0"
								/>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="text-sm font-medium text-muted-foreground">
											{{ item.sourceName }}
										</span>
										<UBadge
											variant="subtle"
											size="xs"
										>
											Already Imported
										</UBadge>
									</div>
									<p class="text-xs text-muted-foreground truncate mt-0.5">
										{{ item.url }}
									</p>
								</div>
							</div>
						</template>

						<!-- Invalid URL -->
						<template v-else>
							<div class="flex items-center gap-3">
								<UIcon
									name="i-lucide-alert-circle"
									class="w-5 h-5 text-destructive flex-shrink-0"
								/>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="text-sm text-destructive">
											{{ item.error || 'Invalid URL' }}
										</span>
										<UBadge
											color="error"
											variant="subtle"
											size="xs"
										>
											Invalid
										</UBadge>
									</div>
									<p class="text-xs text-muted-foreground truncate mt-0.5">
										{{ item.url }}
									</p>
								</div>
							</div>
						</template>
					</div>
				</div>

				<!-- Add button -->
				<UButton
					v-if="validCount > 0"
					class="mt-4 w-full"
					@click="wizard.addParsedUrlsToCart()"
				>
					<UIcon
						name="i-lucide-plus"
						class="w-4 h-4 mr-2"
					/>
					Add {{ validCount }} to Selection
				</UButton>
			</div>

			<!-- Empty state for right panel (desktop only) -->
			<div
				v-else
				class="hidden lg:flex lg:flex-1 items-center justify-center border-l border-border pl-6"
			>
				<div class="text-center text-muted-foreground">
					<UIcon
						name="i-lucide-link"
						class="w-12 h-12 mx-auto mb-3 opacity-50"
					/>
					<p class="text-sm">
						Paste URLs and click Parse
					</p>
					<p class="text-xs mt-1">
						Or upload a CSV/TXT file
					</p>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="flex-shrink-0 pt-4 border-t border-border flex justify-between items-center mt-4">
			<UButton
				variant="outline"
				@click="wizard.goToEntry()"
			>
				<UIcon
					name="i-lucide-arrow-left"
					class="w-4 h-4 mr-2"
				/>
				Back
			</UButton>
			<UButton
				v-if="wizard.cartCount.value > 0"
				@click="wizard.goToReview()"
			>
				Continue to Review ({{ wizard.cartCount.value }})
				<UIcon
					name="i-lucide-arrow-right"
					class="w-4 h-4 ml-2"
				/>
			</UButton>
		</div>
	</div>
</template>
