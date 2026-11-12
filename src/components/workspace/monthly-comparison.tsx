"use client"

import { useId, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    type ChartConfig,
} from "@/components/ui/chart"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { monthlyTrendSeries, trendEndMonth } from "@/lib/monthly-trends"
import { appendCurrencySymbol, currencyLabel } from "@/lib/currency"
import { formatWalletMoney } from "@/lib/wallet-input"

const config = {
    income: { label: "Income", color: "var(--income)" },
    expense: { label: "Expenses", color: "var(--expense)" },
} satisfies ChartConfig
const monthLabel = (month: string, short = false) =>
    new Intl.DateTimeFormat("en", {
        month: short ? "short" : "long",
        ...(short ? {} : { year: "numeric" as const }),
        timeZone: "UTC",
    }).format(new Date(`${month}-01T00:00:00Z`))

export function MonthlyComparison({
    accountId,
    today,
}: {
    accountId: string
    today: string
}) {
    const id = useId()
    const [currency, setCurrency] = useState("")
    const [mode, setMode] = useState<"actual" | "smoothed">("smoothed")
    const requestedEnd = trendEndMonth("rolling", today)
    const result = useWorkspaceQuery("monthlyTrends", accountId, {
        month: requestedEnd,
    })
    const reference = useWorkspaceQuery("reference", accountId)
    const currencies = [
        ...new Set([
            ...(reference.data?.wallets.map((wallet) => wallet.currency) ?? []),
            ...(result.data?.buckets.map((bucket) => bucket.currency) ?? []),
        ]),
    ]
    const preferred = reference.data?.account.reportingCurrency ?? ""
    const activeCurrency = currencies.includes(currency)
        ? currency
        : currencies.includes(preferred)
          ? preferred
          : currencies[0]
    const endMonth = result.data?.endMonth ?? requestedEnd
    const series = (type: "INCOME" | "EXPENSE") =>
        monthlyTrendSeries(
            result.data?.buckets ?? [],
            endMonth,
            type,
            activeCurrency ?? "",
            mode,
            null,
            result.data?.startMonth
        )
    const income = series("INCOME")
    const expense = series("EXPENSE")
    const points = income.points.map((point, index) => ({
        month: point.month,
        incomeAmount: point.amount,
        expenseAmount: expense.points[index].amount,
        income: Number(point.amount),
        expense: Number(expense.points[index].amount),
    }))
    const range = `${monthLabel(points[0]?.month ?? endMonth)} – ${monthLabel(endMonth)}`
    return (
        <Card role="region" aria-labelledby={id}>
            <CardHeader>
                <CardTitle>
                    <h2 id={id}>Monthly trends L12M</h2>
                </CardTitle>
                <CardDescription>
                    {range} · Last 12 completed months
                </CardDescription>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <Tabs
                        value={mode}
                        onValueChange={(value) => setMode(value as typeof mode)}
                    >
                        <TabsList
                            aria-label="Expense calculation"
                            className="h-11"
                        >
                            <TabsTrigger value="smoothed" className="min-h-10">
                                Smoothed
                            </TabsTrigger>
                            <TabsTrigger value="actual" className="min-h-10">
                                Actual
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {currencies.length > 1 && (
                        <Field className="w-32">
                            <FieldLabel htmlFor={`${id}-currency`}>
                                Currency
                            </FieldLabel>
                            <NativeSelect
                                id={`${id}-currency`}
                                value={activeCurrency}
                                onChange={(event) =>
                                    setCurrency(event.target.value)
                                }
                            >
                                {currencies.map((item) => (
                                    <option key={item} value={item}>
                                        {currencyLabel(item)}
                                    </option>
                                ))}
                            </NativeSelect>
                        </Field>
                    )}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                    Income uses the month received.{" "}
                    {mode === "actual"
                        ? "Expenses use the month paid."
                        : "Spread expenses are allocated across their assigned months; other expenses use the payment month."}
                </p>
                {!result.data || !reference.data ? (
                    <WorkspaceQueryState
                        queries={[result, reference]}
                        label="Loading monthly trends…"
                    />
                ) : !activeCurrency ? (
                    <p className="text-sm text-muted-foreground">
                        Add a wallet and posted transactions to see your monthly
                        trends.
                    </p>
                ) : (
                    <>
                        <div
                            className="grid grid-cols-1 gap-4 rounded-xl bg-muted/40 p-4 sm:grid-cols-2"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            {(
                                [
                                    ["income", income.total, income.average],
                                    ["expense", expense.total, expense.average],
                                ] as const
                            ).map(([flow, total, average]) => (
                                <div key={flow}>
                                    <p className="text-xs text-muted-foreground">
                                        {flow === "income"
                                            ? "Income"
                                            : `Expenses · ${mode === "actual" ? "Actual" : "Smoothed"}`}
                                    </p>
                                    <p
                                        data-flow={flow}
                                        className="mt-1 text-xl font-semibold wrap-break-word tabular-nums"
                                    >
                                        {formatWalletMoney(
                                            total,
                                            activeCurrency
                                        )}
                                    </p>
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        Monthly average · {points.length} months
                                    </p>
                                    <p
                                        data-flow={flow}
                                        className="mt-1 font-medium wrap-break-word tabular-nums"
                                    >
                                        {formatWalletMoney(
                                            average,
                                            activeCurrency
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>
                        {!points.some(
                            (point) => point.income || point.expense
                        ) && (
                            <p
                                role="status"
                                className="text-sm text-muted-foreground"
                            >
                                No posted income or expenses in these 12 months.
                            </p>
                        )}
                        <ChartContainer
                            config={config}
                            role="group"
                            aria-label={`Income and expenses by month in ${currencyLabel(activeCurrency)}, ${range}`}
                            className="aspect-auto h-72 w-full min-w-0"
                        >
                            <BarChart
                                accessibilityLayer
                                data={points}
                                margin={{
                                    top: 12,
                                    right: 4,
                                    bottom: 0,
                                    left: 0,
                                }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    minTickGap={8}
                                    tickFormatter={(value) =>
                                        monthLabel(String(value), true)
                                    }
                                />
                                <YAxis
                                    width={55}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) =>
                                        appendCurrencySymbol(
                                            new Intl.NumberFormat("en", {
                                                notation: "compact",
                                                maximumFractionDigits: 1,
                                            }).format(Number(value)),
                                            activeCurrency
                                        )
                                    }
                                />
                                <ChartTooltip
                                    cursor={{ fill: "var(--muted)" }}
                                    content={({ active, payload }) => {
                                        const point = payload?.[0]?.payload as
                                            (typeof points)[number] | undefined
                                        return active && point ? (
                                            <div className="grid gap-1 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                                                <span>
                                                    {monthLabel(point.month)}
                                                </span>
                                                <strong data-flow="income">
                                                    Income:{" "}
                                                    {formatWalletMoney(
                                                        point.incomeAmount,
                                                        activeCurrency
                                                    )}
                                                </strong>
                                                <strong data-flow="expense">
                                                    Expenses:{" "}
                                                    {formatWalletMoney(
                                                        point.expenseAmount,
                                                        activeCurrency
                                                    )}
                                                </strong>
                                            </div>
                                        ) : null
                                    }}
                                />
                                <Bar
                                    dataKey="income"
                                    name="Income"
                                    fill="var(--color-income)"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={28}
                                    isAnimationActive={false}
                                />
                                <Bar
                                    dataKey="expense"
                                    name="Expenses"
                                    fill="var(--color-expense)"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={28}
                                    isAnimationActive={false}
                                />
                            </BarChart>
                        </ChartContainer>
                        <div className="flex justify-center gap-5 text-xs">
                            <span data-flow="income">● Income</span>
                            <span data-flow="expense">● Expenses</span>
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                            Posted entries only. Pending entries, transfers,
                            opening balances and adjustments are excluded.
                            Currencies are shown separately.
                        </p>
                        <details className="rounded-xl border">
                            <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-medium">
                                View monthly amounts
                            </summary>
                            <table className="w-full border-t text-xs">
                                <caption className="sr-only">
                                    Monthly income and expenses in{" "}
                                    {currencyLabel(activeCurrency)}
                                </caption>
                                <thead>
                                    <tr>
                                        <th
                                            scope="col"
                                            className="px-3 py-2 text-left"
                                        >
                                            Month
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-2 text-right"
                                        >
                                            Income
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-2 text-right"
                                        >
                                            Expenses
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {points.map((point) => (
                                        <tr
                                            key={point.month}
                                            className="border-t"
                                        >
                                            <th
                                                scope="row"
                                                className="px-3 py-2 text-left font-normal"
                                            >
                                                {monthLabel(point.month)}
                                            </th>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {formatWalletMoney(
                                                    point.incomeAmount,
                                                    activeCurrency
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {formatWalletMoney(
                                                    point.expenseAmount,
                                                    activeCurrency
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </details>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
