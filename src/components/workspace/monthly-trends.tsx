"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { intlLocale } from "@/lib/i18n/config"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useId, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
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
import {
    monthlyTrendSeries,
    trendMonths,
    trendEndMonth,
} from "@/lib/monthly-trends"
import { appendCurrencySymbol, currencyLabel } from "@/lib/currency"
import { formatWalletMoney } from "@/lib/wallet-input"

const chartConfig = {
    income: { label: "Income", color: "var(--income)" },
    expense: { label: "Expenses", color: "var(--expense)" },
} satisfies ChartConfig

const selectClass =
    "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-ring"

export function MonthlyTrends({
    accountId,
    today,
}: {
    accountId: string
    today: string
}) {
    const locale = useLocale()
    const monthLabel = (month: string, short = false) =>
        new Intl.DateTimeFormat(intlLocale(locale), {
            month: short ? "short" : "long",
            ...(short ? {} : { year: "numeric" }),
            timeZone: "UTC",
        }).format(new Date(`${month}-01T00:00:00Z`))

    const t = useTranslations()

    const headingId = useId()
    const thisYear = Number(today.slice(0, 4))
    const [range, setRange] = useState("rolling")
    const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE")
    const [mode, setMode] = useState<"actual" | "smoothed">("actual")
    const [currency, setCurrency] = useState("")
    const [selections, setSelections] = useState<
        Record<"INCOME" | "EXPENSE", string[] | null>
    >({ INCOME: null, EXPENSE: null })
    const endMonth = trendEndMonth(range, today)
    const result = useWorkspaceQuery("monthlyTrends", accountId, {
        month: endMonth,
    })
    const reference = useWorkspaceQuery("reference", accountId)
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
        selections[type]
    )
    const points = data.points.map((point) => ({
        ...point,
        value: Number(point.amount),
    }))
    const years = [
        ...new Set([
            ...(range === "rolling" ? [] : [Number(range)]),
            ...Array.from({ length: 31 }, (_, index) => thisYear - index),
        ]),
    ].sort((a, b) => b - a)
    const label = type === "INCOME" ? t("Income") : t("Expenses")
    const flow = type === "INCOME" ? "income" : "expense"
    const rangeLabel = `${monthLabel(trendMonths(endMonth)[0])} – ${monthLabel(endMonth)}`
    const hasAmount = points.some((point) => point.amount !== "0.00")
    const selectionCount = selections[type]?.length

    return (
        <Card role="region" aria-labelledby={headingId}>
            <CardHeader>
                <CardTitle>
                    <h2 id={headingId}>{t("Monthly trends")}</h2>
                </CardTitle>
                <CardDescription>
                    {t(
                        "Compare income and expenses month by month. This section uses its own range, independent of the period above."
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <Tabs
                        value={type}
                        onValueChange={(value) => setType(value as typeof type)}
                    >
                        <TabsList
                            aria-label={t("Monthly trend type")}
                            className="h-11"
                        >
                            <TabsTrigger value="EXPENSE" className="min-h-10">
                                {t("Expenses")}
                            </TabsTrigger>
                            <TabsTrigger value="INCOME" className="min-h-10">
                                {t("Income")}
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex w-full items-end gap-2 sm:w-auto">
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-11"
                            aria-label={t("Previous trend year")}
                            disabled={
                                range !== "rolling" && Number(range) <= 1901
                            }
                            onClick={() =>
                                setRange(
                                    String(
                                        (range === "rolling"
                                            ? thisYear
                                            : Number(range)) - 1
                                    )
                                )
                            }
                        >
                            <ChevronLeft />
                        </Button>
                        <Field className="min-w-0 flex-1 sm:w-44">
                            <FieldLabel
                                htmlFor={`${headingId}-range`}
                                className="sr-only"
                            >
                                {t("Monthly trend range")}
                            </FieldLabel>
                            <select
                                id={`${headingId}-range`}
                                className={selectClass}
                                value={range}
                                onChange={(event) =>
                                    setRange(event.target.value)
                                }
                            >
                                <option value="rolling">
                                    {t("Last 12 months")}
                                </option>
                                {years.map((year) => (
                                    <option key={year} value={String(year)}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-11"
                            aria-label={t("Next trend year")}
                            disabled={
                                range === "rolling" || Number(range) >= thisYear
                            }
                            onClick={() => setRange(String(Number(range) + 1))}
                        >
                            <ChevronRight />
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    {rangeLabel} ·{" "}
                    {range === "rolling" ? t("12 completed months · ") : ""}
                    {t("Posted entries only")}
                </p>
                {type === "EXPENSE" && (
                    <div className="flex flex-col gap-2">
                        <Tabs
                            value={mode}
                            onValueChange={(value) =>
                                setMode(value as typeof mode)
                            }
                        >
                            <TabsList
                                aria-label={t("Expense calculation")}
                                className="h-11"
                            >
                                <TabsTrigger
                                    value="actual"
                                    className="min-h-10"
                                >
                                    {t("Actual")}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="smoothed"
                                    className="min-h-10"
                                >
                                    {t("Smoothed")}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <p className="text-xs leading-5 text-muted-foreground">
                            {mode === "actual"
                                ? t(
                                      "Expenses count in the month the payment was made."
                                  )
                                : t(
                                      "Spread expenses count across their assigned months; other expenses use their payment month."
                                  )}
                        </p>
                    </div>
                )}
                {!result.data || !reference.data ? (
                    <WorkspaceQueryState
                        queries={[result, reference]}
                        label={t("Loading monthly trends…")}
                    />
                ) : (
                    <>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                                <Field className="w-full shrink-0 sm:w-36">
                                    <FieldLabel
                                        htmlFor={`${headingId}-currency`}
                                    >
                                        {t("Currency")}
                                    </FieldLabel>
                                    <select
                                        id={`${headingId}-currency`}
                                        className={selectClass}
                                        value={activeCurrency}
                                        onChange={(event) =>
                                            setCurrency(event.target.value)
                                        }
                                    >
                                        {currencies.map((item) => (
                                            <option key={item} value={item}>
                                                {t(currencyLabel(item))}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            )}
                        </div>
                        {activeCurrency ? (
                            <>
                                <div
                                    aria-live="polite"
                                    aria-atomic="true"
                                    className="grid grid-cols-1 gap-4 rounded-xl bg-muted/40 p-4 min-[360px]:grid-cols-2"
                                >
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {t(label || "")} ·{" "}
                                            {type === "INCOME" ||
                                            mode === "actual"
                                                ? t("Actual")
                                                : t("Smoothed")}
                                        </p>
                                        <p
                                            data-flow={flow}
                                            className="mt-1 text-xl font-semibold wrap-break-word tabular-nums"
                                        >
                                            {formatWalletMoney(
                                                data.total,
                                                activeCurrency,
                                                intlLocale(locale)
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {t(
                                                "Monthly average · all 12 months"
                                            )}
                                        </p>
                                        <p className="mt-1 text-xl font-semibold wrap-break-word tabular-nums">
                                            {formatWalletMoney(
                                                data.average,
                                                activeCurrency,
                                                intlLocale(locale)
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
                                            ? t(
                                                  "Select at least one category, or clear filters to include everything."
                                              )
                                            : t(
                                                  "No posted {value0} match these filters in this range. Try another year or clear the category filters.",
                                                  {
                                                      value0:
                                                          type === "INCOME"
                                                              ? t("income")
                                                              : t("expenses"),
                                                  }
                                              )}
                                    </p>
                                )}
                                <ChartContainer
                                    config={{
                                        income: {
                                            ...chartConfig.income,
                                            label: t("Income"),
                                        },
                                        expense: {
                                            ...chartConfig.expense,
                                            label: t("Expenses"),
                                        },
                                    }}
                                    role="group"
                                    aria-label={t(
                                        "{value0} by month in {value1}, {value2}, {value3}",
                                        {
                                            value0: label,
                                            value1: t(
                                                currencyLabel(activeCurrency)
                                            ),
                                            value2: rangeLabel,
                                            value3:
                                                mode === "smoothed" &&
                                                type === "EXPENSE"
                                                    ? t("Smoothed")
                                                    : t("Actual"),
                                        }
                                    )}
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
                                                monthLabel(String(value), true)
                                            }
                                        />
                                        <YAxis
                                            width={55}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) =>
                                                appendCurrencySymbol(
                                                    new Intl.NumberFormat(
                                                        intlLocale(locale),
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
                                                                activeCurrency,
                                                                intlLocale(
                                                                    locale
                                                                )
                                                            )}
                                                        </strong>
                                                        {point.month >=
                                                            today.slice(
                                                                0,
                                                                7
                                                            ) && (
                                                            <span className="text-muted-foreground">
                                                                {t(
                                                                    "Recorded entries so far"
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : null
                                            }}
                                        />
                                        <Bar
                                            dataKey="value"
                                            name={t(label || "")}
                                            fill={`var(--color-${flow})`}
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={36}
                                            isAnimationActive={false}
                                        />
                                    </BarChart>
                                </ChartContainer>
                                <p className="text-xs leading-5 text-muted-foreground">
                                    {t(
                                        "Pending entries, transfers, opening balances and adjustments are excluded. Current and future months contain recorded entries so far, not a forecast. Currencies are never combined."
                                    )}
                                </p>
                                <details className="rounded-xl border">
                                    <summary className="min-h-11 cursor-pointer px-4 py-3 text-xs font-medium">
                                        {t("View monthly amounts")}
                                    </summary>
                                    <table className="w-full border-t text-sm">
                                        <caption className="sr-only">
                                            {t(label || "")} {t("by month ·")}{" "}
                                            {t(currencyLabel(activeCurrency))}
                                        </caption>
                                        <thead>
                                            <tr>
                                                <th
                                                    scope="col"
                                                    className="px-4 py-2 text-left"
                                                >
                                                    {t("Month")}
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-4 py-2 text-right"
                                                >
                                                    {t(label || "")}
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
                                                            ? t(" · so far")
                                                            : ""}
                                                    </th>
                                                    <td className="px-4 py-2 text-right text-xs tabular-nums">
                                                        {formatWalletMoney(
                                                            point.amount,
                                                            activeCurrency,
                                                            intlLocale(locale)
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
                                {t(
                                    "Add a wallet and posted transactions to see your monthly trends."
                                )}
                            </p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
