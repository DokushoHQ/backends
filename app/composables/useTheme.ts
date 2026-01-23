export interface Theme {
	id: string
	name: string
	description: string
}

const STORAGE_KEY = "dokusho-theme"
const DEFAULT_THEME = "default"

const availableThemes: Theme[] = [
	{
		id: "default",
		name: "Default",
		description: "Clean, classic theme with neutral tones",
	},
	{
		id: "old-manga",
		name: "Old Manga Paper",
		description: "Warm cream tones inspired by aged manga pages",
	},
]

export function useTheme() {
	const colorMode = useColorMode()
	const currentTheme = useState<string>("theme", () => DEFAULT_THEME)

	// Initialize theme from localStorage on client
	function initTheme() {
		if (import.meta.client) {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (stored && availableThemes.some(t => t.id === stored)) {
				currentTheme.value = stored
			}
			applyThemeClass()
		}
	}

	// Apply theme class to HTML element
	function applyThemeClass() {
		if (import.meta.client) {
			const html = document.documentElement
			// Remove all theme classes
			availableThemes.forEach((t) => {
				html.classList.remove(`theme-${t.id}`)
			})
			// Add current theme class
			html.classList.add(`theme-${currentTheme.value}`)
		}
	}

	// Set theme and persist
	function setTheme(themeId: string) {
		if (!availableThemes.some(t => t.id === themeId)) {
			console.warn(`Unknown theme: ${themeId}`)
			return
		}
		currentTheme.value = themeId
		if (import.meta.client) {
			localStorage.setItem(STORAGE_KEY, themeId)
			applyThemeClass()
		}
	}

	// Toggle dark mode
	function toggleDark() {
		colorMode.preference = colorMode.value === "dark" ? "light" : "dark"
	}

	// Set color mode preference
	function setColorMode(mode: "light" | "dark" | "system") {
		colorMode.preference = mode
	}

	// Watch for theme changes and apply
	watch(currentTheme, () => {
		applyThemeClass()
	})

	return {
		// Theme
		currentTheme: readonly(currentTheme),
		availableThemes,
		setTheme,
		initTheme,

		// Color mode (light/dark)
		colorMode: computed(() => colorMode.value),
		colorModePreference: computed(() => colorMode.preference),
		isDark: computed(() => colorMode.value === "dark"),
		toggleDark,
		setColorMode,
	}
}
