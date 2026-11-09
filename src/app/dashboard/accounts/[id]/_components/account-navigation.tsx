import { MemberRefresh } from "@/components/workspace/member-refresh"
import { listSharedAccounts } from "@/lib/account-sharing"
import { CachedAccountNavigation } from "@/components/workspace/cached-account-navigation"
export async function AccountNavigationContent({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const shared = (await listSharedAccounts()).map(
        ({ financialAccount }) => financialAccount
    )
    const { id } = await params
    return (
        <>
            {shared.some((a) => a.id === id) && (
                <MemberRefresh accountId={id} />
            )}
            <CachedAccountNavigation accountId={id} shared={shared} />
        </>
    )
}
