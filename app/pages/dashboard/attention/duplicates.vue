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
const { detecting, progress, startDetection, checkActiveJob } = useDuplicateDetection()

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

// Refresh list when detection completes
watch(detecting, (val, oldVal) => {
	if (oldVal && !val) {
		hasAnimated.value = false
		refresh()
	}
})

onMounted(() => {
	checkActiveJob()
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
				<UiPageHeader
					title="Duplicates"
					:description="`${pagination.total} pairs to review`"
					back-to="/dashboard/attention"
				>
					<template #right>
						<UiSegmentedControl
							v-model="selectedStatus"
							:options="statusOptions"
							class="desktop-only"
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
							<span class="scan-label">{{ detecting ? 'Scanning' : 'Scan' }}</span>
						</button>
					</template>
				</UiPageHeader>
				<div class="mobile-filter-bar">
					<UiSegmentedControl
						v-model="selectedStatus"
						:options="statusOptions"
					/>
				</div>
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

					<UiPagination
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
/* Responsive navbar */
.navbar-right {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.desktop-only {
	display: none;
}

.mobile-filter-bar {
	display: flex;
	justify-content: center;
	padding: 0.75rem 1rem;
	border-bottom: 1px solid var(--ui-border);
	background: var(--ui-bg);
}

.mobile-filter-bar :deep(.segmented-control) {
	flex: 1;
	max-width: 24rem;
}

@media (min-width: 640px) {
	.desktop-only {
		display: flex;
	}

	.mobile-filter-bar {
		display: none;
	}
}

/* Scan button */
.scan-button {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	padding: 0.375rem;
	font-size: 0.8125rem;
	font-weight: 500;
	color: white;
	background: linear-gradient(135deg, var(--ui-primary), color-mix(in oklch, var(--ui-primary) 80%, black));
	border-radius: 0.375rem;
	transition: all 0.2s ease;
	box-shadow: 0 2px 8px color-mix(in oklch, var(--ui-primary) 30%, transparent);
}

.scan-label {
	display: none;
}

@media (min-width: 640px) {
	.scan-button {
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
	}

	.scan-label {
		display: inline;
	}
}

.scan-button:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: 0 4px 12px color-mix(in oklch, var(--ui-primary) 40%, transparent);
}

.scan-button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
}

.scan-button.scanning {
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
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
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}

.state-icon-wrapper.success {
	background: var(--ui-success-soft);
	color: var(--ui-success);
}

.state-icon-wrapper.error {
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

.state-title {
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--ui-text);
	margin-bottom: 0.5rem;
}

.state-description {
	font-size: 0.875rem;
	color: var(--ui-text-muted);
	max-width: 24rem;
}

.retry-button {
	margin-top: 1.5rem;
	padding: 0.5rem 1rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--ui-text);
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
	transition: background 0.15s ease;
}

.retry-button:hover {
	background: var(--ui-border);
}

/* Pairs grid */
.pairs-container {
	padding: 0.75rem;
}

.pairs-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 0.75rem;
}

@media (min-width: 640px) {
	.pairs-container {
		padding: 1rem;
	}

	.pairs-grid {
		grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
		grid-auto-rows: 1fr;
		gap: 1rem;
	}
}
</style>
