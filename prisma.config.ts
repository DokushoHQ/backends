import { defineConfig } from "prisma/config"

export default defineConfig({
	schema: "prisma/schema",
	migrations: {
		path: "prisma/migrations",
	},
	datasource: {
		url: process.env.NUXT_DATABASE_URL,
	},
})
