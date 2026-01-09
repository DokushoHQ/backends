import { getQueue } from "../utils/queue-stats"

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KiB`
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)}MiB`
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GiB`
}

export default defineEventHandler(async (event) => {
	await requireAdmin(event)

	// Get Redis client from any queue
	const queue = getQueue("email")
	const client = await queue.client

	// Run INFO command
	const info = await client.info()

	// Parse INFO response into sections
	const sections: Record<string, Record<string, string>> = {}
	let currentSection = ""

	for (const line of info.split("\n")) {
		const trimmed = line.trim()
		if (!trimmed) continue

		if (trimmed.startsWith("#")) {
			currentSection = trimmed.slice(2).toLowerCase()
			sections[currentSection] = {}
		}
		else if (trimmed.includes(":")) {
			const [key, value] = trimmed.split(":")
			const section = sections[currentSection]
			if (section && key && value !== undefined) {
				section[key] = value
			}
		}
	}

	const server = sections.server || {}
	const clients = sections.clients || {}
	const memory = sections.memory || {}

	// Calculate uptime in days
	const uptimeSeconds = Number.parseInt(server.uptime_in_seconds || "0", 10)
	const uptimeDays = Math.floor(uptimeSeconds / 86400)

	return {
		version: server.redis_version || "unknown",
		uptimeDays,
		connectedClients: Number.parseInt(clients.connected_clients || "0", 10),
		usedMemory: formatBytes(Number.parseInt(memory.used_memory || "0", 10)),
		maxMemory: memory.maxmemory && memory.maxmemory !== "0"
			? formatBytes(Number.parseInt(memory.maxmemory, 10))
			: null,
	}
})
