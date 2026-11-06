import { LinkedAccounts } from "@/components/auth/settings/security/linked-accounts"
import { DangerZone } from "@/components/auth/delete-user/danger-zone"
import { requireVerifiedSession } from "@/lib/auth/session"
import { UserProfile } from "@/components/auth/settings/account/user-profile"
import { ChangePassword } from "@/components/auth/settings/security/change-password"
import { ActiveSessions } from "@/components/auth/settings/security/active-sessions"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"

export async function AccountDetails() {
    const { user } = await requireVerifiedSession()
    return (
        <>
            <UserProfile showAvatar={false} />
            <Card>
                <CardHeader>
                    <CardTitle>Email address</CardTitle>
                    <CardDescription>
                        Your sign-in and account recovery email.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 break-all">{user.email}</span>
                    <Badge variant="secondary">
                        {user.emailVerified ? "Verified" : "Not verified"}
                    </Badge>
                </CardContent>
            </Card>
        </>
    )
}

export async function PasswordSettings() {
    await requireVerifiedSession()
    return <ChangePassword />
}

export async function SessionSettings() {
    await requireVerifiedSession()
    return <ActiveSessions />
}

export async function SecurityMethods() {
    await requireVerifiedSession()
    return <LinkedAccounts />
}

export async function DeleteAccountSettings() {
    await requireVerifiedSession()
    return <DangerZone />
}
