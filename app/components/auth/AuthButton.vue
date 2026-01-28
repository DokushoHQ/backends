<script setup lang="ts">
interface Props {
	variant?: "primary" | "outline" | "ghost" | "link"
	loading?: boolean
	disabled?: boolean
	block?: boolean
	type?: "button" | "submit"
	to?: string
}

const props = withDefaults(defineProps<Props>(), {
	variant: "primary",
	loading: false,
	disabled: false,
	block: false,
	type: "button",
})

const buttonRef = ref<HTMLElement | null>(null)

function handleClick(event: MouseEvent) {
	if (props.loading || props.disabled) return

	// Create ripple effect
	const button = buttonRef.value
	if (!button) return

	const rect = button.getBoundingClientRect()
	const x = event.clientX - rect.left
	const y = event.clientY - rect.top

	const ripple = document.createElement("span")
	ripple.className = "auth-button__ripple"
	ripple.style.left = `${x}px`
	ripple.style.top = `${y}px`

	button.appendChild(ripple)

	ripple.addEventListener("animationend", () => {
		ripple.remove()
	})
}
</script>

<template>
	<NuxtLink
		v-if="to"
		ref="buttonRef"
		:to="to"
		class="auth-button"
		:class="[
			`auth-button--${variant}`,
			{
				'auth-button--block': block,
				'auth-button--loading': loading,
				'auth-button--disabled': disabled,
			},
		]"
		@click="handleClick"
	>
		<span class="auth-button__content">
			<span
				v-if="loading"
				class="auth-button__spinner"
			>
				<svg
					class="auth-button__spinner-svg"
					viewBox="0 0 24 24"
					fill="none"
				>
					<circle
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-dasharray="60"
						stroke-dashoffset="20"
					/>
				</svg>
			</span>
			<span
				v-if="$slots.icon && !loading"
				class="auth-button__icon"
			>
				<slot name="icon" />
			</span>
			<span class="auth-button__text">
				<slot />
			</span>
		</span>
	</NuxtLink>
	<button
		v-else
		ref="buttonRef"
		:type="type"
		:disabled="disabled || loading"
		class="auth-button"
		:class="[
			`auth-button--${variant}`,
			{
				'auth-button--block': block,
				'auth-button--loading': loading,
				'auth-button--disabled': disabled,
			},
		]"
		@click="handleClick"
	>
		<span class="auth-button__content">
			<span
				v-if="loading"
				class="auth-button__spinner"
			>
				<svg
					class="auth-button__spinner-svg"
					viewBox="0 0 24 24"
					fill="none"
				>
					<circle
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-dasharray="60"
						stroke-dashoffset="20"
					/>
				</svg>
			</span>
			<span
				v-if="$slots.icon && !loading"
				class="auth-button__icon"
			>
				<slot name="icon" />
			</span>
			<span class="auth-button__text">
				<slot />
			</span>
		</span>
	</button>
</template>

<style scoped>
.auth-button {
	--button-bg: var(--ui-primary);
	--button-text: white;
	--button-border: transparent;
	--button-shadow: 0 2px 4px color-mix(in oklch, var(--ui-primary) 30%, transparent);
	--button-hover-shadow: 0 4px 12px color-mix(in oklch, var(--ui-primary) 40%, transparent);

	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.75rem 1.5rem;
	font-size: 0.9375rem;
	font-weight: 500;
	color: var(--button-text);
	background: var(--button-bg);
	border: 1px solid var(--button-border);
	border-radius: 0.5rem;
	cursor: pointer;
	overflow: hidden;
	text-decoration: none;
	transition:
		transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
		box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1),
		background-color 0.15s ease,
		border-color 0.15s ease;
	box-shadow: var(--button-shadow);
}

.auth-button:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: var(--button-hover-shadow);
}

.auth-button:active:not(:disabled) {
	transform: translateY(0);
	box-shadow: var(--button-shadow);
}

.auth-button:focus-visible {
	outline: 2px solid var(--ui-primary);
	outline-offset: 2px;
}

.auth-button--block {
	width: 100%;
}

.auth-button--disabled,
.auth-button--loading {
	opacity: 0.6;
	cursor: not-allowed;
	transform: none !important;
	box-shadow: none !important;
}

/* Variants */
.auth-button--outline {
	--button-bg: transparent;
	--button-text: var(--ui-text);
	--button-border: var(--ui-border);
	--button-shadow: none;
	--button-hover-shadow: 0 2px 8px color-mix(in oklch, var(--ui-text) 10%, transparent);
}

.auth-button--outline:hover:not(:disabled) {
	--button-bg: var(--ui-bg-muted);
}

.auth-button--ghost {
	--button-bg: transparent;
	--button-text: var(--ui-text);
	--button-border: transparent;
	--button-shadow: none;
	--button-hover-shadow: none;
}

.auth-button--ghost:hover:not(:disabled) {
	--button-bg: var(--ui-bg-muted);
}

.auth-button--link {
	--button-bg: transparent;
	--button-text: var(--ui-primary);
	--button-border: transparent;
	--button-shadow: none;
	--button-hover-shadow: none;
	padding: 0;
	font-weight: 400;
}

.auth-button--link:hover:not(:disabled) {
	text-decoration: underline;
	transform: none;
}

/* Content */
.auth-button__content {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
}

.auth-button__icon {
	display: flex;
	align-items: center;
	justify-content: center;
}

.auth-button__text {
	line-height: 1.2;
}

/* Spinner */
.auth-button__spinner {
	display: flex;
	align-items: center;
	justify-content: center;
}

.auth-button__spinner-svg {
	width: 1.125rem;
	height: 1.125rem;
	animation: auth-button-spin 1s linear infinite;
}

@keyframes auth-button-spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

/* Ripple effect */
.auth-button :deep(.auth-button__ripple) {
	position: absolute;
	width: 10px;
	height: 10px;
	background: color-mix(in oklch, white 30%, transparent);
	border-radius: 50%;
	transform: translate(-50%, -50%) scale(0);
	animation: auth-button-ripple 0.5s ease-out;
	pointer-events: none;
}

@keyframes auth-button-ripple {
	to {
		transform: translate(-50%, -50%) scale(40);
		opacity: 0;
	}
}

/* Dark mode adjustments */
:global(.dark) .auth-button--primary {
	--button-shadow: 0 2px 4px color-mix(in oklch, black 30%, transparent);
	--button-hover-shadow: 0 4px 12px color-mix(in oklch, black 40%, transparent);
}
</style>
