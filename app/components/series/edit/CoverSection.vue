<script setup lang="ts">
import type { UISerie } from "#shared/ui/type/serie"

const props = defineProps<{
	serie: UISerie
}>()

const emit = defineEmits<{
	updated: []
}>()

const isPending = ref(false)
const customCoverUrl = ref("")
const uploadStatus = ref<"idle" | "uploading" | "processing" | "completed" | "error">("idle")
const uploadError = ref<string | null>(null)

const isLocked = computed(() => (props.serie.locked_fields ?? []).includes("cover"))

// Collect covers from all sources
const sourceCovers = computed(() =>
	props.serie.sources
		.filter(s => s.cover)
		.map(s => ({
			url: s.cover as string,
			sourceName: s.source.name,
			isPrimary: s.is_primary,
			isCurrent: s.cover === props.serie.cover,
		})),
)

async function toggleLock() {
	isPending.value = true
	try {
		await $fetch(`/api/v1/serie/${props.serie.id}/field`, {
			method: "POST",
			body: { field: "cover", action: isLocked.value ? "unlock" : "lock" },
		})
		emit("updated")
	}
	catch (e: unknown) {
		console.error("Failed to toggle lock:", e)
	}
	finally {
		isPending.value = false
	}
}

async function uploadCover(url: string) {
	if (!url) return

	uploadError.value = null
	uploadStatus.value = "uploading"
	isPending.value = true

	try {
		await $fetch<{ success: boolean, jobId: string }>(`/api/v1/serie/${props.serie.id}/cover`, {
			method: "POST",
			body: { coverUrl: url },
		})

		uploadStatus.value = "processing"
		customCoverUrl.value = ""

		// Simple polling simulation - wait and assume success
		let attempts = 0
		while (attempts < 30) {
			await new Promise(resolve => setTimeout(resolve, 1000))
			attempts++
			if (attempts === 3) {
				uploadStatus.value = "completed"
				emit("updated")
				setTimeout(() => {
					uploadStatus.value = "idle"
				}, 2000)
				return
			}
		}
	}
	catch (e: unknown) {
		const fetchError = e as { data?: { message?: string }, message?: string }
		uploadError.value = fetchError.data?.message || fetchError.message || "Failed to upload cover"
		uploadStatus.value = "error"
		setTimeout(() => {
			uploadStatus.value = "idle"
		}, 3000)
	}
	finally {
		isPending.value = false
	}
}

const statusLabels: Record<typeof uploadStatus.value, string> = {
	idle: "Upload",
	uploading: "Uploading...",
	processing: "Processing...",
	completed: "Done!",
	error: "Failed",
}

const uploadButtonText = computed(() => statusLabels[uploadStatus.value])
</script>

<template>
	<section class="edit-section">
		<div class="section-header">
			<div class="section-title">
				<div class="section-icon">
					<UIcon
						name="i-lucide-image"
						class="icon"
					/>
				</div>
				<div>
					<h2>Cover</h2>
					<p>The cover image displayed for this series</p>
				</div>
			</div>
			<button
				class="lock-toggle"
				:class="{ locked: isLocked }"
				:disabled="isPending"
				@click="toggleLock"
			>
				<UIcon
					:name="isLocked ? 'i-lucide-lock' : 'i-lucide-lock-open'"
					class="lock-icon"
				/>
				<span>{{ isLocked ? "Locked" : "Auto" }}</span>
			</button>
		</div>

		<div class="section-body">
			<!-- Cover gallery -->
			<div class="cover-gallery">
				<span class="label">{{ isLocked ? 'Select cover' : 'Current cover' }}</span>
				<div class="gallery-grid">
					<!-- Current cover -->
					<div
						v-if="serie.cover"
						class="cover-item current"
						:class="{ selectable: isLocked }"
					>
						<NuxtImg
							:src="serie.cover"
							alt="Current cover"
							class="cover-image"
						/>
						<div class="cover-badge current-badge">
							<UIcon
								name="i-lucide-check"
								class="badge-icon"
							/>
							Current
						</div>
					</div>

					<!-- Alternative covers (only when locked) -->
					<template v-if="isLocked">
						<button
							v-for="cover in sourceCovers.filter(c => !c.isCurrent)"
							:key="cover.sourceName"
							class="cover-item selectable"
							:disabled="isPending"
							@click="uploadCover(cover.url)"
						>
							<NuxtImg
								:src="cover.url"
								:alt="`${cover.sourceName} cover`"
								class="cover-image"
							/>
							<div class="cover-label">
								{{ cover.sourceName }}
								<span
									v-if="cover.isPrimary && serie.sources.length > 1"
									class="primary-tag"
								>Primary</span>
							</div>
						</button>
					</template>

					<!-- No cover placeholder -->
					<div
						v-if="!serie.cover && sourceCovers.length === 0"
						class="no-cover"
					>
						<UIcon
							name="i-lucide-image-off"
							class="no-cover-icon"
						/>
						<span>No cover available</span>
					</div>
				</div>
			</div>

			<!-- Custom URL upload (only when locked) -->
			<template v-if="isLocked">
				<div class="custom-upload">
					<span class="label">Upload from URL</span>
					<p class="upload-hint">
						Image will be downloaded and stored permanently
					</p>
					<div class="upload-row">
						<input
							v-model="customCoverUrl"
							type="url"
							placeholder="https://example.com/cover.jpg"
							class="url-input"
							:disabled="uploadStatus !== 'idle'"
						>
						<button
							class="upload-button"
							:class="{
								success: uploadStatus === 'completed',
								error: uploadStatus === 'error',
							}"
							:disabled="uploadStatus !== 'idle' || !customCoverUrl"
							@click="uploadCover(customCoverUrl)"
						>
							<UIcon
								v-if="uploadStatus === 'uploading' || uploadStatus === 'processing'"
								name="i-lucide-loader-2"
								class="spinner"
							/>
							<UIcon
								v-else-if="uploadStatus === 'completed'"
								name="i-lucide-check"
								class="status-icon"
							/>
							<UIcon
								v-else-if="uploadStatus === 'error'"
								name="i-lucide-x"
								class="status-icon"
							/>
							<span>{{ uploadButtonText }}</span>
						</button>
					</div>
					<p
						v-if="uploadStatus === 'processing'"
						class="status-message processing"
					>
						<UIcon
							name="i-lucide-loader-2"
							class="spinner-sm"
						/>
						Processing image... This may take a few seconds.
					</p>
					<p
						v-if="uploadError"
						class="status-message error"
					>
						<UIcon
							name="i-lucide-alert-circle"
							class="error-icon"
						/>
						{{ uploadError }}
					</p>
				</div>
			</template>

			<!-- Unlocked hint -->
			<p
				v-else
				class="hint"
			>
				Lock this field to select a different cover or upload a custom one. When unlocked, the cover updates automatically from sources.
			</p>
		</div>
	</section>
