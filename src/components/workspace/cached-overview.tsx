"use client"

import { useWorkspaceQuery, useWorkspaceDay } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import dynamic from "next/dynamic"
import { SectionLoading } from "@/components/site/section-loading"
import { periodEntryDate } from "@/lib/transaction-return"
import Link from "next/link"
import { resolveAccountPeriod, periodQuery } from "@/lib/account-period"
import type { TransactionQuery } from "@/lib/transaction-filters"
import { BalanceSummary } from "@/components/workspace/balance-summary"
import { RecurringSync } from "@/components/financial-accounts/recurring-sync"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { shiftMonth } from "@/lib/expense-spread"

// The chart library must not delay the balance and account controls on a cold load.
const BalanceHistoryChart = dynamic(
    () =>
        import("./balance-history-chart").then(
            (module) => module.BalanceHistoryChart
        ),
    { loading: () => <SectionLoading label="Loading balance history…" /> }
)

export function CachedOverviewBalances({
    accountId: id,
    query,
}: {
    accountId: string
    query: TransactionQuery
}) {
    const reference = useWorkspaceQuery("reference", id)
    const today = useWorkspaceDay()
    if (!reference.data || !today)
        return (
            <WorkspaceQueryState
                queries={[reference]}
                label="Loading balances…"
            />
        )
    const { account, wallets } = reference.data
    const period = resolveAccountPeriod(
        { ...query, view: query.view === "all" ? "all" : "month" },
        today
    )
    const transactionsHref = `/dashboard/accounts/${id}/transactions?${new URLSearchParams(periodQuery(period))}`
    return (
        <>
            <RecurringSync accountId={id} />
            <BalanceSummary
                wallets={wallets}
                accountId={account.id}
                periodQuery={periodQuery(period)}
            />
            <Button
                size="icon-lg"
                className="overview-add-button"
                nativeButton={false}
                title={
                    wallets.length ? "Add transaction" : "Add your first wallet"
                }
                aria-label={
                    wallets.length ? "Add transaction" : "Add your first wallet"
                }
                render={
                    <Link
                        href={
                            wallets.length
                                ? `/dashboard/accounts/${id}/transactions/new?${new URLSearchParams({ returnTo: transactionsHref, date: periodEntryDate(period, today) })}`
                                : `/dashboard/accounts/${id}/wallets/new`
                        }
                    />
                }
            >
                <Plus />
            </Button>
        </>
    )
}
export function CachedOverviewBalanceHistory({
    accountId: id,
}: {
    accountId: string
}) {
    const reference = useWorkspaceQuery("reference", id)
    const today = useWorkspaceDay()
    const history = useWorkspaceQuery("balanceHistory", id, {
        month: today ? shiftMonth(today.slice(0, 7), -1) : undefined,
    })
    if (!reference.data || !history.data || !today)
        return (
            <WorkspaceQueryState
                queries={[reference, history]}
                label="Loading balance history…"
            />
        )
    const { account, wallets } = reference.data
    if (!wallets.length) return null
    const series = history.data
    return (
        <BalanceHistoryChart
            series={series}
            defaultCurrency={account.reportingCurrency}
            today={today}
        />
    )
}
