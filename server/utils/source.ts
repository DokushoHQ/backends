import type { Source } from "./db"
import { db } from "./db"

/**
 * Source for UI selection (dropdowns, dialogs)
 */
export type SourceForSelect = Pick<Source, "id" | "name" | "external_id" | "icon">

/**
 * Get all enabled sources for UI selection
 */
export async function getEnabledSources(): Promise<SourceForSelect[]> {
	return db.source.findMany({
		where: { enabled: true },
		select: { id: true, name: true, external_id: true, icon: true },
		orderBy: { name: "asc" },
	})
}

/**
 * Get a source by ID, only if enabled
 */
export async function getEnabledSourceById(id: string): Promise<Source | null> {
	return db.source.findUnique({
		where: { id, enabled: true },
	})
}
