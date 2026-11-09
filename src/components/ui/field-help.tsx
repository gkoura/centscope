"use client"

import type { ReactNode } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FieldLabel } from "@/components/ui/field"
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverTitle,
    PopoverDescription,
} from "@/components/ui/popover"

// Keep the button beside the label: interactive children inside a label can
// accidentally activate the associated input, especially for checkboxes.
export function FieldHelp({
    label,
    children,
}: {
    label: string
    children: ReactNode
}) {
    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="size-6 shrink-0"
                    />
                }
                aria-label={`About ${label.toLowerCase()}`}
            >
                <Info />
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="max-w-[calc(100vw-2rem)] p-4"
            >
                <PopoverTitle>{label}</PopoverTitle>
                <PopoverDescription>{children}</PopoverDescription>
            </PopoverContent>
        </Popover>
    )
}

export function FieldLabelWithHelp({
    htmlFor,
    label,
    children,
}: {
    htmlFor: string
    label: string
    children: ReactNode
}) {
    return (
        <div className="flex min-h-6 items-center gap-1">
            <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
            <FieldHelp label={label}>{children}</FieldHelp>
        </div>
    )
}
