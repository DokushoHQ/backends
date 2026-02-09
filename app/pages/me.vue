<script setup lang="ts">
definePageMeta({
	title: "My Profile",
	layout: "reader",
})

const route = useRoute()
const toast = useToast()

const { data, error, refresh } = await useFetch("/api/me/profile")

if (error.value) {
	console.error("Profile fetch error:", error.value)
}

// Hero computed values
const userInitials = computed(() => {
	if (!data.value) return "?"
	const name = data.value.user.name
	if (name) {
		return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
	}
	return (data.value.user.email[0] ?? "?").toUpperCase()
})

const roleLabel = computed(() => {
	if (!data.value?.user.role) return "User"
	const role = data.value.user.role
	return role.charAt(0).toUpperCase() + role.slice(1)
})

const memberSince = computed(() => {
	if (!data.value) return ""
	return new Date(data.value.user.createdAt).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	})
})

// Handle email changed success message
onMounted(async () => {
	if (route.query.emailChanged === "true") {
		await refresh()
		toast.add({
			title: "Email Changed",
			description: "Your email address has been updated successfully.",
			color: "success",
		})
		navigateTo("/me", { replace: true })
	}
})
</script>

<template>
	<div class="profile-page">
		<div class="profile-page__container">
			<div
				v-if="data"
				class="profile-content"
			>
				<!-- Profile Identity Hero -->
				<div class="profile-hero">
					<UAvatar
						:src="data.user.image || undefined"
						:text="userInitials"
						class="hero-avatar"
					/>
					<div class="hero-info">
						<div class="hero-name-row">
							<h1 class="hero-name">
								{{ data.user.name || data.user.email }}
							</h1>
							<span
								class="hero-badge"
								:class="data.user.role === 'admin' ? 'badge-admin' : 'badge-user'"
							>
								{{ roleLabel }}
							</span>
						</div>
						<div class="hero-meta">
							<span>{{ data.user.email }}</span>
							<span class="hero-dot" />
							<span>Joined {{ memberSince }}</span>
						</div>
					</div>
				</div>

				<!-- Account & Appearance Grid -->
				<div class="settings-grid">
					<MeUserInfoSection
						:user="{
							name: data.user.name,
							email: data.user.email,
							image: data.user.image,
						}"
						:linked-accounts="data.linkedAccounts"
					/>
					<MeThemeSection />
				</div>

				<!-- Security -->
				<MePasswordSection :has-password="data.hasPassword" />

				<MeTwoFactorSection
					:has-password="data.hasPassword"
					:two-factor-enabled="data.user.twoFactorEnabled"
					@refresh="refresh()"
				/>

				<!-- Sessions & Keys -->
				<MeSessionsSection />

				<MeApiKeysSection :api-keys="data.apiKeys" />

				<!-- Danger Zone -->
				<MeDeleteAccountSection :has-password="data.hasPassword" />
			</div>

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
				<h2>Failed to load profile</h2>
				<p>{{ error.message || 'An unexpected error occurred' }}</p>
			</div>

			<div
				v-else
				class="loading-state"
			>
				<UIcon
					name="i-lucide-loader-2"
					class="loading-spinner"
				/>
			</div>
		</div>
	</div>
</template>

<style scoped>
.profile-page {
	flex: 1;
	padding: 1.5rem 1rem;
}

@media (min-width: 640px) {
	.profile-page {
		padding: 2rem 1.5rem;
	}
}

@media (min-width: 1280px) {
	.profile-page {
		padding: 2rem 2.5rem;
	}
}

.profile-page__container {
	display: flex;
	flex-direction: column;
}

.profile-content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

/* ── Profile Hero ── */
.profile-hero {
	display: flex;
	align-items: center;
	gap: 1.25rem;
	padding: 1.5rem;
	background: var(--ui-bg-elevated);
	border: 1px solid var(--ui-border);
	border-left: 3px solid var(--ui-primary);
	border-radius: var(--radius-card);
}

.hero-avatar {
	width: 4rem;
	height: 4rem;
	font-size: var(--font-size-lg);
	flex-shrink: 0;
	outline: 2px solid var(--ui-primary);
	outline-offset: 3px;
}

@media (min-width: 640px) {
	.hero-avatar {
		width: 5rem;
		height: 5rem;
		font-size: var(--font-size-xl);
	}
}

.hero-info {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	min-width: 0;
}

.hero-name-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex-wrap: wrap;
}

.hero-name {
	font-size: var(--font-size-lg);
	font-weight: 600;
	color: var(--ui-text);
	margin: 0;
}

@media (min-width: 640px) {
	.hero-name {
		font-size: var(--font-size-xl);
	}
}

.hero-badge {
	display: inline-flex;
	align-items: center;
	padding: 0.125rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 2rem;
}

.badge-admin {
	background: var(--ui-primary-soft);
	color: var(--ui-primary);
}

.badge-user {
	background: var(--ui-bg-muted);
	color: var(--ui-text-dimmed);
}

.hero-meta {
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
	font-size: var(--font-size-sm);
	color: var(--ui-text-dimmed);
}

.hero-dot {
	display: none;
}

@media (min-width: 640px) {
	.hero-meta {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
	}

	.hero-dot {
		display: block;
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: var(--ui-text-dimmed);
		opacity: 0.5;
		flex-shrink: 0;
	}
}

/* ── Settings Grid ── */
.settings-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 1.5rem;
	align-items: start;
}

@media (min-width: 1024px) {
	.settings-grid {
		grid-template-columns: 1fr 1fr;
	}
}

/* ── Loading state ── */
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

/* ── Error state ── */
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
