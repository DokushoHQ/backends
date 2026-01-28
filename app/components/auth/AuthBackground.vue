<template>
	<div class="auth-background" />
</template>

<style scoped>
.auth-background {
	position: fixed;
	inset: 0;
	z-index: -1;
	background: var(--ui-bg);
	background-image:
		radial-gradient(
			ellipse 80% 50% at 20% 40%,
			color-mix(in oklch, var(--ui-primary) 8%, transparent),
			transparent 50%
		),
		radial-gradient(
			ellipse 60% 80% at 80% 20%,
			color-mix(in oklch, var(--ui-primary) 6%, transparent),
			transparent 40%
		),
		radial-gradient(
			ellipse 50% 60% at 70% 80%,
			color-mix(in oklch, var(--ui-primary) 5%, transparent),
			transparent 45%
		);
}
</style>
