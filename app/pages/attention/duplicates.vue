<script setup lang="ts">
import type { DuplicateGroup, DuplicatePagination } from "~/types/duplicates"

definePageMeta({
	title: "Duplicates",
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

// URL-based state
const page = computed(() => Math.max(1, Number.parseInt(String(route.query.page || "1"), 10)))
const statusFilter = computed(() => (route.query.status as string) || "Pending")

// Fetch duplicate groups
const { data, pending, error, refresh } = await useFetch("/api/v1/duplicates", {
	query: computed(() => ({
		page: page.value,
		status: statusFilter.value,
	})),
})

const groups = computed(() => (data.value?.groups ?? []) as DuplicateGroup[])
const pagination = computed(() => (data.value?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }) as DuplicatePagination)

// Detection
const { detecting, progress, startDetection, checkActiveJob, pollJobStatus } = useDuplicateDetection()

// Track if initial animation has played
const hasAnimated = ref(false)
watch(groups, () => {
	if (groups.value.length > 0 && !hasAnimated.value) {
		setTimeout(() => {
			hasAnimated.value = true
		}, 50)
	}
}, { immediate: true })

// Reset animation flag when page or status changes
watch([page, statusFilter], () => {
	hasAnimated.value = false
})

// Poll and refresh on completion
const detectionWatcher = setInterval(async () => {
	if (detecting.value) {
		const result = await pollJobStatus()
		if (result?.completed) {
			hasAnimated.value = false
			await refresh()
		}
	}
}, 2000)

onMounted(() => {
	checkActiveJob()
})

onUnmounted(() => {
	clearInterval(detectionWatcher)
})

// Merge state
const mergeDialog = ref(false)
const mergeGroup = ref<DuplicateGroup | null>(null)
const mergeModalRef = ref<{ resetMerging: () => void } | null>(null)

function openMergeDialog(group: DuplicateGroup) {
	mergeGroup.value = group
	mergeDialog.value = true
}

async function handleMerge(primaryId: string, groupId: string) {
	const group = groups.value.find(g => g.id === groupId)
	if (!group) return

	try {
		const sourceIds = group.series
			.filter(s => s.id !== primaryId)
			.map(s => s.id)

		await $fetch(`/api/v1/serie/${primaryId}/merge`, {
			method: "POST",
			body: {
				sourceSerieIds: sourceIds,
				duplicateGroupId: groupId,
			},
		})

		toast.add({
			title: "Merge queued",
			description: `Merging ${sourceIds.length} series`,
			color: "success",
		})

		mergeDialog.value = false
		await refresh()
	}
	catch (err: unknown) {
		const error = err as { data?: { message?: string } }
		toast.add({
			title: "Merge failed",
			description: error.data?.message ?? "Unknown error",
			color: "error",
		})
	}
	finally {
		mergeModalRef.value?.resetMerging()
	}
}

async function dismissGroup(groupId: string) {
	try {
		await $fetch(`/api/v1/duplicates/${groupId}/dismiss`, { method: "POST" })
		toast.add({
			title: "Group dismissed",
			description: "Marked as not duplicates",
			color: "success",
		})
		await refresh()
	}
	catch (err: unknown) {
		const error = err as { data?: { message?: string } }
		toast.add({
			title: "Dismiss failed",
			description: error.data?.message ?? "Unknown error",
			color: "error",
		})
	}
}

// Pagination
function setPage(newPage: number) {
	const query = { ...route.query }
	if (newPage === 1) {
		delete query.page
	}
	else {
		query.page = String(newPage)
	}
	router.push({ query })
}

function setStatus(status: string) {
	router.push({ query: { status, page: undefined } })
}

const statusOptions = [
	{ label: "Pending", value: "Pending" },
	{ label: "Merged", value: "Merged" },
	{ label: "Dismissed", value: "Dismissed" },
]

// Two-way binding for segmented control
const selectedStatus = computed({
	get: () => statusFilter.value,
	set: (value: string) => setStatus(value),
})
</script>

<template>
	<div class="duplicates-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UDashboardNavbar
					title="Duplicates"
					:description="`${pagination.total} pairs to review`"
				>
					<template #right>
						<div class="flex items-center gap-3">
							<UiSegmentedControl
								v-model="selectedStatus"
								:options="statusOptions"
							/>
							<button
								class="scan-button"
								:class="{ scanning: detecting }"
								:disabled="detecting"
								@click="startDetection"
							>
								<UIcon
									:name="detecting ? 'i-lucide-loader-2' : 'i-lucide-radar'"
									class="scan-icon"
									:class="{ 'animate-spin': detecting }"
								/>
								<span>{{ detecting ? 'Scanning' : 'Scan' }}</span>
							</button>
							<UiBackButton to="/attention" />
						</div>
					</template>
				</UDashboardNavbar>
			</template>

			<template #body>
				<!-- Loading state -->
				<div
					v-if="pending"
					class="state-container"
				>
					<div class="state-icon-wrapper">
						<UIcon
							name="i-lucide-loader-2"
							class="h-8 w-8 animate-spin text-primary/60"
						/>
					</div>
				</div>

				<!-- Error state -->
				<div
					v-else-if="error"
					class="state-container"
				>
					<div class="state-icon-wrapper error">
						<UIcon
							name="i-lucide-alert-triangle"
							class="h-8 w-8"
						/>
					</div>
					<h3 class="state-title">
						Failed to load
					</h3>
					<p class="state-description">
						{{ error.message }}
					</p>
					<button
						class="retry-button"
						@click="refresh()"
					>
						Try again
					</button>
				</div>

				<!-- Scanning state -->
				<DuplicatesScanProgress
					v-else-if="detecting"
					:progress="progress"
				/>

				<!-- Empty state -->
				<div
					v-else-if="groups.length === 0"
					class="state-container"
				>
					<div class="state-icon-wrapper success">
						<UIcon
							name="i-lucide-check"
							class="h-8 w-8"
						/>
					</div>
					<h3 class="state-title">
						{{ statusFilter === 'Pending' ? 'All clear' : `No ${statusFilter.toLowerCase()} pairs` }}
					</h3>
					<p class="state-description">
						{{ statusFilter === 'Pending' ? 'No duplicate pairs detected. Run a scan to check again.' : 'Nothing here yet.' }}
					</p>
				</div>

				<!-- Duplicate pairs grid -->
				<div
					v-else
					class="pairs-container"
				>
					<div class="pairs-grid">
						<DuplicatesPairCard
							v-for="(group, index) in groups"
							:key="group.id"
							:group="group"
							:animate="!hasAnimated"
							:delay="index * 50"
							@dismiss="dismissGroup"
							@merge="openMergeDialog"
						/>
					</div>

					<DuplicatesPagination
						:page="page"
						:total-pages="pagination.totalPages"
						@update:page="setPage"
					/>
				</div>
			</template>
		</UDashboardPanel>

		<!-- Merge Dialog -->
		<DuplicatesMergeModal
			ref="mergeModalRef"
			v-model:open="mergeDialog"
			:group="mergeGroup"
			@confirm="handleMerge"
		/>
	</div>
</template>

<style scoped>
.duplicates-page {
	--accent: oklch(0.7 0.15 250);
	--accent-soft: oklch(0.7 0.15 250 / 0.15);
	--success: oklch(0.72 0.15 160);
	--success-soft: oklch(0.72 0.15 160 / 0.15);
	--danger: oklch(0.65 0.2 25);
	--danger-soft: oklch(0.65 0.2 25 / 0.15);
}

/* Scan button */
.scan-button {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 1rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: white;
	background: linear-gradient(135deg, var(--accent), oklch(0.6 0.18 250));
	border-radius: 0.5rem;
	transition: all 0.2s ease;
	box-shadow: 0 2px 8px oklch(0.7 0.15 250 / 0.3);
}

.scan-button:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: 0 4px 12px oklch(0.7 0.15 250 / 0.4);
}

