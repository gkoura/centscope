"use client"

import { useEffect, useRef } from "react"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@/components/ui/radio-group"
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field"

export function WalletPicker({
    id,
    name,
    label,
    value,
    wallets,
    onChange,
    disabled = false,
    error,
}: {
    id: string
    name: string
    label: string
    value: string
    wallets: { id: string; name: string; currency: string }[]
    onChange: (value: string) => void
    disabled?: boolean
    error?: string
}) {
    const strip = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const rail = strip.current
        const selected = rail?.querySelector<HTMLElement>(
            '[role="radio"][aria-checked="true"]'
        )
        if (!rail || !selected) return
        const left = selected.offsetLeft
        const right = left + selected.offsetWidth
        if (left < rail.scrollLeft) rail.scrollLeft = left
        else if (right > rail.scrollLeft + rail.clientWidth)
            rail.scrollLeft = right - rail.clientWidth
    }, [value])

    return (
        <FieldSet disabled={disabled} className="min-w-0 gap-1.5">
            <FieldLegend id={`${id}-label`} variant="label">
                {label}
            </FieldLegend>
            <RadioGroup
                ref={strip}
                id={id}
                name={name}
                value={value}
                onValueChange={(next) => {
                    if (typeof next === "string") onChange(next)
                }}
                disabled={disabled}
                required
                aria-labelledby={`${id}-label`}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                className="wallet-choice-strip no-scrollbar"
            >
                {wallets.map((wallet) => (
                    <Radio.Root
                        key={wallet.id}
                        id={`${id}-${wallet.id}`}
                        value={wallet.id}
                        aria-label={wallet.name}
                        aria-invalid={Boolean(error)}
                        title={wallet.name}
                        className="wallet-choice"
                    >
                        <span className="min-w-0 truncate">{wallet.name}</span>
                    </Radio.Root>
                ))}
            </RadioGroup>
            {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        </FieldSet>
    )
}
