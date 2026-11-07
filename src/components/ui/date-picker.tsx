"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { el, enGB } from "react-day-picker/locale"
import { useLocale, useTranslations } from "@/components/i18n/locale-provider"
import { CalendarDaysIcon, ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
    "aria-invalid"?: boolean
    "aria-describedby"?: string
}

export function DatePicker({
    id,
    name,
    value,
    onChange,
    ...ariaProps
}: DatePickerProps) {
    const t = useTranslations()
    const locale = useLocale() === "el" ? el : enGB
    const [open, setOpen] = useState(false)
    // Parse as a local calendar date: UTC conversion can shift the selected day.
    const selected = value ? parseISO(value) : undefined

    return (
        <>
            <input type="hidden" name={name} value={value} />
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                    render={
                        <Button
                            variant="outline"
                            type="button"
                            id={id}
                            className="w-full justify-start"
                            {...ariaProps}
                        />
                    }
                >
                    <CalendarDaysIcon
                        data-icon="inline-start"
                        aria-hidden="true"
                    />
                    <span className="flex-1 text-left">
                        {selected
                            ? format(selected, "PPP", { locale })
                            : t("Pick a date")}
                    </span>
                    <ChevronDownIcon
                        data-icon="inline-end"
                        aria-hidden="true"
                    />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                    <PopoverTitle className="sr-only">
                        {t("Choose date")}
                    </PopoverTitle>
                    <Calendar
                        locale={locale}
                        mode="single"
                        required
                        selected={selected}
                        defaultMonth={selected}
                        autoFocus
                        onSelect={(date) => {
                            onChange(format(date, "yyyy-MM-dd"))
                            setOpen(false)
                        }}
                    />
                </PopoverContent>
            </Popover>
        </>
    )
}
