import { CachedRecurringSummary } from "@/components/workspace/cached-recurring-summary"
import { CachedPendingPayments } from "@/components/workspace/cached-pending-payments"
import { AccountTools } from "@/components/financial-accounts/account-tools"
import {
    CachedOverviewBalances,
    CachedOverviewBalanceHistory,
} from "@/components/workspace/cached-overview"
import type { TransactionQuery } from "@/lib/transaction-filters"
type Props = {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}
export async function OverviewPendingPayments({
    params,
}: Pick<Props, "params">) {
    return <CachedPendingPayments accountId={(await params).id} />
}
export async function OverviewBalances({ params, searchParams }: Props) {
    return (
        <CachedOverviewBalances
            accountId={(await params).id}
            query={await searchParams}
        />
    )
}
export async function OverviewBalanceHistory({
    params,
}: Pick<Props, "params">) {
    return <CachedOverviewBalanceHistory accountId={(await params).id} />
}

export async function OverviewTools({ params }: Pick<Props, "params">) {
    return <AccountTools accountId={(await params).id} />
}

export async function OverviewRecurring({ params }: Pick<Props, "params">) {
    return <CachedRecurringSummary accountId={(await params).id} />
}
