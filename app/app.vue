<script setup lang="ts">
useHead({
	title: "Dokusho",
	titleTemplate: "%s - Dokusho",
})
</script>

<template>
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
