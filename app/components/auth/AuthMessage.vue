<script setup lang="ts">
interface Props {
	type: "success" | "warning" | "error" | "info"
	icon?: string
	title?: string
	dismissable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	dismissable: false,
})

const emit = defineEmits<{
	dismiss: []
}>()

const visible = ref(true)

const defaultIcons: Record<string, string> = {
	success: "i-lucide-check-circle",
	warning: "i-lucide-alert-triangle",
	error: "i-lucide-x-circle",
	info: "i-lucide-info",
}

const computedIcon = computed(() => props.icon || defaultIcons[props.type])

function handleDismiss() {
	visible.value = false
	emit("dismiss")
}
</script>

<template>
	<Transition name="auth-message">
		<div
			v-if="visible"
			class="auth-message"
			:class="`auth-message--${type}`"
		>
			<div class="auth-message__icon-wrapper">
				<UIcon
					:name="computedIcon"
					class="auth-message__icon"
				/>
			</div>
			<div class="auth-message__content">
				<p
					v-if="title"
					class="auth-message__title"
				>
					{{ title }}
				</p>
				<div class="auth-message__body">
					<slot />
				</div>
			</div>
			<button
				v-if="dismissable"
				class="auth-message__dismiss"
				type="button"
				aria-label="Dismiss"
				@click="handleDismiss"
			>
				<UIcon
					name="i-lucide-x"
					class="auth-message__dismiss-icon"
				/>
			</button>
		</div>
	</Transition>
</template>

<style scoped>
.auth-message {
	--message-bg: var(--ui-info-soft);
	--message-border: var(--ui-info);
	--message-icon: var(--ui-info);
	--message-title: var(--ui-text);
	--message-text: var(--ui-text-muted);

	display: flex;
	align-items: flex-start;
	gap: 0.75rem;
	padding: 1rem;
	background: var(--message-bg);
	border-radius: 0.5rem;
	border-left: 3px solid var(--message-border);
	animation: auth-message-enter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes auth-message-enter {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* Type variants */
.auth-message--success {
	--message-bg: var(--ui-success-soft);
	--message-border: var(--ui-success);
	--message-icon: var(--ui-success);
}

.auth-message--warning {
	--message-bg: var(--ui-warning-soft);
	--message-border: var(--ui-warning);
	--message-icon: var(--ui-warning);
}

.auth-message--error {
	--message-bg: var(--ui-error-soft);
	--message-border: var(--ui-error);
	--message-icon: var(--ui-error);
}

.auth-message--info {
	--message-bg: var(--ui-info-soft);
	--message-border: var(--ui-info);
	--message-icon: var(--ui-info);
}

.auth-message__icon-wrapper {
	flex-shrink: 0;
	padding-top: 0.0625rem;
}

.auth-message__icon {
	width: 1.25rem;
	height: 1.25rem;
	color: var(--message-icon);
}

.auth-message__content {
	flex: 1;
	min-width: 0;
}

.auth-message__title {
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--message-title);
	margin: 0 0 0.25rem;
}

.auth-message__body {
	font-size: 0.8125rem;
	color: var(--message-text);
	line-height: 1.5;
}

.auth-message__body :deep(p) {
	margin: 0;
}

.auth-message__dismiss {
	flex-shrink: 0;
	padding: 0.25rem;
	margin: -0.25rem -0.25rem -0.25rem 0;
	background: transparent;
	border: none;
	border-radius: 0.25rem;
	cursor: pointer;
	color: var(--ui-text-muted);
	transition: color 0.15s ease, background-color 0.15s ease;
}

.auth-message__dismiss:hover {
	color: var(--ui-text);
	background: color-mix(in oklch, var(--ui-text) 8%, transparent);
}

.auth-message__dismiss-icon {
	width: 1rem;
	height: 1rem;
	display: block;
}

/* Transition */
.auth-message-enter-active,
.auth-message-leave-active {
	transition:
		opacity 0.2s ease,
		transform 0.2s ease;
}

.auth-message-enter-from,
.auth-message-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
