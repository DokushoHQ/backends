<script setup lang="ts">
interface Props {
	job: {
		id: string
		name: string
		data: unknown
		opts?: unknown
	} | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
	submit: [input: DuplicateJobInput]
}>()

const open = defineModel<boolean>("open", { required: true })

interface DuplicateJobInput {
	name: string
	data: Record<string, unknown>
	delay?: number
	priority?: number
	attempts?: number
	backoffType?: "fixed" | "exponential"
	backoffDelay?: number
}

// Form state
const name = ref("")
const data = ref("")
const dataError = ref<string | null>(null)
const delay = ref("")
const priority = ref("")
const attempts = ref("3")
const backoffType = ref<"fixed" | "exponential">("fixed")
const backoffDelay = ref("1000")
const submitting = ref(false)

// Reset form when dialog opens
watch(open, (isOpen) => {
	if (isOpen && props.job) {
		name.value = props.job.name
		data.value = JSON.stringify(props.job.data, null, 2)
		dataError.value = null
		delay.value = ""
		priority.value = ""
		// Cast opts to expected shape
		const opts = props.job.opts as { attempts?: number, backoff?: { type?: string, delay?: number } } | undefined
		attempts.value = opts?.attempts?.toString() ?? "3"
		backoffType.value = opts?.backoff?.type === "exponential" ? "exponential" : "fixed"
		backoffDelay.value = opts?.backoff?.delay?.toString() ?? "1000"
	}
})

async function handleSubmit() {
	dataError.value = null

	// Validate JSON
	let parsedData: Record<string, unknown>
	try {
		parsedData = JSON.parse(data.value)
	}
	catch {
		dataError.value = "Invalid JSON"
		return
	}

	const input: DuplicateJobInput = {
		name: name.value,
		data: parsedData,
		delay: delay.value ? Number.parseInt(delay.value, 10) : undefined,
		priority: priority.value ? Number.parseInt(priority.value, 10) : undefined,
		attempts: attempts.value ? Number.parseInt(attempts.value, 10) : undefined,
		backoffType: backoffType.value,
		backoffDelay: backoffDelay.value ? Number.parseInt(backoffDelay.value, 10) : undefined,
	}

	submitting.value = true
	try {
		emit("submit", input)
	}
	finally {
		submitting.value = false
	}
}
</script>

<template>
	<UModal
		v-model:open="open"
		class="sm:max-w-2xl"
	>
		<template #content>
			<UCard>
				<template #header>
					<div>
						<h3 class="font-semibold">
							Duplicate Job
						</h3>
						<p class="text-sm text-muted-foreground">
							Create a new job based on #{{ job?.id }}. Modify the values below as needed.
						</p>
					</div>
				</template>

				<form
					class="space-y-4"
					@submit.prevent="handleSubmit"
				>
					<!-- Job Name -->
					<UFormField label="Job Name">
						<UInput
							v-model="name"
							placeholder="Job name"
							required
							class="w-full"
						/>
					</UFormField>

					<!-- Job Data -->
					<UFormField label="Job Data (JSON)">
						<UTextarea
							v-model="data"
							placeholder="{}"
							required
							:rows="10"
							class="w-full font-mono text-sm"
							@input="dataError = null"
						/>
						<p
							v-if="dataError"
							class="text-sm text-red-500 mt-1"
						>
							{{ dataError }}
						</p>
					</UFormField>

					<!-- Options Grid -->
					<div class="grid grid-cols-2 gap-4">
						<!-- Delay -->
						<UFormField label="Delay (ms)">
							<UInput
								v-model="delay"
								type="number"
								min="0"
								placeholder="0 (run immediately)"
								class="w-full"
							/>
						</UFormField>

						<!-- Priority -->
						<UFormField label="Priority">
							<UInput
								v-model="priority"
								type="number"
								placeholder="0 (default)"
								class="w-full"
							/>
							<p class="text-xs text-muted-foreground mt-1">
								Lower = higher priority
							</p>
						</UFormField>

						<!-- Attempts -->
						<UFormField label="Max Attempts">
							<UInput
								v-model="attempts"
								type="number"
								min="1"
								placeholder="3"
								class="w-full"
							/>
						</UFormField>

						<!-- Backoff Type -->
						<UFormField label="Backoff Type">
							<USelect
								v-model="backoffType"
								:items="[
									{ label: 'Fixed', value: 'fixed' },
									{ label: 'Exponential', value: 'exponential' },
								]"
								class="w-full"
							/>
						</UFormField>

						<!-- Backoff Delay -->
						<UFormField
							label="Backoff Delay (ms)"
							class="col-span-2"
						>
							<UInput
								v-model="backoffDelay"
								type="number"
								min="0"
								placeholder="1000"
								class="w-full"
							/>
							<p class="text-xs text-muted-foreground mt-1">
								{{ backoffType === "fixed" ? "Wait this long between retries" : "Initial delay, doubles with each retry" }}
							</p>
						</UFormField>
					</div>
				</form>

				<template #footer>
					<div class="flex justify-end gap-2">
						<UButton
							variant="outline"
							:disabled="submitting"
							@click="open = false"
						>
							Cancel
						</UButton>
						<UButton
							:loading="submitting"
							@click="handleSubmit"
						>
							Create Job
						</UButton>
					</div>
				</template>
			</UCard>
		</template>
	</UModal>
</template>
