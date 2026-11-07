"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { intlLocale } from "@/lib/i18n/config"

import { useTranslations } from "@/components/i18n/locale-provider"

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
    const locale = useLocale()

    const t = useTranslations()

    return (
        <section
            aria-label={t("Period totals")}
            className={
                compact
                    ? "activity-summary-compact flex flex-col gap-2"
                    : "flex flex-col gap-3"
            }
        >
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-medium">
                    {activity.status === "PENDING"
                        ? t("Pending totals")
                        : t("Posted totals")}
                </h2>
                <p className="text-xs text-muted-foreground">
                    {activity.status === "PENDING"
                        ? t("{value0} pending", {
                              value0: activity.pendingCount,
                          })
                        : t("{value0} posted{value1}", {
                              value0: activity.postedCount,
                              value1: activity.pendingCount
                                  ? t(" · {value0} pending", {
                                        value0: activity.pendingCount,
                                    })
                                  : "",
                          })}
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
                                label: t("Income"),
                                amount: total.income,
                                icon: ArrowDownLeft,
                            },
                            {
                                label: t("Expenses"),
                                amount: total.expenses,
                                icon: ArrowUpRight,
                            },
                            {
                                label: t("Net"),
                                amount: total.net,
                                icon: TrendingUp,
                            },
                        ].map(({ label, amount, icon: Icon }) => (
                            <div key={t(label || "")} className="activity-stat">
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
                                    {t(label || "")}
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
                                    {formatWalletMoney(
                                        amount,
                                        total.currency,
                                        intlLocale(locale)
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>
                ))
            ) : (
                <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                    {t("No activity in this period.")}
                </p>
            )}
            {!compact && (
                <p className="text-[11px] leading-5 text-muted-foreground">
                    {activity.status === "PENDING"
                        ? t("Pending entries don’t affect your balance.")
                        : t("Pending entries excluded.")}{" "}
                    {t(
                        "Transfers and opening balances aren’t income or spending."
                    )}
                </p>
            )}
            {activity.wallets.length > 0 && (
                <details
                    className="rounded-xl border bg-card"
                    open={walletActivityExpanded}
                >
                    <summary className="cursor-pointer px-4 py-3 text-xs font-medium">
                        {t("Activity by wallet")}
                    </summary>
                    {compact && (
                        <p className="text-[11px] leading-5 text-muted-foreground">
                            {activity.status === "PENDING"
                                ? t(
                                      "Pending entries don’t affect your balance."
                                  )
                                : t("Pending entries excluded.")}{" "}
                            {t(
                                "Transfers and opening balances aren’t income or spending."
                            )}
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
                                        {t("In")}{" "}
                                        {formatWalletMoney(
                                            wallet.income,
                                            wallet.currency,
                                            intlLocale(locale)
                                        )}
                                    </span>
                                    {" · "}
                                    <span data-flow="expense">
                                        {t("Out")}{" "}
                                        {formatWalletMoney(
                                            wallet.expenses,
                                            wallet.currency,
                                            intlLocale(locale)
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
