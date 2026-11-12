"use client"
import { NativeSelect } from "@/components/ui/native-select"

import { useId, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    ChartContainer,
    ChartTooltip,
    type ChartConfig,
} from "@/components/ui/chart"
import { Field, FieldLabel } from "@/components/ui/field"
import { MonthlyTrendFilters } from "./monthly-trend-filters"
import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import { monthlyTrendSeries, trendEndMonth } from "@/lib/monthly-trends"
import { appendCurrencySymbol, currencyLabel } from "@/lib/currency"
import { formatWalletMoney } from "@/lib/wallet-input"

const chartConfig = {
    income: { label: "Income", color: "var(--income)" },
    expense: { label: "Expenses", color: "var(--expense)" },
} satisfies ChartConfig
const monthLabel = (month: string, short = false, withYear = !short) =>
    new Intl.DateTimeFormat("en", {
        month: short ? "short" : "long",
        ...(withYear ? ({ year: short ? "2-digit" : "numeric" } as const) : {}),
        timeZone: "UTC",
    }).format(new Date(`${month}-01T00:00:00Z`))

export function MonthlyTrends({
    accountId,
    today,
}: {
    accountId: string
    today: string
}) {
    const headingId = useId()
    const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE")
    const [mode, setMode] = useState<"actual" | "smoothed">("smoothed")
    const [currency, setCurrency] = useState("")
    const [selections, setSelections] = useState<
        Record<"INCOME" | "EXPENSE", string[] | null>
    >({ INCOME: null, EXPENSE: null })
    const requestedEnd = trendEndMonth("rolling", today)
    const result = useWorkspaceQuery("monthlyTrends", accountId, {
        month: requestedEnd,
    })
    const reference = useWorkspaceQuery("reference", accountId)
    const endMonth = result.data?.endMonth ?? requestedEnd
    const startMonth = result.data?.startMonth

    const currencies = [
        ...new Set([
            ...(reference.data?.wallets.map((wallet) => wallet.currency) ?? []),
            ...(result.data?.buckets.map((bucket) => bucket.currency) ?? []),
        ]),
    ]
    const activeCurrency = currencies.includes(currency)
        ? currency
        : currencies.includes(reference.data?.account.reportingCurrency ?? "")
          ? reference.data!.account.reportingCurrency
          : currencies[0]
    const categories =
        result.data?.categories.filter((category) => category.type === type) ??
        []
    const data = monthlyTrendSeries(
        result.data?.buckets ?? [],
        endMonth,
        type,
        activeCurrency ?? "",
        mode,
        selections[type],
        startMonth
    )
    const points = data.points.map((point) => ({
        ...point,
        value: Number(point.amount),
    }))
    const label = type === "INCOME" ? "Income" : "Expenses"
    const flow = type === "INCOME" ? "income" : "expense"
    const rangeLabel = `${monthLabel(data.points[0]?.month ?? endMonth)} – ${monthLabel(endMonth)}`
    const hasAmount = points.some((point) => point.amount !== "0.00")
    const selectionCount = selections[type]?.length

    return (
        <Card role="region" aria-labelledby={headingId}>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                    <CardTitle>
                        <h2 id={headingId}>Monthly trends</h2>
                    </CardTitle>
                    <CardDescription>
                        {rangeLabel} · Last 12 months
                    </CardDescription>
                </div>
                <Tabs
                    value={type}
                    onValueChange={(value) => setType(value as typeof type)}
                >
                    <TabsList aria-label="Monthly trend type" className="h-11">
                        <TabsTrigger value="EXPENSE" className="min-h-10">
                            Expenses
                        </TabsTrigger>
                        <TabsTrigger value="INCOME" className="min-h-10">
                            Income
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-col gap-3 border-t pt-4">
                    <div className="flex flex-wrap items-end gap-3">
                        {type === "EXPENSE" && (
                            <Tabs
                                value={mode}
                                onValueChange={(value) =>
                                    setMode(value as typeof mode)
                                }
                            >
                                <TabsList
                                    aria-label="Expense calculation"
                                    className="h-11"
                                >
                                    <TabsTrigger
                                        value="smoothed"
                                        className="min-h-10"
                                    >
                                        Smoothed
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="actual"
                                        className="min-h-10"
                                    >
                                        Actual
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}
                        {result.data && reference.data && (
                            <div className="flex min-w-0 flex-wrap items-end gap-3 sm:ml-auto">
                                <MonthlyTrendFilters
                                    key={`${accountId}-${type}`}
                                    categories={categories}
                                    selected={selections[type]}
                                    onChange={(ids) =>
                                        setSelections((current) => ({
                                            ...current,
                                            [type]: ids,
                                        }))
                                    }
                                />
                                {currencies.length > 1 && (
                                    <Field className="w-32 shrink-0">
                                        <FieldLabel
                                            htmlFor={`${headingId}-currency`}
                                        >
                                            Currency
                                        </FieldLabel>
                                        <NativeSelect
                                            id={`${headingId}-currency`}
                                            className="w-full [&>select]:h-11"
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
                        )}
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                        {type === "INCOME"
                            ? "Posted income across 12 completed months."
                            : mode === "actual"
                              ? "Posted expenses in the month they were paid."
                              : "Spread expenses across their assigned months; other expenses use their payment month."}
                    </p>
                </div>
                {!result.data || !reference.data ? (
                    <WorkspaceQueryState
                        queries={[result, reference]}
                        label="Loading monthly trends…"
                    />
                ) : (
                    <>
                        {activeCurrency ? (
                            <>
                                <div
                                    aria-live="polite"
                                    aria-atomic="true"
                                    className="grid grid-cols-1 gap-4 rounded-xl bg-muted/40 p-4 min-[360px]:grid-cols-2"
                                >
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {label} ·{" "}
                                            {type === "INCOME" ||
                                            mode === "actual"
                                                ? "Actual"
                                                : "Smoothed"}
                                        </p>
                                        <p
                                            data-flow={flow}
                                            className="mt-1 text-xl font-semibold wrap-break-word tabular-nums"
                                        >
                                            {formatWalletMoney(
                                                data.total,
                                                activeCurrency
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Monthly average ·{" "}
                                            {data.points.length} months
                                        </p>
                                        <p className="mt-1 text-xl font-semibold wrap-break-word tabular-nums">
                                            {formatWalletMoney(
                                                data.average,
                                                activeCurrency
                                            )}
                                        </p>
                                    </div>
                                </div>
                                {!hasAmount && (
                                    <p
                                        role="status"
                                        className="rounded-lg border border-dashed p-4 text-sm leading-6 text-muted-foreground"
                                    >
                                        {selectionCount === 0
                                            ? "Select at least one category, or clear filters to include everything."
                                            : `No posted ${type === "INCOME" ? "income" : "expenses"} match these filters in this range. Try clearing the category filters.`}
                                    </p>
                                )}
                                <ChartContainer
                                    config={chartConfig}
                                    role="group"
                                    aria-label={`${label} by month in ${currencyLabel(activeCurrency)}, ${rangeLabel}, ${mode === "smoothed" && type === "EXPENSE" ? "smoothed" : "actual"}`}
                                    className="aspect-auto h-64 w-full min-w-0"
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
                                                monthLabel(
                                                    String(value),
                                                    true,
                                                    false
                                                )
                                            }
                                        />
                                        <YAxis
                                            width={55}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) =>
                                                appendCurrencySymbol(
                                                    new Intl.NumberFormat(
                                                        "en",
                                                        {
                                                            notation: "compact",
                                                            maximumFractionDigits: 1,
                                                        }
                                                    ).format(Number(value)),
                                                    activeCurrency
                                                )
                                            }
                                        />
                                        <ChartTooltip
                                            cursor={{ fill: "var(--muted)" }}
                                            content={({ active, payload }) => {
                                                const point = payload?.[0]
                                                    ?.payload as
                                                    | (typeof points)[number]
                                                    | undefined
                                                return active && point ? (
                                                    <div className="grid gap-1 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                                                        <span>
                                                            {monthLabel(
                                                                point.month
                                                            )}
                                                        </span>
                                                        <strong
                                                            data-flow={flow}
                                                        >
                                                            {formatWalletMoney(
                                                                point.amount,
                                                                activeCurrency
                                                            )}
                                                        </strong>
                                                        {point.month >=
                                                            today.slice(
                                                                0,
                                                                7
                                                            ) && (
                                                            <span className="text-muted-foreground">
                                                                Recorded entries
                                                                so far
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : null
                                            }}
                                        />
                                        <Bar
                                            dataKey="value"
                                            name={label}
                                            fill={`var(--color-${flow})`}
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={36}
                                            isAnimationActive={false}
                                        />
                                    </BarChart>
                                </ChartContainer>
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Pending entries, transfers, opening balances
                                    and adjustments are excluded. Current and
                                    future months contain recorded entries so
                                    far, not a forecast. Currencies are never
                                    combined.
                                </p>
                                <details className="rounded-xl border">
                                    <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-medium">
                                        View monthly amounts
                                    </summary>
                                    <table className="w-full border-t text-sm">
                                        <caption className="sr-only">
                                            {label} by month ·{" "}
                                            {currencyLabel(activeCurrency)}
                                        </caption>
                                        <thead>
                                            <tr>
                                                <th
                                                    scope="col"
                                                    className="px-4 py-2 text-left"
                                                >
                                                    Month
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-4 py-2 text-right"
                                                >
                                                    {label}
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
                                                        className="px-4 py-2 text-left text-xs font-normal"
                                                    >
                                                        {monthLabel(
                                                            point.month
                                                        )}
                                                        {point.month >=
                                                        today.slice(0, 7)
                                                            ? " · so far"
                                                            : ""}
                                                    </th>
                                                    <td className="px-4 py-2 text-right text-xs tabular-nums">
                                                        {formatWalletMoney(
                                                            point.amount,
                                                            activeCurrency
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </details>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Add a wallet and posted transactions to see your
                                monthly trends.
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
