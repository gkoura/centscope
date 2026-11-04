import Link from "next/link"
import { RecurringSync } from "@/components/financial-accounts/recurring-sync"
import { notFound } from "next/navigation"
import { getOwnedFinancialAccount } from "@/lib/financial-accounts"
import { listOwnedAccountWallets } from "@/lib/wallets"
import { getOwnedMonthlyAnalysis } from "@/lib/monthly-analysis-data"
import {
    moneyCents,
    centsMoney,
    validMonth,
    shiftMonth,
} from "@/lib/expense-spread"
import { formatWalletMoney } from "@/lib/wallet-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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

export async function MonthlyAnalysisContent({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const { id } = await params
    const [account, wallets, query] = await Promise.all([
        getOwnedFinancialAccount(id),
        listOwnedAccountWallets(id),
        searchParams,
    ])
    if (!account) notFound()
    const value = (key: string) =>
        typeof query[key] === "string" ? (query[key] as string) : ""
    const requestedMonth = value("month")
    const month =
        validMonth(requestedMonth) &&
        requestedMonth >= "0002-01" &&
        requestedMonth <= "9998-12"
            ? requestedMonth
            : new Date().toISOString().slice(0, 7)
    const mode = value("mode") === "actual" ? "actual" : "smoothed"
    const currency = ["EUR", "GBP", "USD"].includes(value("currency"))
        ? value("currency")
        : account.reportingCurrency
    const wallet = wallets.some((item) => item.id === value("wallet"))
        ? value("wallet")
        : ""
    const { current, previous } = await getOwnedMonthlyAnalysis(
        id,
        month,
        mode,
        currency,
        wallet || undefined
    )
    const base = `/dashboard/accounts/${id}/analysis`
    const monthLink = (next: string) =>
        `${base}?${new URLSearchParams({ month: next, mode, currency, ...(wallet ? { wallet } : {}) })}`
    const money = (amount: string) => formatWalletMoney(amount, currency)
    const delta = centsMoney(
        moneyCents(current.total) - moneyCents(previous.total)
    )
    const future = month > new Date().toISOString().slice(0, 7)
    return (
        <>
            <RecurringSync accountId={id} />
            <Link
                href={`/dashboard/accounts/${id}`}
                className="text-sm underline underline-offset-4"
            >
                Back to {account.name}
            </Link>
            <form
                key={`${month}:${mode}:${currency}:${wallet}`}
                action={base}
                className="flex flex-col gap-4 rounded-xl border p-4"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                        <FieldLabel htmlFor="analysis-month">Month</FieldLabel>
                        <Input
                            id="analysis-month"
                            name="month"
                            type="month"
                            min="0002-01"
                            max="9998-12"
                            defaultValue={month}
                            required
                        />
                    </Field>
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
            <nav
                aria-label="Month navigation"
                className="flex items-center justify-between gap-3"
            >
                {month > "0002-01" ? (
                    <Link
                        href={monthLink(shiftMonth(month, -1))}
                        className="text-sm underline underline-offset-4"
                    >
                        Previous month
                    </Link>
                ) : (
                    <span />
                )}
                <span className="font-medium">{month}</span>
                {month < "9998-12" ? (
                    <Link
                        href={monthLink(shiftMonth(month, 1))}
                        className="text-sm underline underline-offset-4"
                    >
                        Next month
                    </Link>
                ) : (
                    <span />
                )}
            </nav>
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
                        <p className="text-2xl font-semibold tabular-nums">
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
                        <p className="text-2xl font-semibold tabular-nums">
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
                                <span className="min-w-0 break-words">
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
                                        className="font-medium break-words underline underline-offset-4"
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
