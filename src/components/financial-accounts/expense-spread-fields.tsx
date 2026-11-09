"use client"

import { useState } from "react"
import {
    type ExpenseSpread,
    validSpread,
    monthlyShare,
    shiftMonth,
} from "@/lib/expense-spread"
import { formatWalletMoney } from "@/lib/wallet-input"
import { normalizeDecimalInput } from "@/lib/decimal-input"
import { FieldHelp } from "@/components/ui/field-help"
import { MonthPicker } from "@/components/ui/month-picker"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"

export function ExpenseSpreadFields({
    initial,
    onEnabledChange,
    date,
    amount,
    currency,
    type,
    error,
}: {
    initial?: ExpenseSpread | null
    onEnabledChange?: (enabled: boolean) => void
    date: string
    amount: string
    currency: string
    type: string
    error?: string
}) {
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
        preview = `${formatWalletMoney(first, currency)}${first === last ? "" : `–${formatWalletMoney(last, currency)}`} per month · ${spread.startMonth} to ${shiftMonth(spread.startMonth, spread.monthCount - 1)}`
    }
    if (type !== "EXPENSE")
        return initial || enabled ? (
            <p className="text-sm text-muted-foreground">
                Saving as income removes expense spreading.
            </p>
        ) : null
    return (
        <div className="flex flex-col gap-3">
            <Field>
                <div className="flex items-center gap-1">
                    <FieldLabel
                        htmlFor="spread-enabled"
                        className="min-h-11 flex-1 items-center gap-2"
                    >
                        <input
                            id="spread-enabled"
                            type="checkbox"
                            name="spreadEnabled"
                            checked={enabled}
                            onChange={(event) => {
                                setEnabled(event.target.checked)
                                onEnabledChange?.(event.target.checked)
                                if (event.target.checked && !start)
                                    setStart(date.slice(0, 7))
                            }}
                        />
                        Spread over time
                    </FieldLabel>
                    <FieldHelp label="Spread over time">
                        Distribute this cost in monthly analysis. Your wallet
                        still records the full payment once. Remainder cents go
                        to the earliest months.
                    </FieldHelp>
                </div>
            </Field>
            {enabled && (
                <>
                    <Field>
                        <FieldLabel htmlFor="spread-start">
                            Start month
                        </FieldLabel>
                        <MonthPicker
                            id="spread-start"
                            label="Spread start"
                            name="spreadStartMonth"
                            value={spread.startMonth}
                            onChange={setStart}
                            aria-invalid={Boolean(error)}
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="spread-count">
                            Number of months
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
                            "Enter an amount and schedule to preview the split."}
                    </p>
                </>
            )}
            {error && <FieldError role="alert">{error}</FieldError>}
        </div>
    )
}
