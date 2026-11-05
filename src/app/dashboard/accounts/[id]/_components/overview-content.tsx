import { getOwnedSmoothedBalanceHistory } from "@/lib/smoothed-balance-data"
import { BalanceHistoryChart } from "@/components/workspace/balance-history-chart"
import { periodEntryDate } from "@/lib/transaction-return"
import Link from "next/link"
import { workspaceAccount, workspaceWallets } from "@/lib/account-workspace"
import { resolveAccountPeriod, periodQuery } from "@/lib/account-period"
import { getOwnedAccountActivity } from "@/lib/account-summary-data"
import { moneyCents } from "@/lib/expense-spread"
import { formatWalletMoney } from "@/lib/wallet-input"
import type { TransactionQuery } from "@/lib/transaction-filters"
import { PeriodControls } from "@/components/workspace/period-controls"
import { BalanceSummary } from "@/components/workspace/balance-summary"
import { ActivitySummary } from "@/components/workspace/activity-summary"
import { RecurringSync } from "@/components/financial-accounts/recurring-sync"
import { Button } from "@/components/ui/button"
import { Plus, ArrowRight } from "lucide-react"

export async function OverviewBalances({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}) {
    const { id } = await params
    const account = await workspaceAccount(id),
        wallets = await workspaceWallets(id)
    const today = new Date().toISOString().slice(0, 10)
    const period = resolveAccountPeriod(
        { ...(await searchParams), view: "month" },
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
export async function OverviewAnalysis({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}) {
    const { id } = await params
    await workspaceAccount(id)
    const query = await searchParams,
        today = new Date().toISOString().slice(0, 10)
    const period = resolveAccountPeriod({ ...query, view: "month" }, today)
    const activity = await getOwnedAccountActivity(id, {
        from: period.from,
        to: period.to,
    })
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
                                            <span className="shrink-0 font-medium tabular-nums">
                                                {formatWalletMoney(
                                                    category.amount,
                                                    currency
                                                )}
                                            </span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-primary/70"
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

export async function OverviewBalanceHistory({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<TransactionQuery>
}) {
    const { id } = await params
    const [account, wallets, query] = await Promise.all([
        workspaceAccount(id),
        workspaceWallets(id),
        searchParams,
    ])
    if (!wallets.length) return null
    const today = new Date().toISOString().slice(0, 10)
    const period = resolveAccountPeriod({ ...query, view: "month" }, today)
    const series = await getOwnedSmoothedBalanceHistory(
        id,
        period.month,
        wallets.map((wallet) => wallet.currency)
    )
    return (
        <BalanceHistoryChart
            series={series}
            defaultCurrency={account.reportingCurrency}
            today={today}
        />
    )
}
