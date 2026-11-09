import { workspaceAccount } from "@/lib/account-workspace"

export async function AccountThemeContent({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const account = await workspaceAccount((await params).id)
    return <span hidden data-account-theme={account.theme} />
}
