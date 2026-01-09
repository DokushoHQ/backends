<script setup lang="ts">
interface Props {
	userName: string
	resetUrl: string
}
defineProps<Props>()
</script>

<template>
	<EHtml>
		<EHead />
		<EBody style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 0;">
			<EContainer style="max-width: 560px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
				<EHeading style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 24px 0;">
					Password Reset Request
				</EHeading>
				<EText style="color: #4a4a4a; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
					Hi {{ userName }},
				</EText>
				<EText style="color: #4a4a4a; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
					You requested to reset your password. Click the button below to set a new password:
				</EText>
				<EButton
					:href="resetUrl"
					style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 500;"
				>
					Reset Password
				</EButton>
				<EText style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 32px 0 0 0;">
					If you didn't request this, you can safely ignore this email.
					This link will expire in 1 hour.
				</EText>
				<EHr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
				<EText style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0;">
					This email was sent by Dokusho. If you have any questions, please contact your administrator.
				</EText>
			</EContainer>
		</EBody>
	</EHtml>
</template>
