<script setup lang="ts">
interface FilterValues {
	q?: string
	type?: string
	status?: string
	genre?: string
	language?: string
}

const props = withDefaults(defineProps<{
	modelValue?: FilterValues
}>(), {
	modelValue: () => ({}),
})

const emit = defineEmits<{
	"update:modelValue": [value: FilterValues]
}>()

const searchQuery = ref(props.modelValue.q ?? "")
const debounceTimer = ref<ReturnType<typeof setTimeout>>()

watch(() => props.modelValue.q, (val) => {
	clearTimeout(debounceTimer.value)
	searchQuery.value = val ?? ""
})

watch(searchQuery, (val) => {
	clearTimeout(debounceTimer.value)
	debounceTimer.value = setTimeout(() => {
		emit("update:modelValue", { ...props.modelValue, q: val || undefined })
	}, 300)
})

onUnmounted(() => {
	clearTimeout(debounceTimer.value)
	debounceTimer.value = undefined
})

const typeOptions = [
	{ label: "All Types", value: "" },
	{ label: "Manga", value: "Manga" },
	{ label: "Manhwa", value: "Manhwa" },
	{ label: "Manhua", value: "Manhua" },
	{ label: "Webtoon", value: "Webtoon" },
	{ label: "Light Novel", value: "Lightnovel" },
]

const statusOptions = [
	{ label: "All Status", value: "" },
	{ label: "Ongoing", value: "Ongoing" },
	{ label: "Completed", value: "Completed" },
	{ label: "Hiatus", value: "Hiatus" },
]

function updateFilter(key: string, value: string) {
	emit("update:modelValue", { ...props.modelValue, [key]: value || undefined })
}
</script>

<template>
	<div class="browse-filters">
		<div class="browse-filters__search">
			<UIcon
				name="i-lucide-search"
				class="browse-filters__search-icon"
			/>
			<input
				v-model="searchQuery"
				type="text"
				placeholder="Search series..."
				class="browse-filters__search-input"
			>
		</div>

		<div class="browse-filters__selects">
			<select
				class="browse-filters__select"
				:value="modelValue.type ?? ''"
				@change="updateFilter('type', ($event.target as HTMLSelectElement).value)"
			>
				<option
					v-for="opt in typeOptions"
					:key="opt.value"
					:value="opt.value"
				>
					{{ opt.label }}
				</option>
			</select>

			<select
				class="browse-filters__select"
				:value="modelValue.status ?? ''"
				@change="updateFilter('status', ($event.target as HTMLSelectElement).value)"
			>
				<option
					v-for="opt in statusOptions"
					:key="opt.value"
					:value="opt.value"
				>
					{{ opt.label }}
				</option>
			</select>
		</div>
	</div>
</template>

<style scoped>
.browse-filters {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

@media (min-width: 640px) {
	.browse-filters {
		flex-direction: row;
		align-items: center;
	}
}

.browse-filters__search {
	position: relative;
	flex: 1;
	min-width: 0;
}

.browse-filters__search-icon {
	position: absolute;
	left: 0.75rem;
	top: 50%;
	transform: translateY(-50%);
	width: 1rem;
	height: 1rem;
	color: var(--ui-text-dimmed);
	pointer-events: none;
}

.browse-filters__search-input {
	width: 100%;
	height: 2.5rem;
	padding: 0 0.75rem 0 2.25rem;
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	background: var(--ui-bg-elevated);
	color: var(--ui-text);
	font-size: var(--font-size-base);
	font-family: var(--font-body);
	outline: none;
	transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.browse-filters__search-input::placeholder {
	color: var(--ui-text-dimmed);
}

.browse-filters__search-input:focus {
	border-color: var(--ui-primary);
	box-shadow: 0 0 0 2px color-mix(in oklch, var(--ui-primary) 20%, transparent);
}

.browse-filters__selects {
	display: flex;
	gap: 0.5rem;
}

.browse-filters__select {
	height: 2.5rem;
	padding: 0 2rem 0 0.75rem;
	border: 1px solid var(--ui-border);
	border-radius: 0.5rem;
	background: var(--ui-bg-elevated);
	color: var(--ui-text);
	font-size: var(--font-size-sm);
	font-family: var(--font-body);
	cursor: pointer;
	outline: none;
	appearance: none;
	background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
	background-position: right 0.5rem center;
	background-repeat: no-repeat;
	background-size: 1.25rem;
	transition: border-color 0.15s ease;
}

.browse-filters__select:focus {
	border-color: var(--ui-primary);
}
</style>
