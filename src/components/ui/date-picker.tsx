"use client"

import { useState } from "react"
import { format, parseISO, isValid } from "date-fns"
import { CalendarDaysIcon, ChevronDownIcon } from "lucide-react"
import { cn } from "cn"
import { useUtcDay } from "@/hooks/use-utc-day"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
    Popover,
    PopoverContent,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover"

type DatePickerProps = {
    id: string
    name: string
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    required?: boolean
    min?: string
    max?: string
    showShortcuts?: boolean
    "aria-invalid"?: boolean
    "aria-describedby"?: string
}

export function DatePicker({
    id,
    name,
    value,
    onChange,
    disabled = false,
    required = false,
    min,
    max,
    showShortcuts = false,
    ...ariaProps
}: DatePickerProps) {
    const [open, setOpen] = useState(false)
    const today = useUtcDay()
    const yesterday = today
        ? new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000)
              .toISOString()
              .slice(0, 10)
        : ""
    const shortcut =
        today && value === today
            ? "today"
            : yesterday && value === yesterday
              ? "yesterday"
              : null
    // Parse as a local calendar date: UTC conversion can shift the selected day.
    const parsed = value ? parseISO(value) : undefined
    const selected = parsed && isValid(parsed) ? parsed : undefined
    const minimum = min ? parseISO(min) : undefined
    const maximum = max ? parseISO(max) : undefined

    function selectRelativeDate(offset: number) {
        const date = new Date()
        date.setUTCDate(date.getUTCDate() + offset)
        const next = date.toISOString().slice(0, 10)
        if (disabled || (min && next < min) || (max && next > max)) return
        onChange(next)
        setOpen(false)
    }

    return (
        <div data-slot="date-picker" className="flex flex-wrap gap-2">
            <input type="hidden" name={name} value={value} />
            {showShortcuts && (
                <ToggleGroup
                    variant="outline"
                    aria-label="Quick date selection"
                    value={shortcut ? [shortcut] : []}
                    disabled={disabled}
                    onValueChange={(next) => {
                        if (next[0] === "today") selectRelativeDate(0)
                        if (next[0] === "yesterday") selectRelativeDate(-1)
                    }}
                >
                    <ToggleGroupItem value="today" type="button">
                        Today
                    </ToggleGroupItem>
                    <ToggleGroupItem value="yesterday" type="button">
                        Yesterday
                    </ToggleGroupItem>
                </ToggleGroup>
            )}
            <Popover open={open && !disabled} onOpenChange={setOpen}>
                <PopoverTrigger
                    render={
                        <Button
                            variant="outline"
                            type="button"
                            id={id}
                            disabled={disabled}
                            aria-description={
                                required ? "Required date" : undefined
                            }
                            className={cn(
                                "min-w-0 justify-start",
                                showShortcuts ? "flex-1 basis-48" : "w-full"
                            )}
                            {...ariaProps}
                        />
                    }
                >
                    <CalendarDaysIcon
                        data-icon="inline-start"
                        aria-hidden="true"
                    />
                    <span className="flex-1 text-left">
                        {selected ? format(selected, "PPP") : "Pick a date"}
                    </span>
                    <ChevronDownIcon
                        data-icon="inline-end"
                        aria-hidden="true"
                    />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                    <PopoverTitle className="sr-only">Choose date</PopoverTitle>
                    <Calendar
                        mode="single"
                        required
                        selected={selected}
                        defaultMonth={selected}
                        autoFocus
                        startMonth={minimum}
                        endMonth={maximum}
                        disabled={[
                            ...(minimum ? [{ before: minimum }] : []),
                            ...(maximum ? [{ after: maximum }] : []),
                        ]}
                        onSelect={(date) => {
                            onChange(format(date, "yyyy-MM-dd"))
                            setOpen(false)
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
