import { ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react"
import { formatWalletMoney } from "@/lib/wallet-input"
import type { summarizeActivity } from "@/lib/account-summary"
export function ActivitySummary({
    activity,
    compact = false,
    walletActivityExpanded = false,
}: {
    compact?: boolean
    walletActivityExpanded?: boolean
    activity: ReturnType<typeof summarizeActivity>
}) {
    return (
        <section
            aria-label="Period totals"
            className={
                compact
                    ? "activity-summary-compact flex flex-col gap-2"
                    : "flex flex-col gap-3"
            }
        >
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-medium">
                    {activity.status === "PENDING"
                        ? "Pending totals"
                        : "Posted totals"}
                </h2>
                <p className="text-xs text-muted-foreground">
                    {activity.status === "PENDING"
                        ? `${activity.pendingCount} pending`
                        : `${activity.postedCount} posted${activity.pendingCount ? ` · ${activity.pendingCount} pending` : ""}`}
                </p>
            </div>
            {activity.currencies.length ? (
                activity.currencies.map((total) => (
                    <div
                        key={total.currency}
                        className="grid grid-cols-3 gap-2"
                    >
                        {[
                            {
                                label: "Income",
                                amount: total.income,
                                icon: ArrowDownLeft,
                            },
                            {
                                label: "Expenses",
                                amount: total.expenses,
                                icon: ArrowUpRight,
                            },
                            {
                                label: "Net",
                                amount: total.net,
                                icon: TrendingUp,
                            },
                        ].map(({ label, amount, icon: Icon }) => (
                            <div key={label} className="activity-stat">
                                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <Icon
                                        data-flow={
                                            label === "Income"
                                                ? "income"
                                                : label === "Expenses"
                                                  ? "expense"
                                                  : undefined
                                        }
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    {label}
                                </span>
                                <p
                                    data-flow={
                                        label === "Income"
                                            ? "income"
                                            : label === "Expenses"
                                              ? "expense"
                                              : amount.startsWith("-")
                                                ? "expense"
                                                : amount === "0.00"
                                                  ? undefined
                                                  : "income"
                                    }
                                    className="mt-2 text-sm font-semibold wrap-break-word tabular-nums sm:text-lg"
                                >
                                    {formatWalletMoney(amount, total.currency)}
                                </p>
                            </div>
                        ))}
                    </div>
                ))
            ) : (
                <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                    No activity in this period.
                </p>
            )}
            {!compact && (
                <p className="text-[11px] leading-5 text-muted-foreground">
                    {activity.status === "PENDING"
                        ? "Pending entries don’t affect your balance."
                        : "Pending entries excluded."}{" "}
                    Transfers and opening balances aren’t income or spending.
                </p>
            )}
            {activity.wallets.length > 0 && (
                <details
                    className="rounded-xl border bg-card"
                    open={walletActivityExpanded}
                >
                    <summary className="cursor-pointer px-4 py-3 text-xs font-medium">
                        Activity by wallet
                    </summary>
                    {compact && (
                        <p className="text-[11px] leading-5 text-muted-foreground">
                            {activity.status === "PENDING"
                                ? "Pending entries don’t affect your balance."
                                : "Pending entries excluded."}{" "}
                            Transfers and opening balances aren’t income or
                            spending.
                        </p>
                    )}
                    <ul className="divide-y border-t">
                        {activity.wallets.map((wallet) => (
                            <li
                                key={wallet.id}
                                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"
                            >
                                <span className="min-w-0 wrap-break-word">
                                    {wallet.name}
                                </span>
                                <span className="text-muted-foreground">
                                    <span data-flow="income">
                                        In{" "}
                                        {formatWalletMoney(
                                            wallet.income,
                                            wallet.currency
                                        )}
                                    </span>
                                    {" · "}
                                    <span data-flow="expense">
                                        Out{" "}
                                        {formatWalletMoney(
                                            wallet.expenses,
                                            wallet.currency
                                        )}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    )
}
