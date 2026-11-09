import { AuthEmailLayout, type AuthEmailProps } from "./_components/auth-email"

export default function AccountInvitation({ url }: AuthEmailProps) {
    return (
        <AuthEmailLayout
            url={url}
            preview="An invitation to a CentScope financial account"
            heading="Financial account invitation"
            message="Sign in with this email address to review and accept your invitation."
            action="Review invitation"
            expiry="This invitation expires in seven days."
            security="If you weren’t expecting this invitation, you can ignore it."
        />
    )
}
