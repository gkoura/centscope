import { AccountTools } from "@/components/financial-accounts/account-tools"
import {
    CachedOverviewBalances,
    CachedOverviewAnalysis,
    CachedOverviewBalanceHistory,
} from "@/components/workspace/cached-overview"
import type { TransactionQuery } from "@/lib/transaction-filters"
type Props = {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}
export async function OverviewBalances({ params, searchParams }: Props) {
    return (
        <CachedOverviewBalances
            accountId={(await params).id}
            query={await searchParams}
        />
    )
}
export async function OverviewAnalysis({ params, searchParams }: Props) {
    return (
        <CachedOverviewAnalysis
            accountId={(await params).id}
            query={await searchParams}
        />
    )
}
export async function OverviewBalanceHistory({ params, searchParams }: Props) {
    return (
        <CachedOverviewBalanceHistory
            accountId={(await params).id}
            query={await searchParams}
        />
    )
}

export async function OverviewTools({ params }: Pick<Props, "params">) {
    return <AccountTools accountId={(await params).id} />
}
