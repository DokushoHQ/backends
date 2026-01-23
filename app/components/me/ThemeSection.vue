<script setup lang="ts">
</script>

<template>
	<UCard>
		<template #header>
			<div>
				<h3 class="text-lg font-semibold flex items-center gap-2">
					<UIcon
						name="i-lucide-palette"
						class="size-4"
					/>
					Theme
				</h3>
				<p class="text-sm text-muted-foreground">
					Customize the look and feel of the application
				</p>
			</div>
		</template>

		<UiThemeSelector />
	</UCard>
</template>
