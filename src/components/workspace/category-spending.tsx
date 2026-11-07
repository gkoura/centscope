"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { intlLocale } from "@/lib/i18n/config"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useState } from "react"
import { Percent } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { categorySpendingGroups } from "@/lib/analytics"
import { currencyLabel } from "@/lib/currency"
import { formatWalletMoney } from "@/lib/wallet-input"

export function CategorySpending({
    categories,
    incomeCategories = [],
}: {
    categories: { name: string; currency: string; amount: string }[]
    incomeCategories?: { name: string; currency: string; amount: string }[]
}) {
    const locale = useLocale()
    const percentageFormatter = new Intl.NumberFormat(intlLocale(locale), {
        maximumFractionDigits: 2,
    })

    const t = useTranslations()

    const [type, setType] = useState("EXPENSE")
    const [percentage, setPercentage] = useState(false)
    const income = type === "INCOME"
    const groups = categorySpendingGroups(
        income ? incomeCategories : categories
    )
    return (
        <section
            aria-labelledby="category-spending-heading"
            className="rounded-2xl border bg-card p-5"
        >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2
                    id="category-spending-heading"
                    className="text-base font-semibold tracking-tight"
                >
                    {t("Categories Overview")}
                </h2>
                <Button
                    variant={percentage ? "default" : "outline"}
                    size="sm"
                    className="min-h-11"
                    aria-pressed={percentage}
                    onClick={() => setPercentage((value) => !value)}
                >
                    <Percent data-icon="inline-start" /> {t("Percentage")}
                </Button>
            </div>
            <Tabs value={type} onValueChange={setType} className="mb-3">
                <TabsList
                    aria-label={t("Category overview type")}
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
            <p className="mb-6 text-xs leading-6 text-muted-foreground">
                {percentage
                    ? t("Share of posted {value0} in each currency.", {
                          value0: income ? t("income") : t("spending"),
                      })
                    : t("Posted {value0} amounts by category.", {
                          value0: income ? t("income") : t("expense"),
                      })}{" "}
                {t("Pending entries and transfers are excluded.")}
            </p>
            {groups.length ? (
                groups.map(({ currency, categories: items }) => (
                    <div
                        key={currency}
                        className="mb-6 flex flex-col gap-5 last:mb-0"
                    >
                        {groups.length > 1 && (
                            <h3 className="text-xs font-medium text-muted-foreground">
                                {t(currencyLabel(currency))}
                            </h3>
                        )}
                        {items.map((category) => (
                            <div key={category.name}>
                                <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
                                    <span className="min-w-0 wrap-break-word">
                                        {category.name}
                                    </span>
                                    <span
                                        data-flow={
                                            income ? "income" : "expense"
                                        }
                                        className="shrink-0 font-medium tabular-nums"
                                    >
                                        {percentage
                                            ? `${percentageFormatter.format(category.percentage)}%`
                                            : formatWalletMoney(
                                                  category.amount,
                                                  currency,
                                                  intlLocale(locale)
                                              )}
                                    </span>
                                </div>
                                <div
                                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                                    aria-hidden="true"
                                >
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${category.percentage}%`,
                                            backgroundColor: income
                                                ? "var(--income)"
                                                : "var(--expense)",
                                            opacity: 0.7,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ))
            ) : (
                <p className="text-sm leading-7 text-muted-foreground">
                    {t("No posted")} {income ? t("income") : t("expenses")}{" "}
                    {t("in this period. Choose another period or add a posted")}{" "}
                    {income ? t("income transaction") : t("expense")}{" "}
                    {t("to see your category breakdown.")}
                </p>
            )}
        </section>
    )
}
