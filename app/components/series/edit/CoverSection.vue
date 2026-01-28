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
</script>

<template>
	<div class="cover-section">
		<!-- Cover Preview with Brackets -->
		<div class="cover-frame">
			<div
				v-if="serie.cover"
				class="cover-image-wrapper"
			>
				<NuxtImg
					:src="serie.cover"
					alt="Cover"
					class="cover-image"
				/>
				<!-- Corner brackets -->
				<div class="bracket bracket-tl" />
				<div class="bracket bracket-tr" />
				<div class="bracket bracket-bl" />
				<div class="bracket bracket-br" />
			</div>
			<div
				v-else
				class="no-cover"
			>
				<UIcon
					name="i-lucide-image-off"
					class="no-cover-icon"
				/>
				<span>NO SIGNAL</span>
			</div>
		</div>

		<!-- Source Selector -->
		<div class="source-selector">
			<div class="selector-header">
				<span class="selector-label">SOURCE</span>
				<button
					class="lock-toggle"
					:class="{ locked: isLocked }"
					:disabled="isPending"
					@click="toggleLock"
				>
					<span
						class="led"
						:class="{ active: isLocked }"
					/>
					<span class="lock-text">{{ isLocked ? 'LOCKED' : 'AUTO' }}</span>
				</button>
			</div>

			<div class="source-list">
				<!-- Current source indicator when not locked -->
				<template v-if="!isLocked">
					<div
						v-for="cover in sourceCovers"
						:key="cover.sourceName"
						class="source-item"
						:class="{ current: cover.isCurrent }"
					>
						<span
							class="led"
							:class="{ active: cover.isCurrent }"
						/>
						<span class="source-name">{{ cover.sourceName }}</span>
						<span
							v-if="cover.isPrimary"
							class="primary-tag"
						>PRI</span>
					</div>
				</template>

				<!-- Selectable sources when locked -->
				<template v-else>
					<button
						v-for="cover in sourceCovers"
						:key="cover.sourceName"
						class="source-item selectable"
						:class="{ current: cover.isCurrent }"
						:disabled="isPending"
						@click="uploadCover(cover.url)"
					>
						<span
							class="led"
							:class="{ active: cover.isCurrent }"
						/>
						<span class="source-name">{{ cover.sourceName }}</span>
						<span
							v-if="cover.isPrimary"
							class="primary-tag"
						>PRI</span>
					</button>
				</template>
			</div>
		</div>

		<!-- Custom URL Upload (only when locked) -->
		<div
			v-if="isLocked"
			class="upload-section"
		>
			<span class="upload-label">UPLOAD FROM URL</span>
			<div class="terminal-wrapper">
				<span class="terminal-prompt">&gt;</span>
				<input
					v-model="customCoverUrl"
					type="url"
					placeholder="https://..."
					class="terminal-input"
					:disabled="uploadStatus !== 'idle'"
					@keyup.enter="uploadCover(customCoverUrl)"
				>
			</div>
			<button
				class="upload-btn"
				:class="{
					processing: uploadStatus === 'uploading' || uploadStatus === 'processing',
					success: uploadStatus === 'completed',
					error: uploadStatus === 'error',
				}"
				:disabled="uploadStatus !== 'idle' || !customCoverUrl"
				@click="uploadCover(customCoverUrl)"
			>
				<UIcon
					v-if="uploadStatus === 'uploading' || uploadStatus === 'processing'"
					name="i-lucide-loader-2"
					class="btn-icon spin"
				/>
				<UIcon
					v-else-if="uploadStatus === 'completed'"
					name="i-lucide-check"
					class="btn-icon"
				/>
				<UIcon
					v-else-if="uploadStatus === 'error'"
					name="i-lucide-x"
					class="btn-icon"
				/>
				<span>{{
					uploadStatus === 'idle' ? 'UPLOAD' :
					uploadStatus === 'uploading' ? 'SENDING...' :
					uploadStatus === 'processing' ? 'PROCESSING...' :
					uploadStatus === 'completed' ? 'DONE' : 'FAILED'
				}}</span>
			</button>
			<p
				v-if="uploadError"
				class="error-text"
			>
				<span class="led error" />
				{{ uploadError }}
			</p>
		</div>

		<!-- Hint when unlocked -->
		<p
			v-else
			class="hint"
		>
			Lock to select source or upload custom cover
		</p>
	</div>
</template>

<style scoped>
.cover-section {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	font-family: 'JetBrains Mono', ui-monospace, monospace;
}

/* Cover Frame with Brackets */
.cover-frame {
	position: relative;
	width: 100%;
	max-width: 12rem;
}

.cover-image-wrapper {
	position: relative;
	aspect-ratio: 2 / 3;
	background: var(--ui-bg);
	border-radius: 0.25rem;
	overflow: hidden;
}

.cover-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

/* Corner brackets */
.bracket {
	position: absolute;
	width: 16px;
	height: 16px;
	pointer-events: none;
	z-index: 10;
}

.bracket::before,
.bracket::after {
	content: "";
	position: absolute;
	background: var(--ui-primary);
}

.bracket-tl {
	top: 4px;
	left: 4px;
}
.bracket-tl::before {
	top: 0;
	left: 0;
	width: 12px;
	height: 2px;
}
.bracket-tl::after {
	top: 0;
	left: 0;
	width: 2px;
	height: 12px;
}

