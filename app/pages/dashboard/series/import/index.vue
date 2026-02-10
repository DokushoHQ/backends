<script setup lang="ts">
definePageMeta({
	layout: "default",
	middleware: "import-guard",
})

const router = useRouter()
const cart = useImportCart()

onMounted(() => {
	cart.hydrateFromStorage()
})
</script>

<template>
	<div class="import-entry-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UiPageHeader
					title="Import Series"
					description="Choose how you want to add series"
					back-to="/dashboard/series"
				>
					<template #right>
						<ImporterSharedCartBadge
							v-if="cart.cartCount.value > 0"
							:count="cart.cartCount.value"
							@click="router.push('/dashboard/series/import/review')"
						/>
					</template>
				</UiPageHeader>
			</template>

			<template #body>
				<div class="entry-content">
					<!-- Import Method Cards -->
					<div class="method-grid">
						<button
							class="method-card"
							@click="router.push('/dashboard/series/import/browse')"
						>
							<div class="method-icon method-icon--browse">
								<UIcon
									name="i-lucide-search"
									class="icon"
								/>
							</div>
							<div class="method-content">
								<h3 class="method-title">
									Browse Sources
								</h3>
								<p class="method-description">
									Search and select from available manga sources
								</p>
							</div>
							<UIcon
								name="i-lucide-chevron-right"
								class="method-arrow"
							/>
						</button>

						<button
							class="method-card"
							@click="router.push('/dashboard/series/import/urls')"
						>
							<div class="method-icon method-icon--urls">
								<UIcon
									name="i-lucide-link"
									class="icon"
								/>
							</div>
							<div class="method-content">
								<h3 class="method-title">
									Paste URLs / Upload File
								</h3>
								<p class="method-description">
									Import from direct links or CSV/TXT file
								</p>
							</div>
							<UIcon
								name="i-lucide-chevron-right"
								class="method-arrow"
							/>
						</button>

						<button
							class="method-card"
							@click="router.push('/dashboard/series/import/backup')"
						>
							<div class="method-icon method-icon--backup">
								<UIcon
									name="i-lucide-archive"
									class="icon"
								/>
							</div>
							<div class="method-content">
								<h3 class="method-title">
									Import Backup
								</h3>
								<p class="method-description">
									Tachiyomi, Mihon, Tachimanga, Dokusho
								</p>
							</div>
							<UIcon
								name="i-lucide-chevron-right"
								class="method-arrow"
							/>
						</button>
					</div>

					<!-- Cart Summary -->
					<div
						v-if="cart.cartCount.value > 0"
						class="cart-summary"
					>
						<div class="cart-info">
							<div class="cart-icon">
								<UIcon
									name="i-lucide-shopping-cart"
									class="icon"
								/>
							</div>
							<div class="cart-text">
								<span class="cart-count">{{ cart.cartCount.value }} series selected</span>
								<span class="cart-hint">Ready to review</span>
							</div>
						</div>
						<UButton @click="router.push('/dashboard/series/import/review')">
							View Selection
							<UIcon
								name="i-lucide-arrow-right"
								class="ml-2 w-4 h-4"
							/>
						</UButton>
					</div>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
.entry-content {
	display: flex;
	flex-direction: column;
	gap: 2rem;
	max-width: 48rem;
	margin: 0 auto;
}

/* Method Grid */
.method-grid {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

/* Method Card */
.method-card {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 1.25rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
	text-align: left;
	cursor: pointer;
	transition: all 0.15s ease;
}

.method-card:hover {
	border-color: var(--ui-primary);
	background: var(--ui-bg-muted);
}

.method-card:hover .method-arrow {
	color: var(--ui-primary);
	transform: translateX(4px);
}

/* Method Icon */
.method-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 3rem;
	height: 3rem;
	border-radius: var(--radius-card);
	flex-shrink: 0;
}

.method-icon .icon {
	width: 1.5rem;
	height: 1.5rem;
}

.method-icon--browse {
	background: var(--ui-primary-soft);
	color: var(--ui-primary);
}

.method-icon--urls {
	background: var(--ui-success-soft);
	color: var(--ui-success);
}

.method-icon--backup {
	background: var(--ui-warning-soft);
	color: var(--ui-warning);
}

/* Method Content */
.method-content {
	flex: 1;
	min-width: 0;
}

.method-title {
	font-size: var(--font-size-base);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0 0 0.25rem 0;
}

.method-description {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0;
}

.method-arrow {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-text-dimmed);
	flex-shrink: 0;
	transition: all 0.15s ease;
}

/* Cart Summary */
.cart-summary {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem 1.25rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
}

.cart-info {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.cart-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	background: var(--ui-primary-soft);
	border-radius: 0.5rem;
}

.cart-icon .icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--ui-primary);
}

.cart-text {
	display: flex;
	flex-direction: column;
}

.cart-count {
	font-size: var(--font-size-base);
	font-weight: 500;
	color: var(--ui-text);
}

.cart-hint {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}
</style>
