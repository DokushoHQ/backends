<script setup lang="ts">
interface Session {
	id: string
	token: string
	createdAt: string
	expiresAt: string
	ipAddress: string | null
	userAgent: string | null
	isCurrent: boolean
}

const { data: sessions, refresh } = await useFetch<Session[]>("/api/me/sessions")

const revokingToken = ref<string | null>(null)
const revokingAll = ref(false)
const error = ref<string | null>(null)

const otherSessionsCount = computed(() => {
	return sessions.value?.filter(s => !s.isCurrent).length ?? 0
})

const sessionCountDescription = computed(() => {
	const count = sessions.value?.length ?? 0
	return `${count} active session${count === 1 ? "" : "s"}`
})

function parseUserAgent(ua: string | null): { browser: string, os: string } {
	if (!ua) return { browser: "Unknown", os: "Unknown" }

	let browser = "Unknown"
	let os = "Unknown"

	// Detect browser
	if (ua.includes("Firefox")) browser = "Firefox"
	else if (ua.includes("Edg/")) browser = "Edge"
	else if (ua.includes("Chrome")) browser = "Chrome"
	else if (ua.includes("Safari")) browser = "Safari"
	else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera"

	// Detect OS
	if (ua.includes("Windows")) os = "Windows"
	else if (ua.includes("Mac OS")) os = "macOS"
	else if (ua.includes("Linux")) os = "Linux"
	else if (ua.includes("Android")) os = "Android"
	else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS"

	return { browser, os }
}

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

function getDeviceIcon(ua: string | null): string {
	const { os } = parseUserAgent(ua)
	if (os === "iOS" || os === "Android") return "i-lucide-smartphone"
	return "i-lucide-monitor"
}

async function handleRevoke(token: string) {
	revokingToken.value = token
	error.value = null

	try {
		const result = await authClient.revokeSession({ token })
		if (result.error) {
			error.value = result.error.message ?? "Failed to revoke session"
		}
		else {
			await refresh()
		}
	}
	catch {
		error.value = "An unexpected error occurred"
	}
	finally {
		revokingToken.value = null
	}
}

async function handleRevokeAllOthers() {
	revokingAll.value = true
	error.value = null

	try {
		const result = await authClient.revokeOtherSessions()
		if (result.error) {
			error.value = result.error.message ?? "Failed to revoke sessions"
		}
		else {
			await refresh()
		}
	}
	catch {
		error.value = "An unexpected error occurred"
	}
	finally {
		revokingAll.value = false
	}
}
</script>

<template>
	<UiContentCard
		title="Active Sessions"
		:description="sessionCountDescription"
		icon="i-lucide-monitor-smartphone"
		color="blue"
	>
		<template #header-actions>
			<UButton
				v-if="otherSessionsCount > 0"
				variant="outline"
				size="sm"
				:loading="revokingAll"
				@click="handleRevokeAllOthers"
			>
				Revoke All Others
			</UButton>
		</template>

		<div class="card-body">
			<div
				v-if="error"
				class="error-box"
			>
				{{ error }}
			</div>

			<div
				v-if="!sessions || sessions.length === 0"
				class="empty-state"
			>
				<UIcon
					name="i-lucide-monitor-off"
					class="empty-icon"
				/>
				<span>No active sessions</span>
			</div>

			<div
				v-else
				class="sessions-list"
			>
				<div
					v-for="session in sessions"
					:key="session.id"
					class="session-item"
					:class="{ current: session.isCurrent }"
				>
					<div class="session-info">
						<div class="device-icon">
							<UIcon
								:name="getDeviceIcon(session.userAgent)"
								class="h-5 w-5"
							/>
						</div>
						<div class="session-details">
							<div class="session-title">
								<span class="device-name">
									{{ parseUserAgent(session.userAgent).browser }} on {{ parseUserAgent(session.userAgent).os }}
								</span>
								<span
									v-if="session.isCurrent"
									class="current-badge"
								>
									Current
								</span>
							</div>
							<div class="session-meta">
								<span
									v-if="session.ipAddress"
									class="ip-address"
								>
									{{ session.ipAddress }}
								</span>
								<span class="session-date">{{ formatDate(session.createdAt) }}</span>
							</div>
						</div>
					</div>

					<UButton
						v-if="!session.isCurrent"
						variant="ghost"
						color="error"
						size="sm"
						:loading="revokingToken === session.token"
						@click="handleRevoke(session.token)"
					>
						<UIcon
							name="i-lucide-log-out"
							class="h-4 w-4"
						/>
						Revoke
					</UButton>
				</div>
			</div>
		</div>
	</UiContentCard>
</template>

<style scoped>
.card-body {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 1rem;
}

/* Error box */
.error-box {
	padding: 0.75rem;
	background: var(--ui-error-soft);
	color: var(--ui-error);
	border-radius: 0.5rem;
	font-size: var(--font-size-sm);
}

/* Empty state */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.75rem;
	padding: 2rem;
	color: var(--ui-text-muted);
	font-size: var(--font-size-sm);
}

.empty-icon {
	width: 2rem;
	height: 2rem;
	opacity: 0.5;
}

/* Sessions list */
.sessions-list {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

/* Session item */
.session-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1rem;
	background: var(--ui-bg-muted);
	border-radius: 0.5rem;
	transition: background 0.15s ease;
}

.session-item:hover {
	background: color-mix(in oklch, var(--ui-bg-muted) 80%, var(--ui-border) 20%);
}

.session-item.current {
	background: var(--ui-success-soft);
	border: 1px solid color-mix(in oklch, var(--ui-success) 20%, transparent);
}

.session-item.current:hover {
	background: color-mix(in oklch, var(--ui-success-soft) 90%, var(--ui-success) 10%);
}

.session-info {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.device-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 0.5rem;
	background: var(--ui-bg-elevated);
	color: var(--ui-text-muted);
	flex-shrink: 0;
}

.session-item.current .device-icon {
	background: color-mix(in oklch, var(--ui-success) 15%, var(--ui-bg-elevated));
	color: var(--ui-success);
}

.session-details {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.session-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.device-name {
	font-size: var(--font-size-sm);
	font-weight: 500;
	color: var(--ui-text);
}

.current-badge {
	display: inline-flex;
	align-items: center;
	padding: 0.125rem 0.5rem;
	font-size: var(--font-size-xs);
	font-weight: 500;
	border-radius: 2rem;
	background: var(--ui-success);
	color: white;
}

.session-meta {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	font-size: var(--font-size-xs);
	color: var(--ui-text-muted);
}

.ip-address {
	font-family: var(--font-mono, ui-monospace, monospace);
}

.session-date {
	opacity: 0.8;
}
</style>
