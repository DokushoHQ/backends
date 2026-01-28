<script setup lang="ts">
definePageMeta({
	title: "Users",
	layout: "default",
})

const { data, error, pending } = await useFetch("/api/users")

if (error.value) {
	console.error("Users fetch error:", error.value)
}

// Computed stats
const stats = computed(() => {
	if (!data.value?.users) return { total: 0, admins: 0, verified: 0 }
	const users = data.value.users
	return {
		total: users.length,
		admins: users.filter(u => u.role === "admin").length,
		verified: users.filter(u => u.emailVerified).length,
	}
})

function getUserInitials(user: { name: string | null, email: string }): string {
	if (user.name) {
		return user.name
			.split(" ")
			.map(n => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2)
	}
	return (user.email[0] ?? "?").toUpperCase()
}

function formatDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
</script>

<template>
	<div class="users-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UiPageHeader
					title="Users"
					description="Manage user accounts and permissions"
				/>
			</template>

			<template #body>
				<!-- Loading State -->
				<div
					v-if="pending && !data"
					class="loading-state"
				>
					<UIcon
						name="i-lucide-loader-2"
						class="loading-spinner"
					/>
				</div>

				<!-- Error state -->
				<div
					v-else-if="error"
					class="error-state"
				>
					<div class="error-icon">
						<UIcon
							name="i-lucide-alert-circle"
							class="h-10 w-10"
						/>
					</div>
					<h2>Failed to load users</h2>
					<p>
						{{
							error.statusCode === 403
								? "You don't have permission to view this page"
								: error.message
						}}
					</p>
				</div>

				<!-- Empty state -->
				<div
					v-else-if="!data?.users.length"
					class="empty-state"
				>
					<div class="empty-icon">
						<UIcon
							name="i-lucide-users"
							class="h-10 w-10"
						/>
					</div>
					<h2>No users yet</h2>
					<p>Users will appear here once they register.</p>
				</div>

				<!-- Main Content -->
				<div
					v-else-if="data"
					class="users-content"
				>
					<!-- Stats Overview -->
					<div class="stats-section">
						<UiStatCardGrid :cols="3">
							<UiStatCard
								:value="stats.total"
								label="Total Users"
								icon="i-lucide-users"
								color="blue"
							/>
							<UiStatCard
								:value="stats.admins"
								label="Administrators"
								icon="i-lucide-shield"
								color="purple"
							/>
							<UiStatCard
								:value="stats.verified"
								label="Verified"
								icon="i-lucide-badge-check"
								color="green"
							/>
						</UiStatCardGrid>
					</div>

					<!-- Users Grid -->
					<div class="users-grid">
						<NuxtLink
							v-for="user in data.users"
							:key="user.id"
							:to="`/users/${user.id}`"
							class="user-card"
						>
							<div class="user-header">
								<UAvatar
									:src="user.image ?? undefined"
									:text="getUserInitials(user)"
									size="lg"
									class="user-avatar"
								/>
								<div class="user-info">
									<h3 class="user-name">
										{{ user.name || "Unnamed" }}
									</h3>
									<span class="user-email">{{ user.email }}</span>
								</div>
							</div>

							<div class="user-badges">
								<span
									v-if="user.role === 'admin'"
									class="badge badge-admin"
								>
									<UIcon
										name="i-lucide-shield"
										class="badge-icon"
									/>
									Admin
								</span>
								<span
									v-else
									class="badge badge-user"
								>
									User
								</span>

								<span
									v-if="user.emailVerified"
									class="badge badge-verified"
								>
									<UIcon
										name="i-lucide-check"
										class="badge-icon"
									/>
									Verified
								</span>
								<span
									v-else
									class="badge badge-pending"
								>
									Pending
								</span>
							</div>

							<div class="user-footer">
								<span class="joined-label">
									<UIcon
										name="i-lucide-calendar"
										class="footer-icon"
									/>
									Joined {{ formatDate(user.createdAt) }}
								</span>
								<UIcon
									name="i-lucide-chevron-right"
									class="chevron-icon"
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
/* Stats section */
.stats-section {
	margin-bottom: 1.5rem;
}

/* Users grid */
.users-grid {
	display: grid;
	gap: 1rem;
	grid-template-columns: 1fr;
}

@media (min-width: 640px) {
	.users-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (min-width: 1024px) {
	.users-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

/* User card */
.user-card {
	display: flex;
	flex-direction: column;
	padding: 1rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
	text-decoration: none;
	transition: all 0.2s ease;
}

.user-card:hover {
	border-color: var(--ui-text-muted);
	box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08);
}

:root.dark .user-card:hover {
	box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.3);
}

/* User header */
.user-header {
	display: flex;
	align-items: center;
	gap: 0.875rem;
	margin-bottom: 0.875rem;
}

.user-avatar {
	flex-shrink: 0;
}

.user-info {
	min-width: 0;
	flex: 1;
}

.user-name {
	font-size: var(--font-size-base);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.user-email {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	display: block;
}

/* Badges */
.user-badges {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin-bottom: 0.875rem;
	padding-bottom: 0.875rem;
	border-bottom: 1px solid var(--ui-border-muted);
}

.badge {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	padding: 0.25rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 2rem;
}

.badge-icon {
	width: 0.75rem;
	height: 0.75rem;
}

.badge-admin {
	background: var(--ui-primary-soft);
	color: var(--ui-primary);
}

.badge-user {
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}

.badge-verified {
	background: var(--ui-success-soft);
	color: var(--ui-success);
}

.badge-pending {
	background: var(--ui-warning-soft);
	color: var(--ui-warning);
}

/* User footer */
.user-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.joined-label {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

.footer-icon {
	width: 0.875rem;
	height: 0.875rem;
}

.chevron-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
	transition: transform 0.15s ease;
}

.user-card:hover .chevron-icon {
	transform: translateX(2px);
	color: var(--ui-text);
}

/* Loading state */
.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
}

.loading-spinner {
	width: 2.5rem;
	height: 2.5rem;
	color: var(--ui-text-muted);
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Error state */
.error-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	text-align: center;
}

.error-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 4.5rem;
	height: 4.5rem;
	margin-bottom: 1.5rem;
	border-radius: 50%;
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

.error-state h2 {
	font-size: var(--font-size-xl);
	font-weight: 600;
	color: var(--ui-text);
	margin-bottom: 0.5rem;
}

.error-state p {
	font-size: var(--font-size-base);
	color: var(--ui-text-muted);
	max-width: 24rem;
}

/* Empty state */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 4rem 2rem;
	text-align: center;
}

.empty-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 4.5rem;
	height: 4.5rem;
	margin-bottom: 1.5rem;
	border-radius: 50%;
	background: var(--ui-bg-muted);
	color: var(--ui-text-muted);
}

.empty-state h2 {
	font-size: var(--font-size-xl);
	font-weight: 600;
	color: var(--ui-text);
	margin-bottom: 0.5rem;
}

.empty-state p {
	font-size: var(--font-size-base);
	color: var(--ui-text-muted);
	max-width: 24rem;
}
</style>
