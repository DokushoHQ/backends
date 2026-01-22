<script setup lang="ts">
import type { DuplicateGroup } from "~/types/duplicates"

const props = defineProps<{
	group: DuplicateGroup | null
}>()

const open = defineModel<boolean>("open", { required: true })

const emit = defineEmits<{
	confirm: [primaryId: string, groupId: string]
}>()

const selectedPrimary = ref<string | null>(null)
const merging = ref(false)

watch(() => props.group, (newGroup) => {
	if (newGroup) {
		selectedPrimary.value = newGroup.suggestedPrimaryId
	}
}, { immediate: true })

async function confirmMerge() {
	if (!props.group || !selectedPrimary.value) return

	merging.value = true
	emit("confirm", selectedPrimary.value, props.group.id)
}

function close() {
	open.value = false
	merging.value = false
}

// Expose merging state reset for parent
defineExpose({
	resetMerging: () => {
		merging.value = false
	},
})
</script>

<template>
	<UModal v-model:open="open">
		<template #content>
			<div
				v-if="group"
				class="merge-modal"
			>
				<div class="merge-header">
					<h3>Select primary series</h3>
					<button
						class="close-button"
						@click="close"
					>
						<UIcon
							name="i-lucide-x"
							class="h-5 w-5"
						/>
					</button>
				</div>

				<p class="merge-description">
					Click to select which series to keep. The other will be merged into it and soft-deleted.
				</p>

				<div class="merge-options">
					<button
						v-for="serie in group.series"
						:key="serie.id"
						class="merge-option"
						:class="{ selected: selectedPrimary === serie.id }"
						@click="selectedPrimary = serie.id"
					>
						<div class="option-cover">
							<NuxtImg
								v-if="serie.cover"
								:src="serie.cover"
								class="w-full h-full object-cover"
							/>
							<div
								v-else
								class="cover-placeholder"
							>
								<UIcon
									name="i-lucide-image"
									class="h-5 w-5"
								/>
							</div>
						</div>
						<div class="option-info">
							<h4>{{ serie.title }}</h4>
							<p>{{ serie.chapterCount }} chapters</p>
							<div class="option-sources">
								<span
									v-for="source in serie.sources"
									:key="source.id"
								>{{ source.name }}</span>
							</div>
						</div>
						<div class="option-status">
							<span
								class="status-label"
								:class="selectedPrimary === serie.id ? 'keep' : 'delete'"
							>
								{{ selectedPrimary === serie.id ? 'Keep' : 'Delete' }}
							</span>
						</div>
						<div
							v-if="serie.id === group.suggestedPrimaryId"
							class="suggested-badge"
						>
							Suggested
						</div>
					</button>
				</div>

				<div class="merge-footer">
					<button
						class="cancel-button"
						@click="close"
					>
						Cancel
					</button>
					<button
						class="confirm-button"
						:disabled="!selectedPrimary || merging"
						@click="confirmMerge"
					>
						<UIcon
							v-if="merging"
							name="i-lucide-loader-2"
							class="h-4 w-4 animate-spin"
						/>
						<template v-else>
							<UIcon
								name="i-lucide-git-merge"
								class="h-4 w-4"
							/>
							<span>Confirm merge</span>
						</template>
					</button>
				</div>
			</div>
		</template>
	</UModal>
</template>

<style scoped>
.merge-modal {
	--accent: oklch(0.7 0.15 250);
	--accent-soft: oklch(0.7 0.15 250 / 0.15);

	padding: 1.5rem;
	max-width: 32rem;
}

.merge-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 0.5rem;
}

.merge-header h3 {
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--color-text);
}

.close-button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2rem;
	height: 2rem;
	color: var(--color-text-muted);
	border-radius: 0.375rem;
	transition: all 0.15s ease;
}

.close-button:hover {
	color: var(--color-text);
	background: var(--color-muted);
}

.merge-description {
	font-size: 0.875rem;
	color: var(--color-text-muted);
	margin-bottom: 1.25rem;
}

.merge-options {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	margin-bottom: 1.5rem;
}

.merge-option {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.875rem;
	padding: 0.875rem;
	text-align: left;
	background: var(--color-background);
	border: 2px solid var(--color-border);
	border-radius: 0.625rem;
	transition: all 0.15s ease;
	cursor: pointer;
}

.merge-option:hover {
	border-color: var(--color-text-muted);
}

.merge-option.selected {
	border-color: var(--accent);
	background: var(--accent-soft);
}

.option-cover {
	width: 3.5rem;
	height: 5rem;
	border-radius: 0.375rem;
	overflow: hidden;
	background: var(--color-muted);
	flex-shrink: 0;
}

.cover-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	color: var(--color-text-muted);
}

.option-info {
	flex: 1;
	min-width: 0;
}

.option-info h4 {
	font-size: 0.875rem;
	font-weight: 600;
	color: var(--color-text);
	margin-bottom: 0.25rem;
	display: -webkit-box;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.option-info p {
	font-size: 0.8125rem;
	color: var(--color-text-muted);
	margin-bottom: 0.375rem;
}

.option-sources {
	display: flex;
	flex-wrap: wrap;
	gap: 0.25rem;
}

.option-sources span {
	padding: 0.125rem 0.375rem;
	font-size: 0.6875rem;
	font-weight: 500;
	color: var(--color-text-muted);
	background: var(--color-muted);
	border-radius: 0.25rem;
}

.option-status {
	flex-shrink: 0;
}

.status-label {
	padding: 0.25rem 0.625rem;
	font-size: 0.6875rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	border-radius: 1rem;
	transition: all 0.15s ease;
}

.status-label.keep {
	color: white;
	background: var(--accent);
}

.status-label.delete {
	color: var(--color-text-muted);
	background: var(--color-muted);
}

.suggested-badge {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	padding: 0.1875rem 0.5rem;
	font-size: 0.625rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--accent);
	background: var(--accent-soft);
	border-radius: 1rem;
}

.merge-footer {
	display: flex;
	justify-content: flex-end;
	gap: 0.75rem;
}

.cancel-button {
	padding: 0.625rem 1rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--color-text-muted);
	background: var(--color-muted);
	border-radius: 0.5rem;
	transition: all 0.15s ease;
}

.cancel-button:hover {
	color: var(--color-text);
}

.confirm-button {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.625rem 1.25rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: white;
	background: var(--accent);
	border-radius: 0.5rem;
	transition: all 0.15s ease;
}

.confirm-button:hover:not(:disabled) {
	background: oklch(0.6 0.18 250);
}

.confirm-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
</style>
