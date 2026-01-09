export function useFormatters() {
	const formatRelativeTime = (date: string | Date | null): string => {
		if (!date) return "Never"
		const d = new Date(date)
		const now = new Date()
		const diff = now.getTime() - d.getTime()
		const seconds = Math.floor(diff / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)
		const days = Math.floor(hours / 24)

		if (seconds < 60) return "just now"
		if (minutes < 60) return `${minutes}m ago`
		if (hours < 24) return `${hours}h ago`
		if (days < 7) return `${days}d ago`
		return d.toLocaleDateString()
	}

	const formatDuration = (minutes: number): string => {
		const abs = Math.abs(minutes)
		if (abs < 60) return `${abs}m`
		if (abs < 1440) {
			const hours = Math.floor(abs / 60)
			const mins = abs % 60
			if (mins === 0) return `${hours}h`
			return `${hours}h${mins}m`
		}
		const days = Math.floor(abs / 1440)
		const hours = Math.floor((abs % 1440) / 60)
		if (hours === 0) return `${days}d`
		return `${days}d${hours}h`
	}

	return {
		formatRelativeTime,
		formatDuration,
	}
}