</template>

<style scoped>
.edit-section {
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: 0.75rem;
	overflow: hidden;
}

/* Section header */
.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem 1.25rem;
	border-bottom: 1px solid var(--ui-border-muted);
}

.section-title {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.section-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
	background: color-mix(in oklch, var(--color-purple) 15%, transparent);
	border-radius: 0.375rem;
}

.section-icon .icon {
	width: 1rem;
	height: 1rem;
	color: var(--color-purple);
}

.section-title h2 {
	font-size: var(--font-size-base);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
}

.section-title p {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
	margin: 0;
}

/* Lock toggle */
.lock-toggle {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem 0.75rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	border: 1px solid var(--ui-border);
	border-radius: 2rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.lock-toggle:hover:not(:disabled) {
	border-color: var(--ui-text-muted);
}

.lock-toggle.locked {
	color: var(--ui-primary);
	background: var(--ui-primary-soft);
	border-color: transparent;
}

.lock-toggle:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.lock-icon {
	width: 0.875rem;
	height: 0.875rem;
}

/* Section body */
.section-body {
	padding: 1.25rem;
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
}

/* Labels */
.label {
	display: block;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	text-transform: uppercase;
	letter-spacing: 0.03em;
	margin-bottom: 0.5rem;
}

/* Cover gallery */
.cover-gallery {
	padding-top: 0.25rem;
}

.gallery-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
}

.cover-item {
	position: relative;
	width: 7rem;
	border-radius: 0.5rem;
	overflow: hidden;
	background: var(--ui-bg-muted);
	border: 2px solid transparent;
	transition: all 0.15s ease;
}

.cover-item.selectable {
	cursor: pointer;
}

.cover-item.selectable:hover:not(:disabled) {
	border-color: var(--ui-text-muted);
}

.cover-item.current {
	border-color: var(--ui-primary);
}

.cover-item:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.cover-image {
	width: 100%;
	aspect-ratio: 2 / 3;
	object-fit: cover;
	display: block;
}

.cover-badge {
	position: absolute;
	top: 0.375rem;
	left: 0.375rem;
	display: flex;
	align-items: center;
	gap: 0.25rem;
	padding: 0.25rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 0.25rem;
}

.current-badge {
	color: var(--ui-bg);
	background: var(--ui-primary);
}

.badge-icon {
	width: 0.75rem;
	height: 0.75rem;
}

.cover-label {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 0.375rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: white;
	background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
	text-align: center;
}

.primary-tag {
	display: block;
	font-size: 0.625rem;
	opacity: 0.8;
}

.no-cover {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 7rem;
	aspect-ratio: 2 / 3;
	background: var(--ui-bg-muted);
	border: 1px dashed var(--ui-border);
	border-radius: 0.5rem;
	color: var(--ui-text-dimmed);
}

.no-cover-icon {
	width: 1.5rem;
	height: 1.5rem;
	margin-bottom: 0.25rem;
}

.no-cover span {
	font-size: var(--font-size-xs);
}

/* Custom upload */
.custom-upload {
	padding-top: 0.25rem;
}

.upload-hint {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	margin: -0.25rem 0 0.75rem 0;
}

.upload-row {
	display: flex;
	gap: 0.5rem;
}

.url-input {
	flex: 1;
	padding: 0.625rem 0.875rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	outline: none;
	transition: border-color 0.15s ease;
}

.url-input::placeholder {
	color: var(--ui-text-dimmed);
}

.url-input:focus {
	border-color: var(--ui-primary);
}

.url-input:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.upload-button {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	min-width: 6rem;
	padding: 0.625rem 1rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-bg);
	background: var(--ui-primary);
	border: none;
	border-radius: 0.5rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.upload-button:hover:not(:disabled) {
	opacity: 0.9;
}

.upload-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.upload-button.success {
	background: var(--ui-success);
}

.upload-button.error {
	background: var(--ui-error);
}

.spinner,
.status-icon {
	width: 1rem;
	height: 1rem;
}

.spinner {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.status-message {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	margin-top: 0.75rem;
	font-size: var(--font-size-xs);
}

.status-message.processing {
	color: var(--ui-info);
}

.status-message.error {
	color: var(--ui-error);
}

.spinner-sm,
.error-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.spinner-sm {
	animation: spin 1s linear infinite;
}

/* Hint */
.hint {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0;
	line-height: 1.5;
}
</style>
