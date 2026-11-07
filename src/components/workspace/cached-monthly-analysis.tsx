"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { intlLocale } from "@/lib/i18n/config"

import { useTranslations } from "@/components/i18n/locale-provider"

import { currencySymbol, currencyLabel } from "@/lib/currency"
import { useWorkspaceQuery, useWorkspaceDay } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import Link from "@/components/i18n/link"
import { RecurringSync } from "@/components/financial-accounts/recurring-sync"
import { moneyCents, centsMoney, shiftMonth } from "@/lib/expense-spread"
import { formatWalletMoney } from "@/lib/wallet-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Field, FieldLabel } from "@/components/ui/field"
import { PeriodControls } from "@/components/workspace/period-controls"
import { periodForMonth } from "@/lib/account-period"
import type { SelectHTMLAttributes } from "react"
function NativeSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className="h-9 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
        />
    )
}
const NativeSelectOption = "option"

export function CachedMonthlyAnalysis({
    accountId: id,
    query,
}: {
    accountId: string
    query: Record<string, string | string[] | undefined>
}) {
    const locale = useLocale()

    const t = useTranslations()

    const result = useWorkspaceQuery("analysis", id, query)
    const today = useWorkspaceDay()
    if (!result.data || !today)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label={t("Loading monthly analysis…")}
            />
        )
    const {
        account,
        wallets,
        month,
        mode,
        currency,
        wallet,
        current,
        previous,
    } = result.data
    const base = `/dashboard/accounts/${id}/analysis`
    const money = (amount: string) =>
        formatWalletMoney(amount, currency, intlLocale(locale))
    const delta = centsMoney(
        moneyCents(current.total) - moneyCents(previous.total)
    )
    const future = month > today.slice(0, 7)
    return (
        <>
            <RecurringSync accountId={id} />
            <Link
                href={`/dashboard/accounts/${id}`}
                className="text-sm underline underline-offset-4"
            >
                {t("Back to")} {account.name}
            </Link>
            <PeriodControls
                period={periodForMonth(month)}
                basePath={base}
                monthlyOnly
                query={{ mode, currency, ...(wallet ? { wallet } : {}) }}
            />
            <form
                key={`${month}:${mode}:${currency}:${wallet}`}
                action={base}
                className="flex flex-col gap-4 rounded-xl border p-4"
            >
                <input type="hidden" name="month" value={month} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                        <FieldLabel htmlFor="analysis-mode">
                            {t("View")}
                        </FieldLabel>
                        <NativeSelect
                            id="analysis-mode"
                            name="mode"
                            defaultValue={mode}
                        >
                            <NativeSelectOption value="smoothed">
                                {t("Smoothed spending")}
                            </NativeSelectOption>
                            <NativeSelectOption value="actual">
                                {t("Actual payments")}
                            </NativeSelectOption>
                        </NativeSelect>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="analysis-currency">
                            {t("Currency")}
                        </FieldLabel>
                        <NativeSelect
                            id="analysis-currency"
                            name="currency"
                            defaultValue={currency}
                        >
                            {["EUR", "GBP", "USD"].map((code) => (
                                <NativeSelectOption key={code} value={code}>
                                    {t(currencyLabel(code))}
                                </NativeSelectOption>
                            ))}
                        </NativeSelect>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="analysis-wallet">
                            {t("Wallet")}
                        </FieldLabel>
                        <NativeSelect
                            id="analysis-wallet"
                            name="wallet"
                            defaultValue={wallet}
                        >
                            <NativeSelectOption value="">
                                {t("All wallets")}
                            </NativeSelectOption>
                            {wallets.map((item) => (
                                <NativeSelectOption
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.name} ({currencySymbol(item.currency)}
                                    )
                                </NativeSelectOption>
                            ))}
                        </NativeSelect>
                    </Field>
                </div>
                <p className="text-xs text-muted-foreground">
                    {t(
                        "Currencies are reported separately. Only posted expenses are included; pending transactions are excluded."
                    )}
                </p>
                <Button type="submit">{t("Apply filters")}</Button>
            </form>
            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {mode === "smoothed"
                                ? t("Smoothed spending")
                                : t("Actual payments")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p
                            data-flow="expense"
                            className="text-2xl font-semibold tabular-nums"
                        >
                            {money(current.total)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {future
                                ? t("Future costs are shown as planned.")
                                : t(
                                      "{value0} compared with {value1} ({value2}).",
                                      {
                                          value0: money(delta),
                                          value1: shiftMonth(month, -1),
                                          value2: money(previous.total),
                                      }
                                  )}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>{t("Planned costs")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p
                            data-flow="expense"
                            className="text-2xl font-semibold tabular-nums"
                        >
                            {money(current.planned)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {t(
                                "Future allocations and future-dated payments are excluded from spending totals."
                            )}
                        </p>
                    </CardContent>
                </Card>
            </div>
            <section
                className="flex flex-col gap-3"
                aria-labelledby="analysis-categories"
            >
                <h2 id="analysis-categories" className="text-lg font-semibold">
                    {t("Spending by category")}
                </h2>
                {current.categories.length ? (
                    <ul className="divide-y rounded-lg border">
                        {current.categories.map((category) => (
                            <li
                                key={category.name}
                                className="flex justify-between gap-4 p-4"
                            >
                                <span className="min-w-0 wrap-break-word">
                                    {category.name}
                                </span>
                                <span className="shrink-0 tabular-nums">
                                    {money(category.amount)}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {t("No spending for this month and these filters.")}
                    </p>
                )}
            </section>
            <section
                className="flex flex-col gap-3"
                aria-labelledby="analysis-expenses"
            >
                <h2 id="analysis-expenses" className="text-lg font-semibold">
                    {t("Expenses included")}
                </h2>
                {current.rows.length ? (
                    <ul className="divide-y rounded-lg border">
                        {current.rows.map((row) => (
                            <li
                                key={row.id}
                                className="flex flex-wrap justify-between gap-3 p-4"
                            >
                                <div className="flex min-w-0 flex-col gap-1">
                                    <Link
                                        href={`/dashboard/accounts/${id}/transactions/${row.id}/edit`}
                                        className="font-medium wrap-break-word underline underline-offset-4"
                                    >
                                        {row.name}
                                    </Link>
                                    <p className="text-xs text-muted-foreground">
                                        {t("Payment date:")} {row.date} ·{" "}
                                        {row.walletName} · {row.category}
                                    </p>
                                    {row.allocated && (
                                        <Badge variant="secondary">
                                            {t("Spread across")}{" "}
                                            {row.spread!.monthCount}{" "}
                                            {t("months")}
                                        </Badge>
                                    )}
                                    {row.planned && (
                                        <Badge variant="outline">
                                            {t("Planned")}
                                        </Badge>
                                    )}
                                </div>
                                <p className="tabular-nums">
                                    {money(row.share)}
                                    {row.allocated && (
                                        <span className="text-sm text-muted-foreground">
                                            {" "}
                                            {t("of")} {money(row.amount)}
                                        </span>
                                    )}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {t("No expenses or allocations for this month.")}
                    </p>
                )}
            </section>
        </>
    )
}
