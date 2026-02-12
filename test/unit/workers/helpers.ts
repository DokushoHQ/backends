import { vi } from "vitest"

type MockJobOverrides = {
	data?: Record<string, unknown>
	attemptsMade?: number
	opts?: Record<string, unknown>
}

export function createMockJob(overrides: MockJobOverrides = {}) {
	return {
		data: overrides.data ?? {},
		attemptsMade: overrides.attemptsMade ?? 0,
		opts: overrides.opts ?? {},
		log: vi.fn(),
		updateProgress: vi.fn().mockResolvedValue(undefined),
		updateData: vi.fn().mockResolvedValue(undefined),
		moveToDelayed: vi.fn().mockResolvedValue(undefined),
	}
}
