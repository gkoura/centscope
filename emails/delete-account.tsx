import { AuthEmailLayout, type AuthEmailProps } from "./_components/auth-email"

export default function DeleteAccount({ url, locale }: AuthEmailProps) {
    return (
        <AuthEmailLayout
            url={url}
            locale={locale}
            preview="Confirm your request to permanently delete your CentScope account."
            heading="Confirm account deletion"
            message="You requested to permanently delete your CentScope account, including your financial accounts, wallets, transactions, categories and recurring schedules. This cannot be undone. Confirm using the link below while signed in."
            action="Confirm account deletion"
            expiry="This link expires in 30 minutes and can only be used once."
            security="If you didn’t request this, ignore this email. Your account has not been deleted."
        />
    )
}

DeleteAccount.PreviewProps = {
    url: "https://example.com/api/auth/delete-user/callback?token=preview-only",
} satisfies AuthEmailProps
