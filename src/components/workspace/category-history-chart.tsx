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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import {
    AnalyticsChartControls,
    analyticsMonthLabel as monthLabel,
    analyticsTick,
    chartCurrency,
} from "./analytics-chart-controls"
import { categorySpending } from "@/lib/analytics-charts"
import { trendEndMonth } from "@/lib/monthly-trends"
import { formatWalletMoney } from "@/lib/wallet-input"
import { currencyLabel } from "@/lib/currency"
import type { BudgetMode } from "@/lib/budget-contribution"

export function CategoryHistoryChart({
    accountId,
    today,
}: {
    accountId: string
    today: string
}) {
    const id = useId()
    const [mode, setMode] = useState<BudgetMode>("smoothed")
    const [currency, setCurrency] = useState("")
    const [selection, setSelection] = useState<{
        month: string
        key: string
    } | null>(null)
    const end = trendEndMonth("rolling", today)
    const result = useWorkspaceQuery("monthlyTrends", accountId, { month: end })
    const reference = useWorkspaceQuery("reference", accountId)
    const currencies = [
        ...new Set([
            ...(reference.data?.wallets.map((w) => w.currency) ?? []),
            ...(result.data?.buckets.map((b) => b.currency) ?? []),
        ]),
    ]
    const activeCurrency = chartCurrency(
        currencies,
        currency,
        reference.data?.account.reportingCurrency ?? ""
    )
    const data = categorySpending(
        result.data?.buckets ?? [],
        result.data?.categories ?? [],
        result.data?.endMonth ?? end,
        activeCurrency,
        mode
    )
    const groups = data.groups.filter((group) =>
        data.points.some((point) => Number(point.amounts[group.key]) !== 0)
    )
    const config = Object.fromEntries(
        groups.map((group) => [
            group.key,
            { label: group.name, color: group.color },
        ])
    ) satisfies ChartConfig
    const point = data.points.find((p) => p.month === selection?.month)
    const group = data.groups.find((g) => g.key === selection?.key)
    const money = (amount: string) => formatWalletMoney(amount, activeCurrency)
    return (
        <Card role="region" aria-labelledby={id}>
            <CardHeader>
                <CardTitle>
                    <h2 id={id}>Spending by category L12M</h2>
                </CardTitle>
                <CardDescription>
                    {monthLabel(data.points[0].month)} – {monthLabel(end)} ·
                    Last 12 completed months
                </CardDescription>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-5">
                <AnalyticsChartControls
                    id={id}
                    mode={mode}
                    onMode={setMode}
                    currencies={currencies}
                    currency={activeCurrency}
                    onCurrency={setCurrency}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                    Posted expenses only.{" "}
                    {mode === "smoothed"
                        ? "Spread expenses use their assigned months."
                        : "Expenses use the month paid."}{" "}
                    Click a segment, or an amount in the table, to inspect its
                    subcategories. Currencies are shown separately.
                </p>
                {!result.data || !reference.data ? (
                    <WorkspaceQueryState
                        queries={[result, reference]}
                        label="Loading category spending…"
                    />
                ) : !groups.length ? (
                    <p
                        role="status"
                        className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
                    >
                        No posted expenses in this currency during these 12
                        months.
                    </p>
                ) : (
                    <>
                        <ChartContainer
                            config={config}
                            role="group"
                            aria-label={`Monthly spending by category in ${currencyLabel(activeCurrency)}`}
                            className="aspect-auto h-72 w-full min-w-0"
                        >
                            <BarChart
                                accessibilityLayer
                                data={data.points}
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
                                        analyticsTick(
                                            Number(value),
                                            activeCurrency
                                        )
                                    }
                                />
                                <ChartTooltip
                                    cursor={{ fill: "var(--muted)" }}
                                    content={({ active, payload }) => {
                                        const p = payload?.[0]?.payload as
                                            | (typeof data.points)[number]
                                            | undefined
                                        return active && p ? (
                                            <div className="grid max-h-72 max-w-72 gap-1 overflow-auto rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                                                <strong>
                                                    {monthLabel(p.month)} ·
                                                    Total {money(p.total)}
                                                </strong>
                                                {groups.map((g) => (
                                                    <div
                                                        key={g.key}
                                                        className="flex justify-between gap-3"
                                                    >
                                                        <span>{g.name}</span>
                                                        <span className="tabular-nums">
                                                            {money(
                                                                p.amounts[g.key]
                                                            )}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null
                                    }}
                                />
                                {groups.map((g) => (
                                    <Bar
                                        key={g.key}
                                        dataKey={g.key}
                                        name={g.name}
                                        stackId="expenses"
                                        fill={`var(--color-${g.key})`}
                                        maxBarSize={36}
                                        isAnimationActive={false}
                                        className="cursor-pointer"
                                        onClick={(entry) => {
                                            const month = (
                                                entry.payload as
                                                    | { month?: unknown }
                                                    | undefined
                                            )?.month
                                            if (typeof month === "string")
                                                setSelection({
                                                    month,
                                                    key: g.key,
                                                })
                                        }}
                                    />
                                ))}
                            </BarChart>
                        </ChartContainer>
                        <div className="flex flex-wrap justify-center gap-3 text-xs">
                            {groups.map((g) => (
                                <span
                                    key={g.key}
                                    className="flex items-center gap-1"
                                >
                                    <span
                                        className="size-2 rounded-full"
                                        style={{ background: g.color }}
                                    />
                                    {g.name}
                                </span>
                            ))}
                        </div>
                        <details className="min-w-0 rounded-xl border">
                            <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-medium">
                                View monthly category amounts
                            </summary>
                            <div className="overflow-x-auto">
                                <table className="w-full border-t text-xs">
                                    <caption className="sr-only">
                                        Monthly category spending in{" "}
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
                                            {groups.map((g) => (
                                                <th
                                                    scope="col"
                                                    key={g.key}
                                                    className="px-3 py-2 text-right"
                                                >
                                                    {g.name}
                                                </th>
                                            ))}
                                            <th
                                                scope="col"
                                                className="px-3 py-2 text-right"
                                            >
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.points.map((p) => (
                                            <tr
                                                key={p.month}
                                                className="border-t"
                                            >
                                                <th
                                                    scope="row"
                                                    className="px-3 py-2 text-left font-normal whitespace-nowrap"
                                                >
                                                    {monthLabel(p.month)}
                                                </th>
                                                {groups.map((g) => (
                                                    <td
                                                        key={g.key}
                                                        className="px-3 py-2 text-right"
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            aria-label={`${g.name}, ${monthLabel(p.month)}: ${money(p.amounts[g.key])}, inspect subcategories`}
                                                            onClick={() =>
                                                                setSelection({
                                                                    month: p.month,
                                                                    key: g.key,
                                                                })
                                                            }
                                                        >
                                                            {money(
                                                                p.amounts[g.key]
                                                            )}
                                                        </Button>
                                                    </td>
                                                ))}
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {money(p.total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    </>
                )}
                <Dialog
                    open={!!selection}
                    onOpenChange={(open) => {
                        if (!open) setSelection(null)
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {group?.name} ·{" "}
                                {selection ? monthLabel(selection.month) : ""}
                            </DialogTitle>
                            <DialogDescription>
                                {mode === "smoothed" ? "Smoothed" : "Actual"}{" "}
                                subcategory spending ·{" "}
                                {currencyLabel(activeCurrency)}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
                            {point && group && (
                                <>
                                    <strong>
                                        Total {money(point.amounts[group.key])}
                                    </strong>
                                    {point.breakdown[group.key].length ? (
                                        point.breakdown[group.key].map(
                                            (child) => (
                                                <div
                                                    key={child.id}
                                                    className="flex justify-between gap-4 text-sm"
                                                >
                                                    <span className="min-w-0 break-words">
                                                        {child.name}
                                                    </span>
                                                    <span className="shrink-0 tabular-nums">
                                                        {money(child.amount)}
                                                    </span>
                                                </div>
                                            )
                                        )
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No spending in this category for
                                            this month.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    )
}
