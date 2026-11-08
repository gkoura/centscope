"use client"

import { useMemo } from "react"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

const months = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1).padStart(2, "0"),
    label: new Intl.DateTimeFormat("en", {
        month: "long",
        timeZone: "UTC",
    }).format(new Date(Date.UTC(2000, index, 1))),
}))

/** Month-only fields keep their YYYY-MM value without asking for an irrelevant day. */
export function MonthPicker({
    id,
    name,
    value,
    onChange,
    label = "Month",
    disabled,
    "aria-invalid": invalid,
}: {
    id: string
    name?: string
    value: string
    onChange: (value: string) => void
    label?: string
    disabled?: boolean
    "aria-invalid"?: boolean
}) {
    const year = value.slice(0, 4)
    const month = value.slice(5, 7)
    const todayYear = new Date().getUTCFullYear()
    const numericYear = /^\d{4}$/.test(year) ? Number(year) : todayYear
    const years = useMemo(
        () =>
            Array.from(
                {
                    length:
                        Math.max(todayYear + 20, numericYear) -
                        Math.min(1900, numericYear) +
                        1,
                },
                (_, index) => {
                    const item = String(
                        Math.min(1900, numericYear) + index
                    ).padStart(4, "0")
                    return { value: item, label: item }
                }
            ),
        [numericYear, todayYear]
    )
    return (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_7rem] gap-2">
            {name && <input type="hidden" name={name} value={value} />}
            <NativeSelect
                id={id}
                className="w-full [&>select]:h-10"
                value={month}
                disabled={disabled}
                aria-label={`${label} month`}
                aria-invalid={invalid}
                onChange={(event) =>
                    onChange(`${year || todayYear}-${event.target.value}`)
                }
            >
                {!month && (
                    <NativeSelectOption value="" disabled>
                        Month
                    </NativeSelectOption>
                )}
                {months.map((item) => (
                    <NativeSelectOption key={item.value} value={item.value}>
                        {item.label}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
            <NativeSelect
                className="w-full [&>select]:h-10"
                value={year}
                disabled={disabled}
                aria-label={`${label} year`}
                aria-invalid={invalid}
                onChange={(event) =>
                    onChange(`${event.target.value}-${month || "01"}`)
                }
            >
                {!year && (
                    <NativeSelectOption value="" disabled>
                        Year
                    </NativeSelectOption>
                )}
                {years.map((item) => (
                    <NativeSelectOption key={item.value} value={item.value}>
                        {item.label}
                    </NativeSelectOption>
                ))}
            </NativeSelect>
        </div>
    )
}
