"use client"

import { useSyncExternalStore } from "react"
import { NumericFormat } from "react-number-format"
import { Input } from "@/components/ui/input"
import {
    InputGroup,
    InputGroupInput,
    InputGroupAddon,
} from "@/components/ui/input-group"
import { AmountCalculator } from "./amount-calculator"
import {
    moneyInputLocale,
    parseMoneyPaste,
    unformatMoneyInput,
    validMoneyDraft,
} from "@/lib/money-input"
import type { ComponentProps } from "react"

function subscribeLocale(onChange: () => void) {
    window.addEventListener("languagechange", onChange)
    return () => window.removeEventListener("languagechange", onChange)
}
const browserLocale = () => navigator.language || "en-US"
const serverLocale = () => "en-US"

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
    const locale = useSyncExternalStore(
        subscribeLocale,
        browserLocale,
        serverLocale
    )
    const { group, decimal, grouping } = moneyInputLocale(locale)
    return (
        <>
            <input type="hidden" name={name} value={value} />
            <InputGroup className="h-11">
                <NumericFormat
                    {...props}
                    customInput={InputGroupInput}
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
                <InputGroupAddon align="inline-end">
                    <AmountCalculator
                        value={value}
                        onApply={onValueChange}
                        decimal={decimal}
                        disabled={props.disabled || props.readOnly}
                        label={
                            props["aria-label"] ??
                            (name === "destinationAmount"
                                ? "amount received"
                                : "amount")
                        }
                    />
                </InputGroupAddon>
            </InputGroup>
        </>
    )
}
