"use client"
import { useId, useState } from "react"
import {
    Bar,
    ComposedChart,
    Line,
    ReferenceLine,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { NativeSelect } from "@/components/ui/native-select"
import { useWorkspaceQuery } from "./use-workspace-query"
import { WorkspaceQueryState } from "./workspace-query-state"
import {
    AnalyticsChartControls,
    analyticsMonthLabel as monthLabel,
    analyticsTick,
    chartCurrency,
} from "./analytics-chart-controls"
import { trendEndMonth, trendMonths } from "@/lib/monthly-trends"
import { formatWalletMoney } from "@/lib/wallet-input"
import { currencyLabel } from "@/lib/currency"
import { budgetCadenceLabels } from "@/lib/budget-period"
import { moneyCents, centsMoney, shiftMonth } from "@/lib/expense-spread"
import { BudgetTransactionsDialog } from "@/components/financial-accounts/budget-transactions-dialog"
import type { BudgetCadence } from "@/lib/budget-period"
import type { BudgetMode } from "@/lib/budget-contribution"

const config = {
    actual: { label: "Spending", color: "var(--expense)" },
    budgetValue: { label: "Budget", color: "var(--primary)" },
    average: { label: "Monthly average", color: "var(--income)" },
} satisfies ChartConfig
export function BudgetHistoryChart({
    accountId,
    today,
}: {
    accountId: string
    today: string
}) {
    const id = useId()
    const [mode, setMode] = useState<BudgetMode>("smoothed")
    const [currency, setCurrency] = useState("")
    const [budgetId, setBudgetId] = useState("")
    const [detail, setDetail] = useState<{
        budgetId: string
        cadence: BudgetCadence
        month: string
        mode: BudgetMode
    } | null>(null)
    const end = trendEndMonth("rolling", today)
    const currentMonth = today.slice(0, 7)
    const result = useWorkspaceQuery("budgetComparison", accountId, {
        month: end,
        mode,
        includeCurrent: "true",
    })
    const reference = useWorkspaceQuery("reference", accountId)
    const currencies = [
        ...new Set([
            ...(reference.data?.wallets.map((w) => w.currency) ?? []),
            ...(result.data?.map((p) => p.currency) ?? []),
        ]),
    ]
    const activeCurrency = chartCurrency(
        currencies,
        currency,
        reference.data?.account.reportingCurrency ?? ""
    )
    const plans =
        result.data?.filter((p) => p.currency === activeCurrency) ?? []
    const plan = plans.find((p) => p.id === budgetId) ?? plans[0]
    const budgetIndex = plans.findIndex((p) => p.id === plan?.id)
    const points = trendMonths(currentMonth, shiftMonth(end, -11)).map(
        (month) => {
            const point = plan?.points.find((p) => p.month === month)
            return {
                month,
                spent: point?.spent ?? null,
                budget: point?.budget ?? null,
                remaining: point?.remaining ?? null,
                actual: point ? Number(point.spent) : null,
                budgetValue: point ? Number(point.budget) : null,
            }
        }
    )
    const completedPoints = points.filter((point) => point.month <= end)
    const averageAmount = plan
        ? centsMoney(
              (completedPoints.reduce(
                  (sum, point) => sum + moneyCents(point.spent ?? "0.00"),
                  BigInt(0)
              ) +
                  BigInt(Math.floor(completedPoints.length / 2))) /
                  BigInt(completedPoints.length)
          )
        : null
    const averageOverBudget =
        averageAmount !== null &&
        points.some(
            (point) =>
                point.budget !== null &&
                moneyCents(averageAmount) > moneyCents(point.budget)
        )
    const money = (amount: string) => formatWalletMoney(amount, activeCurrency)
    const budgetAmounts = points
        .flatMap((point) => (point.budget === null ? [] : [point.budget]))
        .sort((a, b) =>
            moneyCents(a) < moneyCents(b)
                ? -1
                : moneyCents(a) > moneyCents(b)
                  ? 1
                  : 0
        )
    const budgetLabel = budgetAmounts.length
        ? budgetAmounts[0] === budgetAmounts[budgetAmounts.length - 1]
            ? money(budgetAmounts[0])
            : `${money(budgetAmounts[0])} – ${money(budgetAmounts[budgetAmounts.length - 1])}`
        : "Unavailable"
    const remaining = (amount: string) =>
        moneyCents(amount) < BigInt(0)
            ? `Overspent ${money(centsMoney(-moneyCents(amount)))}`
            : `Remaining ${money(amount)}`
    return (
        <Card role="region" aria-labelledby={id}>
            <CardHeader>
                <CardTitle>
                    <h2 id={id}>Budget vs Actual L12M</h2>
                </CardTitle>
                <CardDescription>
                    {monthLabel(points[0].month)} – {monthLabel(currentMonth)} ·
                    Last 12 completed months + current month
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
                {!result.data || !reference.data ? (
                    <WorkspaceQueryState
                        queries={[result, reference]}
                        label="Loading budget comparison…"
                    />
                ) : (
                    <>
                        {result.error && (
                            <div
                                role="alert"
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-sm"
                            >
                                <p>
                                    Couldn’t refresh budgets. Showing previously
                                    loaded values.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        void result.refetch()
                                    }}
                                >
                                    Retry
                                </Button>
                            </div>
                        )}
                        {plans.length > 0 && (
                            <Field className="min-w-0">
                                <FieldLabel htmlFor={id + "-budget"}>
                                    Budget
                                </FieldLabel>
                                <div className="flex min-w-0 items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="size-11"
                                        aria-label="Previous budget"
                                        title="Previous budget"
                                        disabled={budgetIndex <= 0}
                                        onClick={() => {
                                            const previous =
                                                plans[budgetIndex - 1]
                                            if (previous)
                                                setBudgetId(previous.id)
                                        }}
                                    >
                                        <ChevronLeft aria-hidden="true" />
                                    </Button>
                                    <NativeSelect
                                        id={id + "-budget"}
                                        value={plan?.id ?? ""}
                                        onChange={(e) =>
                                            setBudgetId(e.target.value)
                                        }
                                        className="min-w-0 flex-1 [&>select]:h-11"
                                    >
                                        {plans.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ·{" "}
                                                {
                                                    budgetCadenceLabels[
                                                        p.recurrence
                                                    ]
                                                }
                                            </option>
                                        ))}
                                    </NativeSelect>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="size-11"
                                        aria-label="Next budget"
                                        title="Next budget"
                                        disabled={
                                            budgetIndex < 0 ||
                                            budgetIndex >= plans.length - 1
                                        }
                                        onClick={() => {
                                            const next = plans[budgetIndex + 1]
                                            if (next) setBudgetId(next.id)
                                        }}
                                    >
                                        <ChevronRight aria-hidden="true" />
                                    </Button>
                                </div>
                                <p
                                    aria-live="polite"
                                    className="text-xs text-muted-foreground"
                                >
                                    Budget {budgetIndex + 1} of {plans.length}
                                </p>
                            </Field>
                        )}
                        {!plan ? (
                            <p
                                role="status"
                                className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
                            >
                                No applicable budget in this currency for these
                                months. Select another currency or create a
                                budget on the Budgets page. Missing budgets are
                                shown as unavailable, not zero.
                            </p>
                        ) : (
                            <>
                                {!points.some((p) => Number(p.spent)) && (
                                    <p
                                        role="status"
                                        className="text-sm text-muted-foreground"
                                    >
                                        No matching posted expenses in these 13
                                        months. The budget amounts are still
                                        shown.
                                    </p>
                                )}
                                <ChartContainer
                                    config={config}
                                    role="group"
                                    aria-label={`${plan.name}: monthly spending and budget in ${currencyLabel(activeCurrency)}`}
                                    className="aspect-auto h-72 w-full min-w-0"
                                >
                                    <ComposedChart
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
                                                    true
                                                ) +
                                                (value === currentMonth
                                                    ? "*"
                                                    : "")
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
                                                const p = payload?.[0]
                                                    ?.payload as
                                                    | (typeof points)[number]
                                                    | undefined
                                                return active && p ? (
                                                    <div className="grid max-w-72 gap-1 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                                                        <strong>
                                                            {monthLabel(
                                                                p.month
                                                            )}
                                                        </strong>
                                                        <span>
                                                            {plan.name} ·{" "}
                                                            {
                                                                budgetCadenceLabels[
                                                                    plan
                                                                        .recurrence
                                                                ]
                                                            }
                                                        </span>
                                                        {p.month ===
                                                            currentMonth && (
                                                            <span className="text-muted-foreground">
                                                                Current month ·
                                                                recorded so far
                                                            </span>
                                                        )}
                                                        {p.budget === null ||
                                                        p.spent === null ||
                                                        p.remaining === null ? (
                                                            <span>
                                                                No applicable
                                                                budget
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span>
                                                                    Spending (
                                                                    {mode}):{" "}
                                                                    {money(
                                                                        p.spent
                                                                    )}
                                                                </span>
                                                                <span>
                                                                    Budget:{" "}
                                                                    {money(
                                                                        p.budget
                                                                    )}
                                                                </span>
                                                                <strong>
                                                                    {remaining(
                                                                        p.remaining
                                                                    )}
                                                                </strong>
                                                                {averageAmount !==
                                                                    null && (
                                                                    <span>
                                                                        Monthly
                                                                        average:{" "}
                                                                        {money(
                                                                            averageAmount
                                                                        )}
                                                                    </span>
                                                                )}
                                                                {plan.recurrence !==
                                                                    "MONTHLY" && (
                                                                    <span className="text-muted-foreground">
                                                                        Monthly
                                                                        allocation
                                                                        of{" "}
                                                                        {money(
                                                                            plan.spendingLimit
                                                                        )}{" "}
                                                                        {budgetCadenceLabels[
                                                                            plan
                                                                                .recurrence
                                                                        ].toLowerCase()}{" "}
                                                                        limit
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                ) : null
                                            }}
                                        />
                                        <Bar
                                            dataKey="actual"
                                            name={`Spending (${mode})`}
                                            className="cursor-pointer"
                                            onClick={(entry) => {
                                                const month = (
                                                    entry.payload as
                                                        | { month?: unknown }
                                                        | undefined
                                                )?.month
                                                if (
                                                    plan &&
                                                    typeof month === "string"
                                                )
                                                    setDetail({
                                                        budgetId: plan.id,
                                                        cadence:
                                                            plan.recurrence,
                                                        month,
                                                        mode,
                                                    })
                                            }}
                                            fill="var(--color-actual)"
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={36}
                                            isAnimationActive={false}
                                        />
                                        <Line
                                            dataKey="budgetValue"
                                            name="Budget"
                                            type="linear"
                                            stroke="var(--color-budgetValue)"
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            connectNulls={false}
                                            isAnimationActive={false}
                                        />
                                        {averageAmount !== null && (
                                            <ReferenceLine
                                                y={Number(averageAmount)}
                                                stroke={
                                                    averageOverBudget
                                                        ? "var(--expense)"
                                                        : "var(--color-average)"
                                                }
                                                strokeWidth={2}
                                                strokeDasharray="6 4"
                                            />
                                        )}
                                    </ComposedChart>
                                </ChartContainer>
                                <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
                                    <span data-flow="expense">
                                        ● Spending ({mode})
                                    </span>
                                    <span>— Budget: {budgetLabel}</span>
                                    {averageAmount !== null && (
                                        <span
                                            data-flow={
                                                averageOverBudget
                                                    ? "expense"
                                                    : "income"
                                            }
                                        >
                                            ┄ Monthly average:{" "}
                                            {money(averageAmount)}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                        <details className="min-w-0 rounded-xl border">
                            <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-medium">
                                View monthly budget amounts
                            </summary>
                            <div className="overflow-x-auto">
                                <table className="w-full border-t text-xs">
                                    <caption className="sr-only">
                                        Monthly budget comparison in{" "}
                                        {currencyLabel(activeCurrency)}
                                    </caption>
                                    <thead>
                                        <tr>
                                            {[
                                                "Month",
                                                "Spending",
                                                "Budget",
                                                "Remaining / overspent",
                                            ].map((label) => (
                                                <th
                                                    scope="col"
                                                    key={label}
                                                    className="px-3 py-2 text-left"
                                                >
                                                    {label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {points.map((p) => (
                                            <tr
                                                key={p.month}
                                                className="border-t"
                                            >
                                                <th
                                                    scope="row"
                                                    className="px-3 py-2 text-left font-normal whitespace-nowrap"
                                                >
                                                    {monthLabel(p.month)}
                                                    {p.month === currentMonth
                                                        ? " · so far"
                                                        : ""}
                                                </th>
                                                {p.budget === null ||
                                                p.spent === null ||
                                                p.remaining === null ? (
                                                    <td
                                                        colSpan={3}
                                                        className="px-3 py-2 text-muted-foreground"
                                                    >
                                                        No applicable budget
                                                    </td>
                                                ) : (
                                                    <>
                                                        <td className="px-3 py-2 tabular-nums">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                aria-label={`View ${plan?.name ?? "budget"} transactions for ${monthLabel(p.month)}`}
                                                                onClick={() => {
                                                                    if (plan)
                                                                        setDetail(
                                                                            {
                                                                                budgetId:
                                                                                    plan.id,
                                                                                cadence:
                                                                                    plan.recurrence,
                                                                                month: p.month,
                                                                                mode,
                                                                            }
                                                                        )
                                                                }}
                                                            >
                                                                {money(p.spent)}
                                                            </Button>
                                                        </td>
                                                        <td className="px-3 py-2 tabular-nums">
                                                            {money(p.budget)}
                                                        </td>
                                                        <td className="px-3 py-2 tabular-nums">
                                                            {remaining(
                                                                p.remaining
                                                            )}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    </>
                )}
            </CardContent>
            {detail && (
                <BudgetTransactionsDialog
                    key={`${detail.budgetId}-${detail.month}-${detail.mode}`}
                    accountId={accountId}
                    budgetId={detail.budgetId}
                    cadence={detail.cadence}
                    date={`${detail.month}-01`}
                    mode={detail.mode}
                    scope="month"
                    onClose={() => setDetail(null)}
                />
            )}
        </Card>
    )
}
