"use client"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import { appendCurrencySymbol, currencyLabel } from "@/lib/currency"
import type { BudgetMode } from "@/lib/budget-contribution"

export const analyticsMonthLabel = (month: string, short = false) =>
    new Intl.DateTimeFormat("en", {
        month: short ? "short" : "long",
        ...(short ? {} : { year: "numeric" as const }),
        timeZone: "UTC",
    }).format(new Date(month + "-01T00:00:00Z"))
export const analyticsTick = (value: number, currency: string) =>
    appendCurrencySymbol(
        new Intl.NumberFormat("en", {
            notation: "compact",
            maximumFractionDigits: 1,
        }).format(value),
        currency
    )
export function chartCurrency(
    currencies: string[],
    selected: string,
    preferred: string
) {
    return currencies.includes(selected)
        ? selected
        : currencies.includes(preferred)
          ? preferred
          : (currencies[0] ?? "")
}
export function AnalyticsChartControls({
    id,
    mode,
    onMode,
    currencies,
    currency,
    onCurrency,
}: {
    id: string
    mode: BudgetMode
    onMode: (value: BudgetMode) => void
    currencies: string[]
    currency: string
    onCurrency: (value: string) => void
}) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <Tabs
                value={mode}
                onValueChange={(value) => {
                    if (value === "smoothed" || value === "actual")
                        onMode(value)
                }}
            >
                <TabsList aria-label="Expense calculation" className="h-11">
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
                    <FieldLabel htmlFor={id + "-currency"}>Currency</FieldLabel>
                    <NativeSelect
                        id={id + "-currency"}
                        value={currency}
                        onChange={(e) => onCurrency(e.target.value)}
                    >
                        {currencies.map((c) => (
                            <option key={c} value={c}>
                                {currencyLabel(c)}
                            </option>
                        ))}
                    </NativeSelect>
                </Field>
            )}
        </div>
    )
}
