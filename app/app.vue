<script setup lang="ts">
useHead({
	title: "Tsundoku",
	titleTemplate: "%s - Tsundoku",
})

// Initialize theme on app mount
const { initTheme } = useTheme()
onMounted(() => {
	initTheme()
})
</script>

<template>
	<NuxtLoadingIndicator />
	<Transition>
		<KeepAlive>
			<Suspense>
				<UApp>
					<NuxtLayout>
						<NuxtPage />
					</NuxtLayout>
				</UApp>
			</Suspense>
		</KeepAlive>
	</Transition>
</template>
