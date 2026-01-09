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
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar
				title="My Profile"
				description="Manage your account settings and API keys"
			/>
		</template>

		<template #body>
			<div
				v-if="data"
				class="space-y-6"
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
				class="text-center py-8"
			>
				<p class="text-destructive">
					Failed to load profile data
				</p>
			</div>

			<div
				v-else
				class="flex items-center justify-center py-8"
			>
				<UIcon
					name="i-lucide-loader-2"
					class="size-6 animate-spin text-muted-foreground"
				/>
			</div>
		</template>
	</UDashboardPanel>
</template>
