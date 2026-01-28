<script setup lang="ts">
definePageMeta({
	title: "My Profile",
	layout: "default",
})

const route = useRoute()
const toast = useToast()

const { data, error, refresh } = await useFetch("/api/me/profile")

if (error.value) {
	console.error("Profile fetch error:", error.value)
}

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
	<div class="profile-page flex flex-col flex-1 min-h-0">
		<UDashboardPanel class="flex-1 min-h-0">
			<template #header>
				<UiPageHeader
					title="My Profile"
					description="Manage your account settings and API keys"
				/>
			</template>

			<template #body>
				<div
					v-if="data"
					class="profile-content"
				>
					<MeUserInfoSection
						:user="{
							id: data.user.id,
							name: data.user.name,
							email: data.user.email,
							image: data.user.image,
							role: data.user.role,
							createdAt: data.user.createdAt,
						}"
						:linked-accounts="data.linkedAccounts"
					/>

					<MeThemeSection />

					<MePasswordSection :has-password="data.hasPassword" />

					<MeTwoFactorSection
						:has-password="data.hasPassword"
						:two-factor-enabled="data.user.twoFactorEnabled"
						@refresh="refresh()"
					/>

					<MeSessionsSection />

					<MeApiKeysSection :api-keys="data.apiKeys" />

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
			</template>
		</UDashboardPanel>
	</div>
</template>

<style scoped>
.profile-content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
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
