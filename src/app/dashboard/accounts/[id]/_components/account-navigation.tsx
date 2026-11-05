import { workspaceAccount, workspaceAccounts } from "@/lib/account-workspace"
import { AccountNavigation } from "@/components/financial-accounts/account-navigation"
export async function AccountNavigationContent({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const [account, accounts] = await Promise.all([
        workspaceAccount(id),
        workspaceAccounts(),
    ])
    return <AccountNavigation accountId={account.id} accounts={accounts} />
}
