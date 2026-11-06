import { LinkedAccounts } from "@/components/auth/settings/security/linked-accounts"
import { DangerZone } from "@/components/auth/delete-user/danger-zone"
import { requireVerifiedSession } from "@/lib/auth/session"

export async function SecurityMethods() {
    await requireVerifiedSession()
    return (
        <>
            <LinkedAccounts />
            <DangerZone />
        </>
    )
}
