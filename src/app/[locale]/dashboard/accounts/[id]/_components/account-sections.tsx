import { CachedWallets } from "@/components/workspace/cached-wallets"
export async function AccountWallets({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    return <CachedWallets accountId={(await params).id} />
}
export { TransactionWorkspace as AccountTransactions } from "./transaction-workspace"
