"use client"
import { useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { MonthPicker } from "@/components/ui/month-picker"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    budgetPeriod,
    moveBudgetPeriod,
    type BudgetCadence,
} from "@/lib/budget-period"

export function BudgetPeriodPicker({
    cadence,
    value,
    onChange,
}: {
    cadence: BudgetCadence
    value: string
    onChange: (value: string) => void
}) {
    const [open, setOpen] = useState(false)
    const [yearPage, setYearPage] = useState(
        Number(value.slice(0, 4)) - (Number(value.slice(0, 4)) % 12)
    )
    const period = budgetPeriod(cadence, value)
    const previous = moveBudgetPeriod(cadence, value, -1),
        next = moveBudgetPeriod(cadence, value, 1)
    function select(date: string) {
        onChange(date)
        setOpen(false)
    }
    // Calendar uses local Date values for display; server boundaries remain UTC date strings.
    const selected = new Date(`${value}T12:00:00`)
    return (
        <div
            className="flex w-full min-w-0 items-center gap-1 sm:w-auto"
            role="group"
            aria-label={`${cadence.toLowerCase()} budget period`}
        >
            <Button
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                aria-label={`Previous ${cadence.toLowerCase()} period`}
                disabled={!previous}
                onClick={() => previous && onChange(previous)}
            >
                <ChevronLeft className="size-4" />
            </Button>
            <Popover
                open={open}
                onOpenChange={(nextOpen) => {
                    if (nextOpen)
                        setYearPage(
                            Number(value.slice(0, 4)) -
                                (Number(value.slice(0, 4)) % 12)
                        )
                    setOpen(nextOpen)
                }}
            >
                <PopoverTrigger
                    render={
                        <Button
                            variant="outline"
                            className="min-h-11 min-w-0 flex-1 px-2 text-xs sm:text-sm"
                        />
                    }
                >
                    <CalendarDays className="size-4 shrink-0" />
                    <span className="min-w-0 text-center leading-tight whitespace-normal">
                        {period.label}
                    </span>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[min(20rem,calc(100vw-2rem))]"
                    align="center"
                >
                    {cadence === "MONTHLY" ? (
                        <MonthPicker
                            id="budget-period-month"
                            value={value.slice(0, 7)}
                            label="Budget period"
                            onChange={(month) => select(`${month}-01`)}
                        />
                    ) : cadence === "YEARLY" ? (
                        <>
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-11"
                                    disabled={yearPage <= 1900}
                                    aria-label="Earlier years"
                                    onClick={() =>
                                        setYearPage((y) =>
                                            Math.max(1900, y - 12)
                                        )
                                    }
                                >
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <span className="text-sm">
                                    {yearPage} – {Math.min(9998, yearPage + 11)}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-11"
                                    disabled={yearPage + 12 > 9998}
                                    aria-label="Later years"
                                    onClick={() => setYearPage((y) => y + 12)}
                                >
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                                {Array.from(
                                    { length: 12 },
                                    (_, i) => yearPage + i
                                )
                                    .filter((y) => y >= 1900 && y <= 9998)
                                    .map((year) => (
                                        <Button
                                            key={year}
                                            variant={
                                                String(year) ===
                                                value.slice(0, 4)
                                                    ? "default"
                                                    : "ghost"
                                            }
                                            className="min-h-11"
                                            onClick={() =>
                                                select(`${year}-01-01`)
                                            }
                                        >
                                            {year}
                                        </Button>
                                    ))}
                            </div>
                        </>
                    ) : (
                        <Calendar
                            mode="single"
                            selected={selected}
                            defaultMonth={selected}
                            weekStartsOn={1}
                            onSelect={(date) => {
                                if (date)
                                    select(
                                        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                    )
                            }}
                            disabled={{
                                before: new Date(1900, 0, 1),
                                after: new Date(9998, 11, 31),
                            }}
                        />
                    )}
                    <Button
                        variant="ghost"
                        className="min-h-11"
                        onClick={() =>
                            select(new Date().toISOString().slice(0, 10))
                        }
                    >
                        Current{" "}
                        {cadence === "DAILY"
                            ? "day"
                            : cadence === "WEEKLY"
                              ? "week"
                              : cadence === "MONTHLY"
                                ? "month"
                                : "year"}
                    </Button>
                </PopoverContent>
            </Popover>
            <Button
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                aria-label={`Next ${cadence.toLowerCase()} period`}
                disabled={!next}
                onClick={() => next && onChange(next)}
            >
                <ChevronRight className="size-4" />
            </Button>
        </div>
    )
}
