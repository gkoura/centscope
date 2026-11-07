"use client"

import { useLocale } from "@/components/i18n/locale-provider"
import { intlLocale } from "@/lib/i18n/config"
import { NumericFormat } from "react-number-format"
import { Input } from "@/components/ui/input"
import {
    moneyInputLocale,
    parseMoneyPaste,
    unformatMoneyInput,
    validMoneyDraft,
} from "@/lib/money-input"
import type { ComponentProps } from "react"

type MoneyInputProps = Omit<
    ComponentProps<typeof Input>,
    | "type"
    | "name"
    | "value"
    | "defaultValue"
    | "onChange"
    | "inputMode"
    | "maxLength"
> & {
    name: string
    value: string
    onValueChange: (value: string) => void
}

export function MoneyInput({
    name,
    value,
    onValueChange,
    ...props
}: MoneyInputProps) {
    const locale = intlLocale(useLocale())
    const { group, decimal, grouping } = moneyInputLocale(locale)
    return (
        <>
            <input type="hidden" name={name} value={value} />
            <NumericFormat
                {...props}
                customInput={Input}
                type="text"
                inputMode="decimal"
                value={value}
                valueIsNumericString
                thousandSeparator={group}
                decimalSeparator={decimal}
                thousandsGroupStyle={grouping}
                allowedDecimalSeparators={[".", ","]}
                allowNegative={false}
                isAllowed={({ value: next }) => validMoneyDraft(next)}
                onValueChange={({ value: next }, { source }) => {
                    if (source === "event") onValueChange(next)
                }}
                placeholder={`0${decimal}00`}
                onPaste={(event) => {
                    event.preventDefault()
                    const input = event.currentTarget
                    const pasted = parseMoneyPaste(
                        event.clipboardData.getData("text"),
                        locale
                    )
                    if (pasted === null) return
                    const before = unformatMoneyInput(
                        input.value.slice(0, input.selectionStart ?? 0),
                        locale
                    )
                    const after = unformatMoneyInput(
                        input.value.slice(
                            input.selectionEnd ?? input.value.length
                        ),
                        locale
                    )
                    const next = before + pasted + after
                    if (!validMoneyDraft(next)) return
                    onValueChange(next)
                    requestAnimationFrame(() => {
                        if (!input.isConnected) return
                        let count = 0,
                            caret = 0
                        while (
                            caret < input.value.length &&
                            count < before.length + pasted.length
                        ) {
                            if (input.value[caret] !== group) count++
                            caret++
                        }
                        input.setSelectionRange(caret, caret)
                    })
                }}
            />
        </>
    )
}
