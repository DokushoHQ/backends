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
	<UCard>
		<template #header>
			<div class="flex items-center justify-between">
				<div>
					<h3 class="text-lg font-semibold flex items-center gap-2">
						<UIcon
							name="i-lucide-monitor-smartphone"
							class="size-4"
						/>
						Active Sessions
					</h3>
					<p class="text-sm text-muted-foreground">
						{{ sessions?.length ?? 0 }} active session{{ sessions?.length === 1 ? '' : 's' }}
					</p>
				</div>
				<UButton
					v-if="otherSessionsCount > 0"
					variant="outline"
					size="sm"
					:loading="revokingAll"
					@click="handleRevokeAllOthers"
				>
					Revoke All Others
				</UButton>
			</div>
		</template>

		<div
			v-if="error"
			class="rounded-md bg-destructive/10 p-3 text-sm text-destructive mb-4"
		>
			{{ error }}
		</div>

		<div
			v-if="!sessions || sessions.length === 0"
			class="text-center py-8 text-muted-foreground"
		>
			No active sessions
		</div>

		<div
			v-else
			class="space-y-3"
		>
			<div
				v-for="session in sessions"
				:key="session.id"
				class="flex items-center justify-between p-4 rounded-lg bg-muted/50"
			>
				<div class="flex items-center gap-4">
					<UIcon
						:name="parseUserAgent(session.userAgent).os === 'iOS' || parseUserAgent(session.userAgent).os === 'Android'
							? 'i-lucide-smartphone'
							: 'i-lucide-monitor'"
						class="size-8 text-muted-foreground"
					/>
					<div>
						<div class="flex items-center gap-2">
							<span class="font-medium">
								{{ parseUserAgent(session.userAgent).browser }} on {{ parseUserAgent(session.userAgent).os }}
							</span>
							<UBadge
								v-if="session.isCurrent"
								color="success"
								variant="subtle"
								size="sm"
							>
								Current
							</UBadge>
						</div>
						<div class="text-sm text-muted-foreground space-x-3">
							<span v-if="session.ipAddress">{{ session.ipAddress }}</span>
							<span>{{ formatDate(session.createdAt) }}</span>
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
						class="size-4"
					/>
					Revoke
				</UButton>
			</div>
		</div>
	</UCard>
</template>
