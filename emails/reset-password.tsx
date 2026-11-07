import { AuthEmailLayout, type AuthEmailProps } from "./_components/auth-email"

export default function ResetPassword({ url, locale }: AuthEmailProps) {
    return (
        <AuthEmailLayout
            url={url}
            locale={locale}
            preview="Reset your CentScope password. This link expires in 30 minutes."
            heading="Reset your password"
            message="We received a request to reset your CentScope password. Use the button below to choose a new one."
            action="Reset password"
            expiry="This link expires in 30 minutes and can only be used once."
            security="If you didn’t request a reset, you can safely ignore this email. Your password has not changed."
        />
    )
}

ResetPassword.PreviewProps = {
    url: "https://example.com/auth/reset-password?token=preview-only",
} satisfies AuthEmailProps