.bracket-tr {
	top: 4px;
	right: 4px;
}
.bracket-tr::before {
	top: 0;
	right: 0;
	width: 12px;
	height: 2px;
}
.bracket-tr::after {
	top: 0;
	right: 0;
	width: 2px;
	height: 12px;
}

.bracket-bl {
	bottom: 4px;
	left: 4px;
}
.bracket-bl::before {
	bottom: 0;
	left: 0;
	width: 12px;
	height: 2px;
}
.bracket-bl::after {
	bottom: 0;
	left: 0;
	width: 2px;
	height: 12px;
}

.bracket-br {
	bottom: 4px;
	right: 4px;
}
.bracket-br::before {
	bottom: 0;
	right: 0;
	width: 12px;
	height: 2px;
}
.bracket-br::after {
	bottom: 0;
	right: 0;
	width: 2px;
	height: 12px;
}

/* No cover placeholder */
.no-cover {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	aspect-ratio: 2 / 3;
	background: var(--ui-bg);
	border: 1px dashed var(--ui-border);
	border-radius: 0.25rem;
}

.no-cover-icon {
	width: 1.5rem;
	height: 1.5rem;
	color: var(--ui-text-dimmed);
}

.no-cover span {
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-dimmed);
	letter-spacing: 0.1em;
}

/* Source Selector */
.source-selector {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.selector-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
}

.selector-label {
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	letter-spacing: 0.1em;
}

.lock-toggle {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.25rem 0.5rem;
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 500;
	color: var(--ui-text-muted);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	cursor: pointer;
	transition: all 0.15s ease;
}

.lock-toggle:hover:not(:disabled) {
	border-color: var(--ui-text-muted);
}

.lock-toggle.locked {
	color: var(--ui-primary);
	border-color: var(--ui-primary);
	background: color-mix(in oklch, var(--ui-primary) 10%, transparent);
}

.lock-toggle:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.lock-text {
	letter-spacing: 0.05em;
}

/* LED indicator */
.led {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--ui-text-dimmed);
	flex-shrink: 0;
	transition: all 0.2s ease;
}

.led.active {
	background: var(--ui-primary);
	box-shadow: 0 0 4px color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

.led.error {
	background: var(--ui-error);
	box-shadow: 0 0 4px color-mix(in oklch, var(--ui-error) 30%, transparent);
}

/* Source list */
.source-list {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.source-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.625rem;
	font-family: inherit;
	font-size: var(--font-size-xs);
	color: var(--ui-text);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	text-align: left;
}

.source-item.selectable {
	cursor: pointer;
	transition: all 0.15s ease;
}

.source-item.selectable:hover:not(:disabled) {
	border-color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
}

.source-item.selectable:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.source-item.current {
	border-color: var(--ui-primary);
	background: color-mix(in oklch, var(--ui-primary) 8%, var(--ui-bg-elevated));
}

.source-name {
	flex: 1;
}

.primary-tag {
	font-size: calc(var(--font-size-xs) - 0.0625rem);
	font-weight: 600;
	color: var(--ui-primary);
	padding: 0.125rem 0.375rem;
	background: color-mix(in oklch, var(--ui-primary) 15%, transparent);
	border-radius: 0.125rem;
	letter-spacing: 0.05em;
}

/* Upload section */
.upload-section {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	padding-top: 0.5rem;
	border-top: 1px solid var(--ui-border);
}

.upload-label {
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	letter-spacing: 0.1em;
}

/* Terminal input */
.terminal-wrapper {
	position: relative;
	display: flex;
	align-items: center;
}

.terminal-prompt {
	position: absolute;
	left: 0.625rem;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-primary);
	pointer-events: none;
	z-index: 1;
}

.terminal-input {
	width: 100%;
	padding: 0.5rem 0.625rem 0.5rem 1.375rem;
	font-family: inherit;
	font-size: var(--font-size-xs);
	color: var(--ui-primary);
	background: var(--ui-bg);
	border: 1px solid var(--ui-border);
	border-radius: 0.25rem;
	outline: none;
	transition: all 0.15s ease;
}

.terminal-input::placeholder {
	color: var(--ui-text-dimmed);
}

.terminal-input:focus {
	border-color: var(--ui-primary);
	box-shadow: 0 0 0 1px color-mix(in oklch, var(--ui-primary) 20%, transparent);
}

.terminal-input:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

/* Upload button */
.upload-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.375rem;
	padding: 0.5rem 0.75rem;
	font-family: inherit;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-bg);
	background: var(--ui-primary);
	border: 1px solid var(--ui-primary);
	border-radius: 0.25rem;
	cursor: pointer;
	letter-spacing: 0.05em;
	transition: all 0.15s ease;
}

.upload-btn:hover:not(:disabled) {
	background: color-mix(in oklch, var(--ui-primary) 85%, white);
	box-shadow: 0 0 8px color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

.upload-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.upload-btn.processing {
	background: var(--ui-warning);
	border-color: var(--ui-warning);
}

.upload-btn.success {
	background: var(--ui-success);
	border-color: var(--ui-success);
}

.upload-btn.error {
	background: var(--ui-error);
	border-color: var(--ui-error);
}

.btn-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.spin {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Error text */
.error-text {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	font-size: var(--font-size-xs);
	color: var(--ui-error);
	margin: 0;
}

/* Hint */
.hint {
	font-size: var(--font-size-xs);
	color: var(--ui-text-dimmed);
	margin: 0;
	font-style: italic;
}
</style>
