<script setup lang="ts">
</script>

<template>
	<UiContentCard
		title="Theme"
		description="Customize the look and feel of the application"
		icon="i-lucide-palette"
		color="purple"
	>
		<div class="card-body">
			<UiThemeSelector />
		</div>
	</UiContentCard>
</template>

<style scoped>
.card-body {
	padding: 1rem;
}
</style>
