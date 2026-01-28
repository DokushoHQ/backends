const STORAGE_KEY = "dokusho-sidebar-collapsed"
const MOBILE_BREAKPOINT = 768

function updateHtmlClass(collapsed: boolean) {
	if (import.meta.client) {
		document.documentElement.classList.toggle("sidebar-collapsed", collapsed)
	}
}

export function useSidebar() {
	const collapsed = useState<boolean>("sidebar-collapsed", () => false)
	const mobileOpen = useState<boolean>("sidebar-mobile-open", () => false)
	const isMobile = useState<boolean>("sidebar-is-mobile", () => false)

	function toggle() {
		collapsed.value = !collapsed.value
		if (import.meta.client) {
			localStorage.setItem(STORAGE_KEY, String(collapsed.value))
			updateHtmlClass(collapsed.value)
		}
	}

	function setCollapsed(value: boolean) {
		collapsed.value = value
		if (import.meta.client) {
			localStorage.setItem(STORAGE_KEY, String(value))
			updateHtmlClass(value)
		}
	}

	function openMobile() {
		mobileOpen.value = true
	}

	function closeMobile() {
		mobileOpen.value = false
	}

	function checkMobile() {
		if (import.meta.client) {
			isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
		}
	}

	function init() {
		if (import.meta.client) {
			// Sync Vue state with localStorage (HTML class already applied by head script)
			const stored = localStorage.getItem(STORAGE_KEY)
			if (stored !== null) {
				collapsed.value = stored === "true"
			}

			// Check initial mobile state
			checkMobile()

			// Setup resize listener
			window.addEventListener("resize", checkMobile)
		}
	}

	function cleanup() {
		if (import.meta.client) {
			window.removeEventListener("resize", checkMobile)
		}
	}

	return {
		collapsed: readonly(collapsed),
		mobileOpen: readonly(mobileOpen),
		isMobile: readonly(isMobile),
		toggle,
		setCollapsed,
		openMobile,
		closeMobile,
		init,
		cleanup,
	}
}
