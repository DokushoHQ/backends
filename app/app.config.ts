export default defineAppConfig({
	ui: {
		colors: {
			primary: "indigo",
			secondary: "slate",
			success: "emerald",
			info: "sky",
			warning: "amber",
			error: "red",
			neutral: "slate",
		},
		card: {
			variants: {
				variant: {
					outline: {
						root: "bg-elevated ring ring-default",
					},
				},
			},
		},
	},
})
