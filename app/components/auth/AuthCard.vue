<script setup lang="ts">
interface Props {
	icon?: string
	title?: string
	subtitle?: string
	accentColor?: "primary" | "success" | "warning" | "error"
}

withDefaults(defineProps<Props>(), {
	accentColor: "primary",
})
</script>

<template>
	<div
		class="auth-card"
		:class="`auth-card--${accentColor}`"
	>
		<div class="auth-card__accent" />
		<div class="auth-card__content">
			<header
				v-if="icon || title"
				class="auth-card__header"
			>
				<div
					v-if="icon"
					class="auth-card__icon-wrapper"
				>
					<UIcon
						:name="icon"
						class="auth-card__icon"
					/>
				</div>
				<h1
					v-if="title"
					class="auth-card__title"
				>
					{{ title }}
				</h1>
				<p
					v-if="subtitle"
					class="auth-card__subtitle"
				>
					{{ subtitle }}
				</p>
			</header>
			<div class="auth-card__body">
				<slot />
			</div>
			<footer
				v-if="$slots.footer"
				class="auth-card__footer"
			>
				<slot name="footer" />
			</footer>
		</div>
	</div>
</template>

<style scoped>
.auth-card {
	--accent-color: var(--ui-primary);
	position: relative;
	width: 100%;
	max-width: 26rem;
	background: var(--ui-bg-elevated);
	border-radius: 0.75rem;
	box-shadow:
		0 1px 2px color-mix(in oklch, var(--ui-text) 4%, transparent),
		0 4px 8px color-mix(in oklch, var(--ui-text) 3%, transparent),
		0 12px 24px color-mix(in oklch, var(--ui-text) 2%, transparent);
	overflow: hidden;
}

.auth-card--primary {
	--accent-color: var(--ui-primary);
}

.auth-card--success {
	--accent-color: var(--ui-success);
}

.auth-card--warning {
	--accent-color: var(--ui-warning);
}

.auth-card--error {
	--accent-color: var(--ui-error);
}

.auth-card__accent {
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: 4px;
	background: var(--accent-color);
}

.auth-card__content {
	padding: 2rem 2rem 2rem 2.25rem;
}

.auth-card__header {
	text-align: center;
	margin-bottom: 2rem;
}

.auth-card__icon-wrapper {
	display: flex;
	justify-content: center;
	margin-bottom: 1rem;
}

.auth-card__icon {
	width: 3rem;
	height: 3rem;
	color: var(--accent-color);
}

.auth-card__title {
	font-size: 1.5rem;
	font-weight: 600;
	color: var(--ui-text);
	line-height: 1.2;
	margin: 0;
}

.auth-card__subtitle {
	margin-top: 0.5rem;
	font-size: 0.875rem;
	color: var(--ui-text-muted);
	line-height: 1.5;
}

.auth-card__body {
}

.auth-card__footer {
	margin-top: 1.5rem;
	padding-top: 1.5rem;
	border-top: 1px solid var(--ui-border);
}

/* Dark mode shadow adjustment */
:global(.dark) .auth-card {
	box-shadow:
		0 1px 2px color-mix(in oklch, black 20%, transparent),
		0 4px 8px color-mix(in oklch, black 15%, transparent),
		0 12px 24px color-mix(in oklch, black 10%, transparent);
}
</style>
