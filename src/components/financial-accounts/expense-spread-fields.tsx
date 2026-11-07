"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { intlLocale } from "@/lib/i18n/config"

import { useTranslations } from "@/components/i18n/locale-provider"

import { useState } from "react"
import {
    type ExpenseSpread,
    validSpread,
    monthlyShare,
    shiftMonth,
} from "@/lib/expense-spread"
import { formatWalletMoney } from "@/lib/wallet-input"
import { normalizeDecimalInput } from "@/lib/decimal-input"
import { Input } from "@/components/ui/input"
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
} from "@/components/ui/field"

export function ExpenseSpreadFields({
    initial,
    date,
    amount,
    currency,
    type,
    error,
}: {
    initial?: ExpenseSpread | null
    date: string
    amount: string
    currency: string
    type: string
    error?: string
}) {
    const locale = useLocale()

    const t = useTranslations()

    const [enabled, setEnabled] = useState(Boolean(initial))
    const [start, setStart] = useState(initial?.startMonth ?? "")
    const [count, setCount] = useState(String(initial?.monthCount ?? 6))
    const spread = {
        startMonth: start || date.slice(0, 7),
        monthCount: Number(count),
    }
    let preview = ""
    const normalizedAmount = normalizeDecimalInput(amount)
    if (validSpread(spread) && /^\d+(?:\.\d{1,2})?$/.test(normalizedAmount)) {
        const first = monthlyShare(normalizedAmount, spread, spread.startMonth)
        const last = monthlyShare(
            normalizedAmount,
            spread,
            shiftMonth(spread.startMonth, spread.monthCount - 1)
        )
        preview = t("{value0}{value1} per month · {value2} to {value3}", {
            value0: formatWalletMoney(first, currency, intlLocale(locale)),
            value1:
                first === last
                    ? ""
                    : `–${formatWalletMoney(last, currency, intlLocale(locale))}`,
            value2: spread.startMonth,
            value3: shiftMonth(spread.startMonth, spread.monthCount - 1),
        })
    }
    if (type !== "EXPENSE")
        return initial || enabled ? (
            <p className="text-sm text-muted-foreground">
                {t("Saving as income removes expense spreading.")}
            </p>
        ) : null
    return (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
            <Field>
                <FieldLabel
                    htmlFor="spread-enabled"
                    className="flex items-center gap-2"
                >
                    <input
                        id="spread-enabled"
                        type="checkbox"
                        name="spreadEnabled"
                        checked={enabled}
                        onChange={(event) => {
                            setEnabled(event.target.checked)
                            if (event.target.checked && !start)
                                setStart(date.slice(0, 7))
                        }}
                    />
                    {t("Spread over time")}
                </FieldLabel>
                <FieldDescription>
                    {t(
                        "Distribute this cost in monthly analysis. Your wallet still records the full payment once."
                    )}
                </FieldDescription>
            </Field>
            {enabled && (
                <>
                    <Field>
                        <FieldLabel htmlFor="spread-start">
                            {t("Start month")}
                        </FieldLabel>
                        <Input
                            id="spread-start"
                            name="spreadStartMonth"
                            type="month"
                            value={spread.startMonth}
                            onChange={(event) => setStart(event.target.value)}
                            required
                            aria-invalid={Boolean(error)}
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="spread-count">
                            {t("Number of months")}
                        </FieldLabel>
                        <Input
                            id="spread-count"
                            name="spreadMonthCount"
                            type="number"
                            min={2}
                            max={120}
                            step={1}
                            value={count}
                            onChange={(event) => setCount(event.target.value)}
                            required
                            aria-invalid={Boolean(error)}
                        />
                    </Field>
                    <p
                        className="text-sm text-muted-foreground"
                        aria-live="polite"
                    >
                        {preview ||
                            t(
                                "Enter an amount and schedule to preview the split."
                            )}{" "}
                        {t("Remainder cents go to the earliest months.")}
                    </p>
                </>
            )}
            {error && <FieldError role="alert">{t(error || "")}</FieldError>}
        </div>
    )
}
