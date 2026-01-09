import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { PrismaClient } from "../../prisma/generated/client"

let _db: PrismaClient | null = null

function createDb() {
	const config = useRuntimeConfig()
	const pool = new Pool({
		connectionString: config.databaseUrl,
		max: config.databaseMaxConnections,
	})
	const adapter = new PrismaPg(pool)
	return new PrismaClient({ adapter })
}

export function getDb(): PrismaClient {
	if (!_db) {
		_db = createDb()
	}
	return _db
}

// Lazy proxy for convenience - allows importing db and using it directly
export const db = new Proxy({} as PrismaClient, {
	get(_target, prop: string | symbol) {
		const client = getDb()
		const value = client[prop as keyof PrismaClient]
		if (typeof value === "function") {
			return value.bind(client)
		}
		return value
	},
})

export type DBContext = { db: typeof db }

// Re-export generated types
export * from "../../prisma/generated/client"
