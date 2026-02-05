import { authed } from "../middleware/auth"

export const me = authed
	.handler(async ({ context }) => {
		return {
			id: context.user.id,
			name: context.user.name,
			email: context.user.email,
			image: context.user.image,
			role: context.user.role,
		}
	})

export const userRouter = {
	me,
}
