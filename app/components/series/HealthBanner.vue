<script setup lang="ts">
defineProps<{
	hasCover: boolean
	sources: Array<{
		consecutive_failures: number
		source: { name: string }
	}>
	unacknowledgedRemovedCount: number
}>()

const emit = defineEmits<{
	refreshCover: []
}>()
</script>

<template>
	<div
		v-if="!hasCover || sources.some(s => s.consecutive_failures > 0) || unacknowledgedRemovedCount > 0"
		class="space-y-3"
	>
		<!-- Missing Cover Warning -->
		<UAlert
			v-if="!hasCover"
			icon="i-lucide-image-off"
			color="warning"
			variant="subtle"
			title="Missing Cover"
			description="This series doesn't have a cover image."
		>
			<template #actions>
				<UButton
					size="sm"
					variant="outline"
					@click="emit('refreshCover')"
				>
					<UIcon
						name="i-lucide-refresh-cw"
						class="h-4 w-4"
					/>
					Refresh Cover
				</UButton>
			</template>
		</UAlert>

		<!-- Scrape Failures Warning -->
		<UAlert
			v-if="sources.some(s => s.consecutive_failures > 0)"
			icon="i-lucide-alert-circle"
			color="error"
			variant="subtle"
			title="Scrape Failures"
		>
			<template #description>
				<div class="space-y-1">
					<p>Some sources are failing to update:</p>
					<ul class="list-disc list-inside text-sm">
						<li
							v-for="source in sources.filter(s => s.consecutive_failures > 0)"
							:key="source.source.name"
						>
							{{ source.source.name }}: {{ source.consecutive_failures }} consecutive failure{{ source.consecutive_failures > 1 ? 's' : '' }}
						</li>
					</ul>
				</div>
			</template>
		</UAlert>

		<!-- Source Removed Chapters Warning -->
		<UAlert
			v-if="unacknowledgedRemovedCount > 0"
			icon="i-lucide-cloud-off"
			color="warning"
			variant="subtle"
			title="Chapters Removed from Source"
			:description="`${unacknowledgedRemovedCount} chapter${unacknowledgedRemovedCount === 1 ? ' was' : 's were'} removed from their source but ${unacknowledgedRemovedCount === 1 ? 'is' : 'are'} still available locally.`"
		/>
	</div>
</template>
