export type ByparrCookie = {
	name: string
	value: string
	domain: string
	path: string
	expires: number
	size: number
	httpOnly: boolean
	secure: boolean
	session: boolean
	sameSite: string
}

export type ByparrSolution = {
	url: string
	status: number
	headers: Record<string, string>
	response: string
	cookies: ByparrCookie[]
	userAgent: string
	jsResult?: unknown
}

export type ByparrResponse = {
	status: "ok" | "error"
	message: string
	solution: ByparrSolution
	startTimestamp: number
	endTimestamp: number
	version: string
}

export type ByparrSessionResponse = {
	status: "ok" | "error"
	message: string
	session: string
}

export type ByparrSessionListResponse = {
	status: "ok" | "error"
	message: string
	sessions: string[]
}

export class ByparrClient {
	#baseUrl: string

	constructor(baseUrl = "http://localhost:8191") {
		this.#baseUrl = baseUrl
	}

	async get(
		url: string,
		options?: {
			maxTimeout?: number
			session?: string
			cookies?: Array<{ name: string, value: string }>
			js?: string
			initJs?: string
		},
	): Promise<ByparrResponse> {
		const res = await fetch(`${this.#baseUrl}/v1`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				cmd: "request.get",
				url,
				maxTimeout: options?.maxTimeout ?? 60000,
				session: options?.session,
				cookies: options?.cookies,
				js: options?.js,
				init_js: options?.initJs,
			}),
		})

		const data = (await res.json()) as ByparrResponse
		if (data.status !== "ok") {
			throw new Error(`Byparr error: ${data.message}`)
		}
		return data
	}

	async post(
		url: string,
		postData: string,
		options?: {
			maxTimeout?: number
			session?: string
			cookies?: Array<{ name: string, value: string }>
			js?: string
		},
	): Promise<ByparrResponse> {
		const res = await fetch(`${this.#baseUrl}/v1`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				cmd: "request.post",
				url,
				postData,
				maxTimeout: options?.maxTimeout ?? 60000,
				session: options?.session,
				cookies: options?.cookies,
				js: options?.js,
			}),
		})

		const data = (await res.json()) as ByparrResponse
		if (data.status !== "ok") {
			throw new Error(`Byparr error: ${data.message}`)
		}
		return data
	}

	async createSession(sessionId?: string): Promise<string> {
		const res = await fetch(`${this.#baseUrl}/v1`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				cmd: "sessions.create",
				session: sessionId,
			}),
		})
		const data = (await res.json()) as ByparrSessionResponse
		if (data.status !== "ok") {
			throw new Error(`Byparr session create error: ${data.message}`)
		}
		return data.session
	}

	async listSessions(): Promise<string[]> {
		const res = await fetch(`${this.#baseUrl}/v1`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				cmd: "sessions.list",
			}),
		})
		const data = (await res.json()) as ByparrSessionListResponse
		if (data.status !== "ok") {
			throw new Error(`Byparr session list error: ${data.message}`)
		}
		return data.sessions
	}

	async destroySession(sessionId: string): Promise<void> {
		const res = await fetch(`${this.#baseUrl}/v1`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				cmd: "sessions.destroy",
				session: sessionId,
			}),
		})
		const data = (await res.json()) as ByparrSessionResponse
		if (data.status !== "ok") {
			throw new Error(`Byparr session destroy error: ${data.message}`)
		}
	}
}
