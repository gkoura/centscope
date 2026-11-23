import { ChevronDown } from "lucide-react"
import { balanceTotals, type summarizeActivity } from "@/lib/account-summary"
import { formatWalletMoney } from "@/lib/wallet-input"
import type { listOwnedAccountWallets } from "@/lib/wallets"
import { WalletBalanceTiles } from "./wallet-balance-tiles"
import { ActivitySummary } from "./activity-summary"

export function TransactionSummary({
    wallets,
    activity,
    accountId,
    periodQuery,
    selectedWallets,
}: {
    wallets: Awaited<ReturnType<typeof listOwnedAccountWallets>>
    activity: ReturnType<typeof summarizeActivity>
    accountId: string
    periodQuery: Record<string, string>
    selectedWallets?: string
}) {
    const totals = balanceTotals(wallets)
    const pending = activity.status === "PENDING"

    return (
        <section
            aria-label="Balance and period totals"
            className="transaction-summary"
        >
            <details className="transaction-balance-details">
                <summary className="transaction-balance-trigger">
                    <span className="text-xs text-muted-foreground">
                        Balance
                        <span className="sr-only"> · posted, all dates</span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1">
                        {totals.length ? (
                            totals.map((total) => (
                                <strong
                                    key={total.currency}
                                    className="text-lg font-semibold tracking-tight wrap-anywhere tabular-nums"
                                >
                                    {formatWalletMoney(
                                        total.amount,
                                        total.currency
                                    )}
                                </strong>
                            ))
                        ) : (
                            <strong className="text-sm font-medium">
                                No wallets yet
                            </strong>
                        )}
                    </span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                        Wallets & details
                    </span>
                    <ChevronDown
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                    />
                </summary>
                <div className="flex min-w-0 flex-col gap-4 pb-3">
                    <p className="text-xs text-muted-foreground">
                        Current posted balance, across all dates. Currencies are
                        shown separately.
                    </p>
                    {wallets.length > 0 && (
                        <WalletBalanceTiles
                            wallets={wallets}
                            accountId={accountId}
                            periodQuery={periodQuery}
                            filterable
                            selectedWallets={selectedWallets}
                        />
                    )}
                    <ActivitySummary
                        compact
                        walletActivityExpanded
                        activity={activity}
                    />
                </div>
            </details>
            <div
                className="transaction-period-totals"
                aria-label={
                    pending ? "Pending period totals" : "Posted period totals"
                }
                title={
                    pending
                        ? "Pending entries don’t affect your balance."
                        : "Posted totals · pending entries excluded."
                }
            >
                {activity.currencies.length ? (
                    activity.currencies.map((total) => (
                        <dl
                            key={total.currency}
                            className="transaction-totals-row"
                        >
                            {[
                                {
                                    label: pending ? "Pending in" : "Income",
                                    amount: total.income,
                                    flow: "income",
                                },
                                {
                                    label: pending ? "Pending out" : "Expenses",
                                    amount: total.expenses,
                                    flow: "expense",
                                },
                                {
                                    label: pending ? "Pending net" : "Net",
                                    amount: total.net,
                                    flow: total.net.startsWith("-")
                                        ? "expense"
                                        : total.net === "0.00"
                                          ? undefined
                                          : "income",
                                },
                            ].map(({ label, amount, flow }) => (
                                <div key={label} className="min-w-0">
                                    <dt className="text-[11px] text-muted-foreground">
                                        {label}
                                    </dt>
                                    <dd
                                        data-flow={flow}
                                        className="mt-0.5 text-sm font-semibold wrap-anywhere tabular-nums"
                                    >
                                        {formatWalletMoney(
                                            amount,
                                            total.currency
                                        )}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    ))
                ) : (
                    <p className="text-xs text-muted-foreground">
                        No activity in this period.
                    </p>
                )}
            </div>
        </section>
    )
}
