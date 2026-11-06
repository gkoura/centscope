import { AuthEmailLayout, type AuthEmailProps } from "./_components/auth-email"

export default function VerifyEmail({ url }: AuthEmailProps) {
    return (
        <AuthEmailLayout
            url={url}
            preview="Welcome to CentScope. Verify your email to get started."
            heading="Verify your email"
            message="Welcome to CentScope. Confirm your email address to start bringing your money into focus."
            action="Verify email"
            expiry="This link expires in one hour."
            security="If you didn’t create a CentScope account, you can safely ignore this email."
        />
    )
}

VerifyEmail.PreviewProps = {
    url: "https://example.com/api/auth/verify-email?token=preview-only",
} satisfies AuthEmailProps
