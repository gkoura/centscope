import { CachedTransactions } from "@/components/workspace/cached-transactions"
import type { TransactionQuery } from "@/lib/transaction-filters"
export async function TransactionWorkspace({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}) {
    return (
        <CachedTransactions
            accountId={(await params).id}
            query={await searchParams}
        />
    )
}
