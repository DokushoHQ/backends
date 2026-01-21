<script setup lang="ts">
definePageMeta({
	title: "Attention",
})

// Fetch duplicate count
const { data: duplicatesData } = await useFetch("/api/v1/duplicates", {
	query: { status: "Pending", limit: 1 },
})

// Fetch issues count
const { data: issuesData } = await useFetch("/api/v1/attention/issues", {
	query: { type: "all", limit: 1 },
})

const pendingDuplicates = computed(() => duplicatesData.value?.pagination?.total ?? 0)
const seriesWithIssues = computed(() => issuesData.value?.counts?.all ?? 0)

const categories = computed(() => [
	{
		id: "duplicates",
		title: "Duplicate Series",
		description: "Potential duplicate series detected in your library",
		icon: "i-lucide-copy",
		count: pendingDuplicates.value,
		route: "/attention/duplicates",
		color: "purple",
		action: "Review pairs",
	},
	{
		id: "issues",
		title: "Series Issues",
		description: "Series with missing covers, failed scrapes, or pending deletion",
		icon: "i-lucide-alert-triangle",
		count: seriesWithIssues.value,
		route: "/attention/issues",
		color: "amber",
		action: "View issues",
	},
])

const totalItems = computed(() => pendingDuplicates.value + seriesWithIssues.value)
</script>

<template>
	<div class="attention-page">
		<UDashboardPanel>
			<template #header>
				<UDashboardNavbar title="Attention Center">
					<template #description>
						<span
							class="status-pill"
							:class="{ 'all-clear': totalItems === 0 }"
						>
							<span class="status-dot" />
							{{ totalItems === 0 ? 'All clear' : `${totalItems} items need review` }}
						</span>
					</template>
				</UDashboardNavbar>
			</template>

			<template #body>
				<div class="attention-content">
					<!-- Hero section when all clear -->
					<div
						v-if="totalItems === 0"
						class="all-clear-state"
					>
						<div class="clear-icon">
							<UIcon
								name="i-lucide-check-circle"
								class="h-12 w-12"
							/>
						</div>
						<h2>Nothing needs attention</h2>
						<p>Your library is in good shape. Check back later or run a duplicate scan.</p>
						<NuxtLink
							to="/attention/duplicates"
							class="scan-link"
						>
							<UIcon
								name="i-lucide-radar"
								class="h-4 w-4"
							/>
							Run duplicate scan
						</NuxtLink>
					</div>

					<!-- Category cards -->
					<div
						v-else
						class="categories-grid"
					>
						<NuxtLink
							v-for="category in categories"
							:key="category.id"
							:to="category.route"
							class="category-card"
							:class="[`color-${category.color}`, { 'has-items': category.count > 0 }]"
						>
							<div class="card-header">
								<div class="icon-wrapper">
									<UIcon
										:name="category.icon"
										class="h-6 w-6"
									/>
								</div>
								<div
									v-if="category.count > 0"
									class="count-badge"
								>
									{{ category.count }}
								</div>
							</div>

							<div class="card-body">
								<h3>{{ category.title }}</h3>
								<p>{{ category.description }}</p>
							</div>

							<div class="card-footer">
								<span class="action-text">
									{{ category.count > 0 ? category.action : 'All clear' }}
								</span>
								<UIcon
									name="i-lucide-arrow-right"
									class="h-4 w-4 arrow"
								/>
							</div>
						</NuxtLink>
					</div>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
.attention-page {
	--purple: oklch(0.75 0.15 280);
	--purple-soft: oklch(0.75 0.15 280 / 0.12);
	--amber: oklch(0.78 0.15 70);
	--amber-soft: oklch(0.78 0.15 70 / 0.12);
	--success: oklch(0.75 0.15 160);
	--success-soft: oklch(0.75 0.15 160 / 0.12);
}

.attention-content {
	padding: 1.5rem;
}

/* Status pill */
.status-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.25rem 0.75rem;
	font-size: 0.8125rem;
	font-weight: 500;
	color: var(--amber);
	background: var(--amber-soft);
	border-radius: 2rem;
}

.status-pill.all-clear {
	color: var(--success);
	background: var(--success-soft);
}