.scan-button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
}

.scan-button.scanning {
	background: var(--color-muted);
	color: var(--color-text-muted);
	box-shadow: none;
}

.scan-icon {
	font-size: 1.125rem;
}

/* State containers */
.state-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	text-align: center;
}

.state-icon-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 4rem;
	height: 4rem;
	margin-bottom: 1.5rem;
	border-radius: 1rem;
	background: var(--color-muted);
	color: var(--color-text-muted);
}

.state-icon-wrapper.success {
	background: var(--success-soft);
	color: var(--success);
}

.state-icon-wrapper.error {
	background: var(--danger-soft);
	color: var(--danger);
}

.state-title {
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--color-text);
	margin-bottom: 0.5rem;
}

.state-description {
	font-size: 0.875rem;
	color: var(--color-text-muted);
	max-width: 24rem;
}

.retry-button {
	margin-top: 1.5rem;
	padding: 0.5rem 1rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--color-text);
	background: var(--color-muted);
	border-radius: 0.5rem;
	transition: background 0.15s ease;
}

.retry-button:hover {
	background: var(--color-border);
}

/* Pairs grid */
.pairs-container {
	padding: 1rem;
}

.pairs-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
	grid-auto-rows: 1fr;
	gap: 1rem;
}

/* Dark mode */
:root.dark .scan-button {
	box-shadow: 0 2px 8px oklch(0.7 0.15 250 / 0.2);
}
</style>
