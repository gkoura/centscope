"use client"

import { useId, useRef, useState } from "react"
import { Calculator } from "lucide-react"
import { calculateAmount } from "@/lib/amount-calculator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputGroupButton } from "@/components/ui/input-group"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import {
    Popover,
    PopoverContent,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover"

export function AmountCalculator({
    value,
    onApply,
    decimal,
    disabled,
    label,
}: {
    value: string
    onApply: (value: string) => void
    decimal: string
    disabled?: boolean
    label: string
}) {
    const [open, setOpen] = useState(false)
    const [expression, setExpression] = useState("")
    const input = useRef<HTMLInputElement>(null)
    const id = useId()
    let result: string | null = null
    let error = ""
    try {
        result = calculateAmount(expression)
    } catch (cause) {
        error =
            cause instanceof Error ? cause.message : "Check your calculation."
    }
    function apply() {
        if (result === null) return
        onApply(result)
        setOpen(false)
    }
    function insert(text: string) {
        const start = input.current?.selectionStart ?? expression.length
        const end = input.current?.selectionEnd ?? start
        const next = expression.slice(0, start) + text + expression.slice(end)
        if (next.length > 200) return
        setExpression(next)
        requestAnimationFrame(() => {
            input.current?.focus({ preventScroll: true })
            input.current?.setSelectionRange(
                start + text.length,
                start + text.length
            )
        })
    }
    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                if (next) setExpression(value.replace(".", decimal))
                setOpen(next)
            }}
        >
            <PopoverTrigger
                disabled={disabled}
                aria-label={`Calculate ${label}`}
                render={<InputGroupButton size="icon-sm" className="size-11" />}
            >
                <Calculator />
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="max-h-[min(36rem,var(--available-height))] w-72 max-w-[calc(100vw-2rem)] gap-3 overflow-y-auto p-3"
            >
                <PopoverTitle>Calculate amount</PopoverTitle>
                <Field>
                    <FieldLabel htmlFor={id}>Calculation</FieldLabel>
                    <Input
                        ref={input}
                        id={id}
                        value={expression}
                        inputMode="none"
                        autoComplete="off"
                        maxLength={200}
                        placeholder={`e.g. (12${decimal}50 + 8) / 2`}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault()
                                event.stopPropagation()
                                apply()
                            }
                        }}
                        onChange={(event) => setExpression(event.target.value)}
                        aria-describedby={`${id}-hint`}
                    />
                    <FieldDescription id={`${id}-hint`}>
                        Use +, −, ×, ÷ and parentheses. No thousands separators.
                        Results round to 2 decimal places.
                    </FieldDescription>
                </Field>
                <output
                    aria-live="polite"
                    className="min-h-6 text-sm break-words tabular-nums"
                >
                    {result !== null
                        ? `= ${result.replace(".", decimal)}`
                        : error}
                </output>
                <div className="grid grid-cols-4 gap-1.5">
                    {[
                        "C",
                        "(",
                        ")",
                        "⌫",
                        "7",
                        "8",
                        "9",
                        "÷",
                        "4",
                        "5",
                        "6",
                        "×",
                        "1",
                        "2",
                        "3",
                        "−",
                        "0",
                        decimal,
                        "=",
                        "+",
                    ].map((key) => (
                        <Button
                            key={key}
                            type="button"
                            variant="outline"
                            className="h-11 min-w-0"
                            aria-label={
                                key === "C"
                                    ? "Clear calculation"
                                    : key === "⌫"
                                      ? "Delete previous character"
                                      : key === "="
                                        ? "Evaluate calculation"
                                        : key
                            }
                            onClick={() => {
                                if (key === "C") {
                                    setExpression("")
                                    input.current?.focus()
                                } else if (key === "⌫") {
                                    const start =
                                        input.current?.selectionStart ??
                                        expression.length
                                    const end =
                                        input.current?.selectionEnd ?? start
                                    setExpression(
                                        expression.slice(
                                            0,
                                            Math.max(
                                                0,
                                                start - (start === end ? 1 : 0)
                                            )
                                        ) + expression.slice(end)
                                    )
                                    requestAnimationFrame(() => {
                                        input.current?.focus()
                                        input.current?.setSelectionRange(
                                            Math.max(
                                                0,
                                                start - (start === end ? 1 : 0)
                                            ),
                                            Math.max(
                                                0,
                                                start - (start === end ? 1 : 0)
                                            )
                                        )
                                    })
                                } else if (key === "=") {
                                    if (result !== null)
                                        setExpression(
                                            result.replace(".", decimal)
                                        )
                                } else insert(key)
                            }}
                        >
                            {key}
                        </Button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-11"
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="h-11 flex-1"
                        disabled={result === null}
                        onClick={apply}
                    >
                        Use amount
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
