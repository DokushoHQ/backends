// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: ["@nuxt/ui", "@dokushohq/nuxt-processor", "@vueuse/nuxt", "@nuxt/eslint", "nuxt-nodemailer", "nuxt-email-renderer", "nuxt-charts", "@nuxt/test-utils/module", "@nuxt/image"],
	devtools: { enabled: true },
	css: ["~/assets/css/main.css"],
	app: {
		head: {
			script: [
				{
					// Prevent theme flash by applying theme class before render
					// Must match STORAGE_KEY and DEFAULT_THEME in useTheme.ts
					innerHTML: `(function(){var t=localStorage.getItem('dokusho-theme')||'default';document.documentElement.classList.add('theme-'+t)})()`,
				},
			],
		},
	},
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
		gifMaxSizeMb: 10,
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
		schedulerRetryFailedPagesCron: "0 */6 * * *",
		schedulerReindexAllCron: "", // Disabled by default, e.g. "0 4 * * 0" for Sunday 4 AM
		schedulerMaxPages: 5,
		schedulerFingerprintSize: 50,
		schedulerRecentlyCheckedMs: 900000, // 15 * 60 * 1000
		schedulerRefreshSpreadMs: 86400000, // 24 * 60 * 60 * 1000
		softDeleteDelayDays: 7,
		skipMeilisearchConfig: false,
		skipSourcesSync: false,
		skipSchedulerSetup: false,
		suwayomiUrl: "",
		forceDisableSource: "",
		importSimilarityThreshold: "0.8",
		duplicateDetectionThreshold: 0.85,
		duplicateDetectionBatchSize: 100,
		openrouterApiKey: "",
		enabledLanguages: "En",
		primaryLanguage: "En",
		fallbackPrimaryLanguage: "En",
		byparrUrl: "",
		public: {
			baseUrl: "http://localhost:3000",
			oidcProviderName: "",
			allowedImageProxy: "", // Comma-separated hosts, e.g. "localhost:4567,uploads.mangadex.org"
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
	image: {
		provider: "smart",
		providers: {
			smart: {
				name: "smart",
				provider: "~/providers/smart",
			},
		},
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
