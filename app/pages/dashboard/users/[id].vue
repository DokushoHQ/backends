<script setup lang="ts">
const route = useRoute()
const userId = route.params.id as string

definePageMeta({
	title: "User Details",
	layout: "default",
})

const { data, error, pending } = await useFetch(`/api/users/${userId}`)

if (error.value) {
	console.error("User fetch error:", error.value)
}

const userInitials = computed(() => {
	if (!data.value?.user) return "?"
	const user = data.value.user
	if (user.name) {
		return user.name
			.split(" ")
			.map(n => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2)
	}
	return (user.email?.[0] ?? "?").toUpperCase()
})

function formatDate(date: Date | string | null): string {
	if (!date) return "Never"
	const d = typeof date === "string" ? new Date(date) : date
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
</script>

<template>
	<div class="user-detail-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UiPageHeader
					:items="[
						{ label: 'Users', to: '/dashboard/users' },
						{ label: data?.user.name || data?.user.email || 'User' },
					]"
					back-to="/dashboard/users"
				/>
			</template>

			<template #body>
				<!-- Loading state -->
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
					<h2>Failed to load user</h2>
					<p>{{ error.message }}</p>
				</div>

				<!-- Main content -->
				<div
					v-else-if="data"
					class="user-content"
				>
					<!-- Top row: User Info + Connected Accounts -->
					<div class="cards-grid">
						<!-- User Info Card -->
						<div class="info-card">
							<div class="card-header">
								<h3 class="card-title">
									<UIcon
										name="i-lucide-user"
										class="title-icon"
									/>
									User Information
								</h3>
							</div>

							<div class="user-profile">
								<UAvatar
									:src="data.user.image ?? undefined"
									:text="userInitials"
									size="xl"
									class="profile-avatar"
								/>
								<div class="profile-details">
									<h2 class="profile-name">
										{{ data.user.name || "Unnamed" }}
									</h2>
									<span class="profile-email">{{ data.user.email }}</span>
								</div>
							</div>

							<div class="info-grid">
								<div class="info-item">
									<span class="info-label">Role</span>
									<span
										v-if="data.user.role === 'admin'"
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
								</div>
								<div class="info-item">
									<span class="info-label">Email Status</span>
									<span
										v-if="data.user.emailVerified"
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
								<div class="info-item">
									<span class="info-label">Created</span>
									<span class="info-value">{{ formatDate(data.user.createdAt) }}</span>
								</div>
								<div class="info-item">
									<span class="info-label">Updated</span>
									<span class="info-value">{{ formatDate(data.user.updatedAt) }}</span>
								</div>
							</div>

							<!-- Ban Info -->
							<div
								v-if="data.user.banned"
								class="ban-section"
							>
								<span class="badge badge-banned">
									<UIcon
										name="i-lucide-ban"
										class="badge-icon"
									/>
									Banned
								</span>
								<p
									v-if="data.user.banReason"
									class="ban-detail"
								>
									<span class="ban-label">Reason:</span> {{ data.user.banReason }}
								</p>
								<p
									v-if="data.user.banExpires"
									class="ban-detail"
								>
									<span class="ban-label">Expires:</span> {{ formatDate(data.user.banExpires) }}
								</p>
							</div>
						</div>

						<!-- Connected Accounts Card -->
						<div class="info-card">
							<div class="card-header">
								<h3 class="card-title">
									<UIcon
										name="i-lucide-key-round"
										class="title-icon"
									/>
									Connected Accounts
								</h3>
								<span class="card-count">{{ data.accounts.length }}</span>
							</div>

							<div
								v-if="data.accounts.length === 0"
								class="empty-section"
							>
								<p>No connected accounts</p>
							</div>
							<div
								v-else
								class="accounts-list"
							>
								<div
									v-for="account in data.accounts"
									:key="account.id"
									class="account-item"
								>
									<div class="account-info">
										<span class="account-provider">{{ account.providerId }}</span>
										<span class="account-date">Connected {{ formatDate(account.createdAt) }}</span>
									</div>
									<span
										v-if="account.providerId === 'credential'"
										class="badge badge-outline"
									>
										Password
									</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Sessions Card -->
					<div class="table-card">
						<div class="card-header">
							<h3 class="card-title">
								<UIcon
									name="i-lucide-monitor"
									class="title-icon"
								/>
								Active Sessions
							</h3>
							<span class="card-count">{{ data.sessions.length }}</span>
						</div>

						<div
							v-if="data.sessions.length === 0"
							class="empty-section"
						>
							<p>No active sessions</p>
						</div>
						<div
							v-else
							class="table-wrapper"
						>
							<table class="data-table">
								<thead>
									<tr>
										<th>Device / Browser</th>
										<th>IP Address</th>
										<th>Created</th>
										<th class="text-right">
											Expires
										</th>
									</tr>
								</thead>
								<tbody>
									<tr
										v-for="session in data.sessions"
										:key="session.id"
									>
										<td class="device-cell">
											<span :title="session.userAgent ?? undefined">
												{{ session.userAgent || "Unknown device" }}
											</span>
										</td>
										<td class="muted">
											{{ session.ipAddress || "Unknown" }}
										</td>
										<td class="muted">
											{{ formatDate(session.createdAt) }}
										</td>
										<td class="text-right muted">
											{{ formatDate(session.expiresAt) }}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					<!-- API Keys Card -->
					<div class="table-card">
						<div class="card-header">
							<h3 class="card-title">
								<UIcon
									name="i-lucide-key"
									class="title-icon"
								/>
								API Keys
							</h3>
							<span class="card-count">{{ data.apiKeys.length }}</span>
						</div>

						<div
							v-if="data.apiKeys.length === 0"
							class="empty-section"
						>
							<p>No API keys</p>
						</div>
						<div
							v-else
							class="table-wrapper"
						>
							<table class="data-table">
								<thead>
									<tr>
										<th>Name</th>
										<th>Key Prefix</th>
										<th>Status</th>
										<th>Requests</th>
										<th>Last Used</th>
										<th class="text-right">
											Expires
										</th>
									</tr>
								</thead>
								<tbody>
									<tr
										v-for="apiKey in data.apiKeys"
										:key="apiKey.id"
									>
										<td class="key-name">
											{{ apiKey.name || "Unnamed Key" }}
										</td>
										<td class="key-prefix">
											{{ apiKey.start ? `${apiKey.start}...` : "—" }}
										</td>
										<td>
											<span
												v-if="apiKey.enabled"
												class="badge badge-active"
											>
												Active
											</span>
											<span
												v-else
												class="badge badge-disabled"
											>
												Disabled
											</span>
										</td>
										<td class="muted">
											{{ apiKey.requestCount.toLocaleString() }}
										</td>
										<td class="muted">
											{{ formatDate(apiKey.lastRequest) }}
										</td>
										<td class="text-right muted">
											{{ formatDate(apiKey.expiresAt) }}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
