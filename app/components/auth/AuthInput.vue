<script setup lang="ts">
interface Props {
	modelValue: string
	type?: "text" | "email" | "password"
	label: string
	placeholder?: string
	error?: string
	required?: boolean
	disabled?: boolean
	autocomplete?: string
	minlength?: number
	maxlength?: number
	inputmode?: "text" | "numeric" | "email"
	pattern?: string
	centered?: boolean
	large?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	type: "text",
	required: false,
	disabled: false,
	centered: false,
	large: false,
})

const emit = defineEmits<{
	"update:modelValue": [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)

const hasValue = computed(() => props.modelValue.length > 0)
const isFloating = computed(() => isFocused.value || hasValue.value)

function handleInput(event: Event) {
	const target = event.target as HTMLInputElement
	emit("update:modelValue", target.value)
}

function handleFocus() {
	isFocused.value = true
}

function handleBlur() {
	isFocused.value = false
}
</script>

<template>
	<div
		class="auth-input"
		:class="{
			'auth-input--focused': isFocused,
			'auth-input--floating': isFloating,
			'auth-input--error': error,
			'auth-input--disabled': disabled,
			'auth-input--centered': centered,
			'auth-input--large': large,
		}"
	>
		<div class="auth-input__field">
			<input
				ref="inputRef"
				:type="type"
				:value="modelValue"
				:required="required"
				:disabled="disabled"
				:autocomplete="autocomplete"
				:minlength="minlength"
				:maxlength="maxlength"
				:inputmode="inputmode"
				:pattern="pattern"
				:placeholder="isFloating ? placeholder : ' '"
				class="auth-input__native"
				@input="handleInput"
				@focus="handleFocus"
				@blur="handleBlur"
			>
			<label class="auth-input__label">
				{{ label }}
				<span
					v-if="required"
					class="auth-input__required"
				>*</span>
			</label>
			<div class="auth-input__border" />
		</div>
		<p
			v-if="error"
			class="auth-input__error"
		>
			{{ error }}
		</p>
	</div>
</template>

<style scoped>
.auth-input {
	--input-border-color: var(--ui-border);
	--input-label-color: var(--ui-text-muted);
	--input-text-color: var(--ui-text);
	--input-bg: transparent;
	position: relative;
}

.auth-input__field {
	position: relative;
}

.auth-input__native {
	width: 100%;
	padding: 1.25rem 0 0.5rem;
	font-size: 0.9375rem;
	color: var(--input-text-color);
	background: var(--input-bg);
	border: none;
	border-bottom: 1px solid var(--input-border-color);
	outline: none;
	transition: border-color 0.2s ease;
}

.auth-input__native::placeholder {
	color: var(--ui-text-dimmed);
	opacity: 0;
	transition: opacity 0.2s ease;
}

.auth-input--floating .auth-input__native::placeholder {
	opacity: 1;
}

.auth-input__native:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.auth-input__label {
	position: absolute;
	left: 0;
	top: 0.875rem;
	font-size: 0.9375rem;
	color: var(--input-label-color);
	pointer-events: none;
	transform-origin: left center;
	transition:
		transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
		color 0.2s ease;
}

.auth-input--floating .auth-input__label {
	transform: translateY(-0.625rem) scale(0.8);
}

.auth-input--focused .auth-input__label {
	color: var(--ui-primary);
}

.auth-input__required {
	color: var(--ui-error);
	margin-left: 0.125rem;
}

.auth-input__border {
	position: absolute;
	bottom: 0;
	left: 50%;
	width: 0;
	height: 2px;
	background: var(--ui-primary);
	transform: translateX(-50%);
	transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.auth-input--focused .auth-input__border {
	width: 100%;
}

.auth-input__error {
	margin-top: 0.375rem;
	font-size: 0.8125rem;
	color: var(--ui-error);
	animation: auth-input-shake 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes auth-input-shake {
	0%,
	100% {
		transform: translateX(0);
	}
	20%,
	60% {
		transform: translateX(-4px);
	}
	40%,
	80% {
		transform: translateX(4px);
	}
}

/* Error state */
.auth-input--error .auth-input__native {
	border-bottom-color: var(--ui-error);
}

.auth-input--error .auth-input__label {
	color: var(--ui-error);
}

.auth-input--error .auth-input__border {
	background: var(--ui-error);
}

/* Centered variant (for TOTP codes) */
.auth-input--centered .auth-input__native {
	text-align: center;
	letter-spacing: 0.25em;
	font-family: var(--font-mono);
}

.auth-input--centered .auth-input__label {
	left: 50%;
	transform: translateX(-50%);
	transform-origin: center center;
}

.auth-input--centered.auth-input--floating .auth-input__label {
	transform: translateX(-50%) translateY(-0.625rem) scale(0.8);
}

/* Large variant (for TOTP codes) */
.auth-input--large .auth-input__native {
	font-size: 1.5rem;
	padding-top: 1.5rem;
	padding-bottom: 0.75rem;
}

.auth-input--large .auth-input__label {
	font-size: 0.875rem;
}
</style>
