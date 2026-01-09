import { defineQueue } from "#processor"
import { z } from "zod"

export const QUEUE_NAME = "email" as const
export const DISPLAY_NAME = "Email"

export const emailJobDataSchema = z.object({
	type: z.enum(["PASSWORD_RESET", "PASSWORD_RESET_CONFIRMATION", "EMAIL_VERIFICATION", "EMAIL_CHANGE", "EMAIL_CHANGE_WARNING"]),
	to: z.string().email(),
	userName: z.string().optional(),
	// Password reset specific
	resetUrl: z.string().url().optional(),
	// Email verification specific
	verificationUrl: z.string().url().optional(),
	// Email change specific
	changeEmailUrl: z.string().url().optional(),
	// Email change warning specific (the new email being changed to)
	newEmail: z.string().email().optional(),
})

export type EmailJobData = z.infer<typeof emailJobDataSchema>

export default defineQueue<EmailJobData, undefined, "email-change" | "email-change-warning" | "email-verification" | "password-reset" | "password-reset-confirmation" | typeof QUEUE_NAME>({
	name: QUEUE_NAME,
	options: {
		defaultJobOptions: {
			removeOnComplete: { age: 60 * 60 * 24 }, // Keep completed jobs for 1 day
			removeOnFail: { age: 60 * 60 * 24 * 7 }, // Keep failed jobs for 7 days
			attempts: 3,
			backoff: { type: "exponential", delay: 5000 },
		},
	},
})