.user-content {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

/* Cards grid */
.cards-grid {
	display: grid;
	gap: 1rem;
	grid-template-columns: 1fr;
}

@media (min-width: 768px) {
	.cards-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}

/* Info card */
.info-card {
	display: flex;
	flex-direction: column;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
	overflow: hidden;
}

/* Table card */
.table-card {
	display: flex;
	flex-direction: column;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-radius: var(--radius-card);
	overflow: hidden;
}

/* Card header */
.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1rem;
	border-bottom: 1px solid var(--ui-border-muted);
}

.card-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: var(--font-size-base);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
}

.title-icon {
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-muted);
}

.card-count {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 1.5rem;
	height: 1.5rem;
	padding: 0 0.375rem;
	font-size: var(--font-size-xs);
	font-weight: 600;
	color: var(--ui-text-muted);
	background: var(--ui-bg-muted);
	border-radius: 2rem;
}

/* User profile */
.user-profile {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 1rem;
	border-bottom: 1px solid var(--ui-border-muted);
}

.profile-avatar {
	flex-shrink: 0;
}

.profile-details {
	min-width: 0;
}

.profile-name {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0 0 0.25rem 0;
}

.profile-email {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

/* Info grid */
.info-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 1rem;
	padding: 1rem;
}

.info-item {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
}

.info-label {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

.info-value {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

/* Badges */
.badge {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	padding: 0.25rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 2rem;
	width: fit-content;
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

.badge-banned {
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

.badge-active {
	background: var(--ui-success-soft);
	color: var(--ui-success);
}

.badge-disabled {
	background: var(--ui-error-soft);
	color: var(--ui-error);
}

.badge-outline {
	background: transparent;
	color: var(--ui-text-muted);
	border: 1px solid var(--ui-border);
}

/* Ban section */
.ban-section {
	padding: 1rem;
	border-top: 1px solid var(--ui-border-muted);
	background: var(--ui-error-soft);
}

.ban-detail {
	margin: 0.5rem 0 0 0;
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
}

.ban-label {
	font-weight: 500;
	color: var(--ui-text);
}

/* Accounts list */
.accounts-list {
	display: flex;
	flex-direction: column;
}

.account-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0.875rem 1rem;
	border-bottom: 1px solid var(--ui-border-muted);
}

.account-item:last-child {
	border-bottom: none;
}

.account-info {
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
}

.account-provider {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
	text-transform: capitalize;
}

.account-date {
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

/* Empty section */
.empty-section {
	padding: 2rem 1rem;
	text-align: center;
}

.empty-section p {
	font-size: var(--font-size-sm);
	color: var(--ui-text-muted);
	margin: 0;
}

/* Table wrapper */
.table-wrapper {
	overflow-x: auto;
}

/* Data table */
.data-table {
	width: 100%;
	border-collapse: collapse;
}

.data-table th {
	padding: 0.75rem 1rem;
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text-muted);
	text-align: left;
	background: var(--ui-bg-muted);
	border-bottom: 1px solid var(--ui-border-muted);
}

.data-table td {
	padding: 0.75rem 1rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text);
	border-bottom: 1px solid var(--ui-border-muted);
}

.data-table tr:last-child td {
	border-bottom: none;
}

.data-table .muted {
	color: var(--ui-text-muted);
}

.data-table .text-right {
	text-align: right;
}

.device-cell {
	max-width: 16rem;
}

.device-cell span {
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.key-name {
	font-weight: 500;
}

.key-prefix {
	font-family: ui-monospace, monospace;
	color: var(--ui-text-muted);
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
</style>
