// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: ["@nuxt/ui", "@dokushohq/nuxt-processor", "@vueuse/nuxt", "@nuxt/eslint", "nuxt-nodemailer", "nuxt-email-renderer", "nuxt-charts", "@nuxt/test-utils/module"],
	devtools: { enabled: true },
	css: ["~/assets/css/main.css"],
	runtimeConfig: {
		databaseUrl: "",
		databaseMaxConnections: 10,
		redisUrl: "",
		meiliHost: "",
		meiliMasterKey: "",
		s3Endpoint: "",
		s3AccessKeyId: "",
		s3SecretAccessKey: "",
		s3BucketName: "",
		s3PublicBaseUrl: "",
		authSecret: "",
		enablePassword: false,
		disableSignup: false,
		corsOrigins: "",
		oidcProviderId: "",
		oidcClientId: "",
		oidcClientSecret: "",
		oidcDiscoveryUrl: "",
		oidcRoleMap: "{ \"admin\": \"admin\", \"user\": \"user\" }",
		schedulerFetchLatestCron: "*/30 * * * *",
		schedulerRefreshAllCron: "0 3 * * 0",
		schedulerMaxPages: 5,
		schedulerFingerprintSize: 50,
		schedulerRecentlyCheckedMs: 900000, // 15 * 60 * 1000
		schedulerRefreshSpreadMs: 86400000, // 24 * 60 * 60 * 1000
		softDeleteDelayDays: 7,
		suwayomiUrl: "",
		forceDisableSource: "",
		importSimilarityThreshold: "0.8",
		enabledLanguages: "En",
		primaryLanguage: "En",
		fallbackPrimaryLanguage: "En",
		byparrUrl: "",
		public: {
			baseUrl: "http://localhost:3000",
			oidcProviderName: "",
		},
	},
	compatibilityDate: "2026-01-12",
	eslint: {
		config: {
			stylistic: {
				indent: "tab",
				quotes: "double",
			},
			typescript: { strict: true },
		},
		checker: true,
	},
	nodemailer: {
		from: "", // Set via NUXT_NODEMAILER_FROM env var
		host: "", // Set via NUXT_NODEMAILER_HOST env var
		port: 465,
		secure: true,
		auth: {
			user: "", // Set via NUXT_NODEMAILER_AUTH_USER env var
			pass: "", // Set via NUXT_NODEMAILER_AUTH_PASS env var
		},
	},
})
