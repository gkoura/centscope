"use client"
import { useWorkspaceQuery, useWorkspaceDay } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import Link from "next/link"
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
    const result = useWorkspaceQuery("analysis", id, query)
    const today = useWorkspaceDay()
    if (!result.data || !today)
        return (
            <WorkspaceQueryState
                queries={[result]}
                label="Loading monthly analysis…"
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
    const money = (amount: string) => formatWalletMoney(amount, currency)
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
                Back to {account.name}
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
                        <FieldLabel htmlFor="analysis-mode">View</FieldLabel>
                        <NativeSelect
                            id="analysis-mode"
                            name="mode"
                            defaultValue={mode}
                        >
                            <NativeSelectOption value="smoothed">
                                Smoothed spending
                            </NativeSelectOption>
                            <NativeSelectOption value="actual">
                                Actual payments
                            </NativeSelectOption>
                        </NativeSelect>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="analysis-currency">
                            Currency
                        </FieldLabel>
                        <NativeSelect
                            id="analysis-currency"
                            name="currency"
                            defaultValue={currency}
                        >
                            {["EUR", "GBP", "USD"].map((code) => (
                                <NativeSelectOption key={code} value={code}>
                                    {code}
                                </NativeSelectOption>
                            ))}
                        </NativeSelect>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="analysis-wallet">
                            Wallet
                        </FieldLabel>
                        <NativeSelect
                            id="analysis-wallet"
                            name="wallet"
                            defaultValue={wallet}
                        >
                            <NativeSelectOption value="">
                                All wallets
                            </NativeSelectOption>
                            {wallets.map((item) => (
                                <NativeSelectOption
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.name} ({item.currency})
                                </NativeSelectOption>
                            ))}
                        </NativeSelect>
                    </Field>
                </div>
                <p className="text-xs text-muted-foreground">
                    Currencies are reported separately. Only posted expenses are
                    included; pending transactions are excluded.
                </p>
                <Button type="submit">Apply filters</Button>
            </form>
            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {mode === "smoothed"
                                ? "Smoothed spending"
                                : "Actual payments"}
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
                                ? "Future costs are shown as planned."
                                : `${money(delta)} compared with ${shiftMonth(month, -1)} (${money(previous.total)}).`}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Planned costs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p
                            data-flow="expense"
                            className="text-2xl font-semibold tabular-nums"
                        >
                            {money(current.planned)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Future allocations and future-dated payments are
                            excluded from spending totals.
                        </p>
                    </CardContent>
                </Card>
            </div>
            <section
                className="flex flex-col gap-3"
                aria-labelledby="analysis-categories"
            >
                <h2 id="analysis-categories" className="text-lg font-semibold">
                    Spending by category
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
                        No spending for this month and these filters.
                    </p>
                )}
            </section>
            <section
                className="flex flex-col gap-3"
                aria-labelledby="analysis-expenses"
            >
                <h2 id="analysis-expenses" className="text-lg font-semibold">
                    Expenses included
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
                                        Payment date: {row.date} ·{" "}
                                        {row.walletName} · {row.category}
                                    </p>
                                    {row.allocated && (
                                        <Badge variant="secondary">
                                            Spread across{" "}
                                            {row.spread!.monthCount} months
                                        </Badge>
                                    )}
                                    {row.planned && (
                                        <Badge variant="outline">Planned</Badge>
                                    )}
                                </div>
                                <p className="tabular-nums">
                                    {money(row.share)}
                                    {row.allocated && (
                                        <span className="text-sm text-muted-foreground">
                                            {" "}
                                            of {money(row.amount)}
                                        </span>
                                    )}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No expenses or allocations for this month.
                    </p>
                )}
            </section>
        </>
    )
}
