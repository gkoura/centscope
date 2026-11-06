"use client"
import { useWorkspaceQuery, useWorkspaceDay } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import dynamic from "next/dynamic"
import { SectionLoading } from "@/components/site/section-loading"
import { periodEntryDate } from "@/lib/transaction-return"
import Link from "next/link"
import { resolveAccountPeriod, periodQuery } from "@/lib/account-period"
import { moneyCents } from "@/lib/expense-spread"
import { formatWalletMoney } from "@/lib/wallet-input"
import type { TransactionQuery } from "@/lib/transaction-filters"
import { PeriodControls } from "@/components/workspace/period-controls"
import { BalanceSummary } from "@/components/workspace/balance-summary"
import { ActivitySummary } from "@/components/workspace/activity-summary"
import { RecurringSync } from "@/components/financial-accounts/recurring-sync"
import { Button } from "@/components/ui/button"
import { Plus, ArrowRight } from "lucide-react"

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
    const period = resolveAccountPeriod({ ...query, view: "month" }, today)
    const transactionsHref = `/dashboard/accounts/${id}/transactions?${new URLSearchParams(periodQuery(period))}`
    return (
        <>
            <RecurringSync accountId={id} />
            <BalanceSummary
                wallets={wallets}
                accountId={account.id}
                periodQuery={periodQuery(period)}
            />
            <div className="grid grid-cols-2 gap-3">
                <Button
                    size="lg"
                    className="h-11"
                    nativeButton={false}
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
                    <Plus data-icon="inline-start" />
                    {wallets.length ? "Add transaction" : "Add wallet"}
                </Button>
                <Button
                    size="lg"
                    className="h-11"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={transactionsHref} />}
                >
                    Transactions
                    <ArrowRight data-icon="inline-end" />
                </Button>
            </div>
        </>
    )
}
export function CachedOverviewAnalysis({
    accountId: id,
    query,
}: {
    accountId: string
    query: TransactionQuery
}) {
    const result = useWorkspaceQuery("activity", id, {
        month: query.month,
        view: "month",
    })
    const today = useWorkspaceDay()
    if (!result.data || !today)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label="Loading monthly activity…"
            />
        )
    const period = resolveAccountPeriod({ ...query, view: "month" }, today)
    const activity = result.data
    const byCurrency = [
        ...new Set(activity.categories.map((category) => category.currency)),
    ]
    return (
        <section
            aria-labelledby="analysis-heading"
            className="flex flex-col gap-5"
        >
            <div className="flex items-center justify-between gap-3">
                <h2
                    id="analysis-heading"
                    className="text-lg font-semibold tracking-tight"
                >
                    Monthly overview
                </h2>
                <Link
                    href={`/dashboard/accounts/${id}/analysis?month=${period.month}`}
                    className="text-xs font-medium text-primary"
                >
                    Detailed analysis →
                </Link>
            </div>
            <PeriodControls
                period={period}
                basePath={`/dashboard/accounts/${id}`}
                monthlyOnly
            />
            <ActivitySummary activity={activity} />
            <section
                aria-label="Spending by category"
                className="rounded-2xl border bg-card p-5"
            >
                <h3 className="mb-5 text-sm font-medium">
                    Where your money went
                </h3>
                {byCurrency.length ? (
                    byCurrency.map((currency) => {
                        const categories = activity.categories.filter(
                                (category) => category.currency === currency
                            ),
                            total = categories.reduce(
                                (sum, item) => sum + moneyCents(item.amount),
                                BigInt(0)
                            )
                        return (
                            <div
                                key={currency}
                                className="mb-6 flex flex-col gap-4 last:mb-0"
                            >
                                {byCurrency.length > 1 && (
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {currency}
                                    </p>
                                )}
                                {categories.map((category) => (
                                    <div key={category.name}>
                                        <div className="mb-2 flex justify-between gap-4 text-xs">
                                            <span className="min-w-0 truncate">
                                                {category.name}
                                            </span>
                                            <span
                                                data-flow="expense"
                                                className="shrink-0 font-medium tabular-nums"
                                            >
                                                {formatWalletMoney(
                                                    category.amount,
                                                    currency
                                                )}
                                            </span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-expense/70"
                                                style={{
                                                    width: `${total > BigInt(0) ? Number((moneyCents(category.amount) * BigInt(10000)) / total) / 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    })
                ) : (
                    <p className="text-sm leading-6 text-muted-foreground">
                        No posted expenses this month. Add a transaction to
                        start seeing your spending patterns.
                    </p>
                )}
            </section>
            <Button
                variant="outline"
                nativeButton={false}
                render={
                    <Link
                        href={`/dashboard/accounts/${id}/transactions?${new URLSearchParams(periodQuery(period))}`}
                    />
                }
            >
                Explore this month’s transactions
                <ArrowRight data-icon="inline-end" />
            </Button>
        </section>
    )
}

export function CachedOverviewBalanceHistory({
    accountId: id,
    query,
}: {
    accountId: string
    query: TransactionQuery
}) {
    const reference = useWorkspaceQuery("reference", id)
    const history = useWorkspaceQuery("balanceHistory", id, query)
    const today = useWorkspaceDay()
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