.status-dot {
	width: 0.5rem;
	height: 0.5rem;
	border-radius: 50%;
	background: currentColor;
	animation: pulse 2s ease-in-out infinite;
}

.status-pill.all-clear .status-dot {
	animation: none;
}

@keyframes pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.4; }
}

/* All clear state */
.all-clear-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	text-align: center;
}

.clear-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 5rem;
	height: 5rem;
	margin-bottom: 1.5rem;
	border-radius: 50%;
	background: var(--success-soft);
	color: var(--success);
}

.all-clear-state h2 {
	font-size: 1.25rem;
	font-weight: 600;
	color: var(--color-text);
	margin-bottom: 0.5rem;
}

.all-clear-state p {
	font-size: 0.875rem;
	color: var(--color-text-muted);
	max-width: 24rem;
	margin-bottom: 1.5rem;
}

.scan-link {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.625rem 1.25rem;
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--purple);
	background: var(--purple-soft);
	border-radius: 0.5rem;
	transition: all 0.15s ease;
}

.scan-link:hover {
	background: oklch(0.75 0.15 280 / 0.2);
}

/* Categories grid */
.categories-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	gap: 1rem;
}

/* Category card */
.category-card {
	display: flex;
	flex-direction: column;
	padding: 1.25rem;
	background: var(--color-background);
	border: 1px solid var(--color-border);
	border-radius: 0.75rem;
	text-decoration: none;
	transition: all 0.2s ease;
}

.category-card:hover {
	border-color: var(--color-text-muted);
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.category-card.has-items {
	border-color: transparent;
}

.category-card.color-purple.has-items {
	background: linear-gradient(135deg, var(--purple-soft), transparent 60%);
	border-color: oklch(0.75 0.15 280 / 0.25);
}

.category-card.color-amber.has-items {
	background: linear-gradient(135deg, var(--amber-soft), transparent 60%);
	border-color: oklch(0.78 0.15 70 / 0.25);
}

.card-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 1rem;
}

.icon-wrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.75rem;
	height: 2.75rem;
	border-radius: 0.625rem;
	background: var(--color-muted);
	color: var(--color-text-muted);
}

.category-card.color-purple.has-items .icon-wrapper {
	background: var(--purple-soft);
	color: var(--purple);
}

.category-card.color-amber.has-items .icon-wrapper {
	background: var(--amber-soft);
	color: var(--amber);
}

.count-badge {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 1.75rem;
	height: 1.75rem;
	padding: 0 0.5rem;
	font-size: 0.8125rem;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	border-radius: 2rem;
}

.category-card.color-purple .count-badge {
	color: white;
	background: var(--purple);
}

.category-card.color-amber .count-badge {
	color: white;
	background: var(--amber);
}

.card-body {
	flex: 1;
	margin-bottom: 1rem;
}

.card-body h3 {
	font-size: 1rem;
	font-weight: 600;
	color: var(--color-text);
	margin-bottom: 0.375rem;
}

.card-body p {
	font-size: 0.8125rem;
	color: var(--color-text-muted);
	line-height: 1.5;
}

.card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-top: 0.75rem;
	border-top: 1px solid var(--color-border);
}

.action-text {
	font-size: 0.8125rem;
	font-weight: 500;
	color: var(--color-text-muted);
}

.category-card.has-items .action-text {
	color: var(--color-text);
}

.arrow {
	color: var(--color-text-muted);
	transition: transform 0.15s ease;
}

.category-card:hover .arrow {
	transform: translateX(4px);
}

.category-card.color-purple.has-items:hover .arrow {
	color: var(--purple);
}

.category-card.color-amber.has-items:hover .arrow {
	color: var(--amber);
}

/* Dark mode adjustments */
:root.dark .category-card {
	background: oklch(0.2 0.01 250);
}

:root.dark .category-card:hover {
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

:root.dark .category-card.color-purple.has-items {
	background: linear-gradient(135deg, oklch(0.75 0.15 280 / 0.15), oklch(0.2 0.01 250) 60%);
}

:root.dark .category-card.color-amber.has-items {
	background: linear-gradient(135deg, oklch(0.78 0.15 70 / 0.15), oklch(0.2 0.01 250) 60%);
}
</style>
