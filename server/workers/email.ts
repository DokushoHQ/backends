import { defineWorker } from "#processor"
import { MetricsTime, type Job } from "bullmq"
import type { EmailJobData } from "../queues/email"
import { QUEUE_NAME, emailJobDataSchema } from "../queues/email"

async function sendPasswordResetEmail(
	job: Job<EmailJobData>,
	to: string,
	userName: string,
	resetUrl: string,
) {
	job.log(`Sending password reset email to ${to}`)

	const { sendMail } = useNodeMailer()

	const html = await renderEmailComponent("PasswordResetEmail", {
		userName,
		resetUrl,
	})

	await job.updateProgress(50)

	await sendMail({
		to,
		subject: "Reset your Dokusho password",
		html,
	})

	await job.updateProgress(100)
	job.log(`Password reset email sent to ${to}`)
}

async function sendPasswordResetConfirmation(
	job: Job<EmailJobData>,
	to: string,
	userName: string,
) {
	job.log(`Sending password reset confirmation to ${to}`)

	const { sendMail } = useNodeMailer()

	const html = await renderEmailComponent("PasswordResetConfirmation", {
		userName,
	})

	await job.updateProgress(50)

	await sendMail({
		to,
		subject: "Your password has been changed",
		html,
	})

	await job.updateProgress(100)
	job.log(`Password reset confirmation sent to ${to}`)
}

async function sendVerificationEmail(
	job: Job<EmailJobData>,
	to: string,
	userName: string,
	verificationUrl: string,
) {
	job.log(`Sending verification email to ${to}`)

	const { sendMail } = useNodeMailer()

	const html = await renderEmailComponent("EmailVerificationEmail", {
		userName,
		verificationUrl,
	})

	await job.updateProgress(50)

	await sendMail({
		to,
		subject: "Verify your Dokusho account",
		html,
	})

	await job.updateProgress(100)
	job.log(`Verification email sent to ${to}`)
}

async function sendChangeEmailEmail(
	job: Job<EmailJobData>,
	to: string,
	userName: string,
	changeEmailUrl: string,
) {
	job.log(`Sending email change verification to ${to}`)

	const { sendMail } = useNodeMailer()

	const html = await renderEmailComponent("ChangeEmailEmail", {
		userName,
		changeEmailUrl,
	})

	await job.updateProgress(50)

	await sendMail({
		to,
		subject: "Verify your new email address",
		html,
	})

	await job.updateProgress(100)
	job.log(`Email change verification sent to ${to}`)
}

async function sendChangeEmailWarning(
	job: Job<EmailJobData>,
	to: string,
	userName: string,
	newEmail: string,
) {
	job.log(`Sending email change warning to ${to}`)

	const { sendMail } = useNodeMailer()

	const html = await renderEmailComponent("EmailChangeWarning", {
		userName,
		newEmail,
	})

	await job.updateProgress(50)

	await sendMail({
		to,
		subject: "Your email address is being changed",
		html,
	})

	await job.updateProgress(100)
	job.log(`Email change warning sent to ${to}`)
}

export default defineWorker<typeof QUEUE_NAME, EmailJobData, undefined>({
	name: QUEUE_NAME,
	options: {
		metrics: { maxDataPoints: MetricsTime.ONE_WEEK * 2 },
	},
	async processor(job) {
		const data = emailJobDataSchema.parse(job.data)

		await job.updateProgress(10)

		if (data.type === "PASSWORD_RESET") {
			if (!data.resetUrl) {
				throw new Error("resetUrl is required for PASSWORD_RESET type")
			}
			await sendPasswordResetEmail(
				job,
				data.to,
				data.userName || "User",
				data.resetUrl,
			)
		}
		else if (data.type === "PASSWORD_RESET_CONFIRMATION") {
			await sendPasswordResetConfirmation(
				job,
				data.to,
				data.userName || "User",
			)
		}
		else if (data.type === "EMAIL_VERIFICATION") {
			if (!data.verificationUrl) {
				throw new Error("verificationUrl is required for EMAIL_VERIFICATION type")
			}
			await sendVerificationEmail(
				job,
				data.to,
				data.userName || "User",
				data.verificationUrl,
			)
		}
		else if (data.type === "EMAIL_CHANGE") {
			if (!data.changeEmailUrl) {
				throw new Error("changeEmailUrl is required for EMAIL_CHANGE type")
			}
			await sendChangeEmailEmail(
				job,
				data.to,
				data.userName || "User",
				data.changeEmailUrl,
			)
		}
		else if (data.type === "EMAIL_CHANGE_WARNING") {
			if (!data.newEmail) {
				throw new Error("newEmail is required for EMAIL_CHANGE_WARNING type")
			}
			await sendChangeEmailWarning(
				job,
				data.to,
				data.userName || "User",
				data.newEmail,
			)
		}
	},
})
