"use client"
import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import {
    adjacentPeriod,
    validDay,
    type AccountPeriod,
} from "@/lib/account-period"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"

export function PeriodControls({
    period,
    basePath,
    query = {},
    monthlyOnly = false,
}: {
    period: AccountPeriod
    basePath: string
    query?: Record<string, string>
    monthlyOnly?: boolean
}) {
    const router = useRouter()
    const [dialogView, setDialogView] = useState<AccountPeriod["view"]>(
        period.view
    )
    const [open, setOpen] = useState(false),
        [pending, startTransition] = useTransition()
    function href(values: Record<string, string>) {
        const params = new URLSearchParams(query)
        for (const key of [
            "before",
            "after",
            "view",
            "month",
            "year",
            "from",
            "to",
        ])
            params.delete(key)
        for (const [key, value] of Object.entries(values))
            if (value) params.set(key, value)
        return `${basePath}?${params}`
    }
    function navigate(values: Record<string, string>) {
        startTransition(() => router.push(href(values), { scroll: false }))
    }
    const previous = adjacentPeriod(period, -1),
        next = adjacentPeriod(period, 1)
    return (
        <div className="period-controls" aria-busy={pending}>
            {!monthlyOnly && (
                <Tabs
                    value={period.view}
                    onValueChange={(value) => {
                        if (value === "custom") {
                            setDialogView("custom")
                            setOpen(true)
                        } else
                            navigate(
                                value === "year"
                                    ? {
                                          view: "year",
                                          year: period.from.slice(0, 4),
                                      }
                                    : {
                                          view: "month",
                                          month:
                                              period.view === "year"
                                                  ? `${period.year}-${period.month.slice(5)}`
                                                  : period.month,
                                      }
                            )
                    }}
                >
                    <TabsList aria-label="Date period" className="h-10">
                        <TabsTrigger value="month">Month</TabsTrigger>
                        <TabsTrigger value="year">Year</TabsTrigger>
                        <TabsTrigger value="custom">Custom</TabsTrigger>
                    </TabsList>
                </Tabs>
            )}
            <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border bg-card p-1">
                <Button
                    variant="ghost"
                    size="icon-lg"
                    disabled={!previous || pending}
                    render={
                        previous ? (
                            <Link href={href(previous)} scroll={false} />
                        ) : undefined
                    }
                    nativeButton={!previous}
                    aria-label={
                        period.view === "year"
                            ? "Previous year"
                            : "Previous month"
                    }
                >
                    <ChevronLeft />
                </Button>
                <Dialog
                    open={open}
                    onOpenChange={(value) => {
                        if (value && !open) setDialogView(period.view)
                        setOpen(value)
                    }}
                >
                    <DialogTrigger
                        render={
                            <Button
                                variant="ghost"
                                className="min-w-0 flex-1"
                            />
                        }
                    >
                        <CalendarDays data-icon="inline-start" />
                        <span className="truncate">{period.label}</span>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Choose a period</DialogTitle>
                            <DialogDescription>
                                {monthlyOnly
                                    ? "Choose the month to review."
                                    : "Browse a month, a year, or your own date range."}
                            </DialogDescription>
                        </DialogHeader>
                        <PeriodForm
                            key={`${dialogView}:${period.from}:${period.to}:${monthlyOnly}`}
                            period={{ ...period, view: dialogView }}
                            monthlyOnly={monthlyOnly}
                            onApply={(values) => {
                                setOpen(false)
                                navigate(values)
                            }}
                        />
                    </DialogContent>
                </Dialog>
                <Button
                    variant="ghost"
                    size="icon-lg"
                    disabled={!next || pending}
                    render={
                        next ? (
                            <Link href={href(next)} scroll={false} />
                        ) : undefined
                    }
                    nativeButton={!next}
                    aria-label={
                        period.view === "year" ? "Next year" : "Next month"
                    }
                >
                    <ChevronRight />
                </Button>
            </div>
            {period.notice && (
                <p role="status" className="text-sm text-muted-foreground">
                    {period.notice}
                </p>
            )}
        </div>
    )
}
function PeriodForm({
    period,
    monthlyOnly,
    onApply,
}: {
    period: AccountPeriod
    monthlyOnly: boolean
    onApply: (values: Record<string, string>) => void
}) {
    const [view, setView] = useState<AccountPeriod["view"]>(period.view)
    const [month, setMonth] = useState(period.month),
        [year, setYear] = useState(period.year),
        [from, setFrom] = useState(period.from),
        [to, setTo] = useState(period.to)
    const [error, setError] = useState("")
    return (
        <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
                event.preventDefault()
                if (
                    view === "custom" &&
                    (!validDay(from) || !validDay(to) || from > to)
                ) {
                    setError(
                        "Choose valid dates, with the end on or after the start."
                    )
                    return
                }
                onApply(
                    view === "month"
                        ? { view, month }
                        : view === "year"
                          ? { view, year: year.padStart(4, "0") }
                          : { view, from, to }
                )
            }}
        >
            {!monthlyOnly && (
                <Tabs
                    value={view}
                    onValueChange={(value) =>
                        setView(value as AccountPeriod["view"])
                    }
                >
                    <TabsList aria-label="Choose period type">
                        <TabsTrigger value="month">Month</TabsTrigger>
                        <TabsTrigger value="year">Year</TabsTrigger>
                        <TabsTrigger value="custom">Custom</TabsTrigger>
                    </TabsList>
                </Tabs>
            )}
            <FieldGroup>
                {view === "month" ? (
                    <Field>
                        <FieldLabel htmlFor="period-month">Month</FieldLabel>
                        <Input
                            id="period-month"
                            type="month"
                            min="0002-01"
                            max="9998-12"
                            value={month}
                            required
                            onChange={(event) => setMonth(event.target.value)}
                        />
                    </Field>
                ) : view === "year" ? (
                    <Field>
                        <FieldLabel htmlFor="period-year">Year</FieldLabel>
                        <Input
                            id="period-year"
                            type="number"
                            min="2"
                            max="9998"
                            value={year}
                            required
                            onChange={(event) => setYear(event.target.value)}
                        />
                    </Field>
                ) : (
                    <>
                        <Field>
                            <FieldLabel htmlFor="period-from">From</FieldLabel>
                            <DatePicker
                                id="period-from"
                                name="from"
                                value={from}
                                onChange={setFrom}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="period-to">To</FieldLabel>
                            <DatePicker
                                id="period-to"
                                name="to"
                                value={to}
                                onChange={setTo}
                            />
                        </Field>
                    </>
                )}
            </FieldGroup>
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            <div className="flex justify-end gap-2">
                <DialogClose render={<Button variant="outline" />}>
                    Cancel
                </DialogClose>
                <Button type="submit">Show period</Button>
            </div>
        </form>
    )
}
