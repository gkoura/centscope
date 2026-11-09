import { workspaceAccount } from "@/lib/account-workspace"
import { financialAccess } from "@/lib/financial-access"
import { MemberRefresh } from "@/components/workspace/member-refresh"
import { listSharedAccounts } from "@/lib/account-sharing"
import { CachedAccountNavigation } from "@/components/workspace/cached-account-navigation"
export async function AccountNavigationContent({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const [memberships, account, access] = await Promise.all([
        listSharedAccounts(),
        workspaceAccount(id),
        financialAccess(id),
    ])
    const shared = memberships.map(({ financialAccount }) => financialAccount)
    return (
        <>
            {shared.some((a) => a.id === id) && (
                <MemberRefresh accountId={id} />
            )}
            <CachedAccountNavigation
                accountId={id}
                shared={shared}
                theme={account.theme}
                isOwner={access.isOwner}
            />
        </>
    )
}
