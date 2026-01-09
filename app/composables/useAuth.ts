export async function useAuth() {
	// Use useSession with useFetch for SSR compatibility (must be awaited)
	const session = await authClient.useSession(useFetch)

	const user = computed(() => session.data.value?.user ?? null)
	const isAdmin = computed(() => {
		const u = user.value
		return u?.role === "admin"
	})
	const isAuthenticated = computed(() => !!user.value)

	async function signInWithEmail(email: string, password: string) {
		await authClient.signIn.email({ email, password })
	}

	async function signInWithOIDC() {
		await authClient.signIn.social({ provider: "oidc" })
	}

	async function signOut() {
		await authClient.signOut()
		await navigateTo("/login")
	}

	return {
		session: computed(() => session.data.value?.session),
		user,
		isAdmin,
		isAuthenticated,
		pending: computed(() => session.isPending),
		error: computed(() => session.error),
		signInWithEmail,
		signInWithOIDC,
		signOut,
	}
}
