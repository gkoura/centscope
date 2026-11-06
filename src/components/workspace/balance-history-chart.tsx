"use client"

import { appendCurrencySymbol, currencySymbol } from "@/lib/currency"

import { useState } from "react"
import {
    CartesianGrid,
    Line,
    LineChart,
    XAxis,
    YAxis,
    ReferenceLine,
} from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    type ChartConfig,
} from "@/components/ui/chart"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BalanceHistoryHelp } from "./balance-history-help"
import { formatWalletMoney } from "@/lib/wallet-input"
import type { smoothedBalanceHistory } from "@/lib/smoothed-balance"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card"

const config = {
    balance: { label: "Smoothed balance", color: "var(--primary)" },
} satisfies ChartConfig
const monthLabel = (month: string, short = false) =>
    new Intl.DateTimeFormat("en", {
        month: short ? "short" : "long",
        ...(short ? {} : { year: "numeric" }),
        timeZone: "UTC",
    }).format(new Date(`${month}-01T00:00:00Z`))
export function BalanceHistoryChart({
    series,
    defaultCurrency,
    today,
}: {
    series: ReturnType<typeof smoothedBalanceHistory>
    defaultCurrency: string
    today: string
}) {
    const [currency, setCurrency] = useState(defaultCurrency)
    const current =
        series.find((item) => item.currency === currency) ?? series[0]
    if (!current) return null
    const points = current.points.map((point) => ({
        ...point,
        value: Number(point.balance),
    }))
    const last = points[points.length - 1]
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-1">
                    <h2>Balance over time</h2>
                    <BalanceHistoryHelp />
                </CardTitle>
                <CardDescription>
                    Smoothed end-of-month balance ·{" "}
                    {monthLabel(points[0].month)} – {monthLabel(last.month)}
                </CardDescription>
                {series.length > 1 && (
                    <Tabs value={current.currency} onValueChange={setCurrency}>
                        <TabsList aria-label="Chart currency">
                            {series.map((item) => (
                                <TabsTrigger
                                    key={item.currency}
                                    value={item.currency}
                                >
                                    {currencySymbol(item.currency)}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                )}
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-4">
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                    {formatWalletMoney(last.balance, current.currency)}
                    <span className="mt-1 block text-xs font-normal tracking-normal text-muted-foreground">
                        {monthLabel(last.month)}
                        {last.month >= today.slice(0, 7)
                            ? " · recorded entries so far"
                            : ""}
                    </span>
                </p>
                <ChartContainer
                    config={config}
                    role="group"
                    aria-label={`Smoothed monthly balances in ${currencySymbol(current.currency)}`}
                    className="aspect-auto h-64 w-full min-w-0 [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-offset-2 [&_.recharts-surface:focus-visible]:outline-ring"
                >
                    <LineChart
                        accessibilityLayer
                        data={points}
                        margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            minTickGap={28}
                            tickMargin={10}
                            tickFormatter={(value) =>
                                monthLabel(String(value), true)
                            }
                        />
                        <YAxis
                            width={60}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) =>
                                appendCurrencySymbol(
                                    new Intl.NumberFormat("en", {
                                        notation: "compact",
                                        maximumFractionDigits: 1,
                                    }).format(Number(value)),
                                    current.currency
                                )
                            }
                        />
                        <ReferenceLine y={0} stroke="var(--border)" />
                        <ChartTooltip
                            content={({ active, payload }) => {
                                const point = payload?.[0]?.payload as
                                    (typeof points)[number] | undefined
                                return active && point ? (
                                    <div className="grid gap-1 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                                        <span className="text-muted-foreground">
                                            {monthLabel(point.month)}
                                        </span>
                                        <strong className="font-medium tabular-nums">
                                            {formatWalletMoney(
                                                point.balance,
                                                current.currency
                                            )}
                                        </strong>
                                        {point.month >= today.slice(0, 7) && (
                                            <span className="text-muted-foreground">
                                                Recorded entries so far
                                            </span>
                                        )}
                                    </div>
                                ) : null
                            }}
                        />
                        <Line
                            type="linear"
                            dataKey="value"
                            name="Smoothed balance"
                            stroke="var(--color-balance)"
                            strokeWidth={2}
                            dot={{
                                r: 3,
                                fill: "var(--color-balance)",
                                strokeWidth: 0,
                            }}
                            activeDot={{ r: 5 }}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ChartContainer>
                <p className="text-xs leading-5 text-muted-foreground">
                    Posted entries only. Spread expenses are allocated across
                    their assigned months; this doesn’t change your cash
                    balance. Current and future months may be incomplete.
                </p>
                <details className="rounded-xl border">
                    <summary className="cursor-pointer px-4 py-3 text-xs font-medium">
                        View monthly amounts ·{" "}
                        {currencySymbol(current.currency)}
                    </summary>
                    <table className="w-full border-t text-sm">
                        <caption className="sr-only">
                            Smoothed end-of-month balances in{" "}
                            {currencySymbol(current.currency)}
                        </caption>
                        <thead>
                            <tr>
                                <th
                                    scope="col"
                                    className="px-4 py-2 text-left font-medium"
                                >
                                    Month
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2 text-right font-medium"
                                >
                                    Balance
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {points.map((point) => (
                                <tr key={point.month} className="border-t">
                                    <th
                                        scope="row"
                                        className="px-4 py-2 text-left text-xs font-normal"
                                    >
                                        {monthLabel(point.month)}
                                    </th>
                                    <td className="px-4 py-2 text-right text-xs tabular-nums">
                                        {formatWalletMoney(
                                            point.balance,
                                            current.currency
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </details>
            </CardContent>
        </Card>
    )
}
