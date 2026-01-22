<script setup lang="ts">
defineProps<{
	progress: number
}>()
</script>

<template>
	<div class="scan-progress-container">
		<div class="scan-visual">
			<div class="scan-ring" />
			<div class="scan-ring delay-1" />
			<div class="scan-ring delay-2" />
			<UIcon
				name="i-lucide-radar"
				class="h-10 w-10 text-primary relative z-10"
			/>
		</div>
		<div class="scan-info">
			<h3 class="state-title">
				Analyzing library
			</h3>
			<p class="state-description">
				Comparing titles with semantic search
			</p>
			<div class="progress-track">
				<div
					class="progress-fill"
					:style="{ width: `${progress}%` }"
				/>
			</div>
			<span class="progress-label">{{ progress }}%</span>
		</div>
	</div>
</template>

<style scoped>
.scan-progress-container {
	--accent: oklch(0.7 0.15 250);

	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2rem;
	padding: 4rem 2rem;
}

.scan-visual {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 6rem;
	height: 6rem;
}

.scan-ring {
	position: absolute;
	inset: 0;
	border: 2px solid var(--accent);
	border-radius: 50%;
	opacity: 0;
	animation: scan-pulse 2s ease-out infinite;
}

.scan-ring.delay-1 {
	animation-delay: 0.4s;
}

.scan-ring.delay-2 {
	animation-delay: 0.8s;
}

@keyframes scan-pulse {
	0% {
		transform: scale(0.8);
		opacity: 0.8;
	}
	100% {
		transform: scale(1.6);
		opacity: 0;
	}
}

.scan-info {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.75rem;
	text-align: center;
}

.state-title {
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--color-text);
}

.state-description {
	font-size: 0.875rem;
	color: var(--color-text-muted);
	max-width: 24rem;
}

.progress-track {
	width: 12rem;
	height: 0.375rem;
	background: var(--color-muted);
	border-radius: 1rem;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	background: linear-gradient(90deg, var(--accent), oklch(0.75 0.12 200));
	border-radius: 1rem;
	transition: width 0.3s ease;
}

.progress-label {
	font-size: 0.875rem;
	font-weight: 600;
	color: var(--accent);
	font-variant-numeric: tabular-nums;
}
</style>
