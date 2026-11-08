"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import { format, parseISO } from "date-fns"
import { Download, LoaderCircle } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { validDay } from "@/lib/account-period"
import {
    exportPresetRange,
    exportRangeError,
    exportSearch,
    type ExportPreset,
    type ExportRange,
} from "@/lib/transaction-export-period"
import type { TransactionFilters } from "@/lib/transaction-filters"

const presets = [
    { value: "month", label: "This month" },
    { value: "last-month", label: "Last month" },
    { value: "year", label: "This year" },
    { value: "all", label: "All time" },
    { value: "custom", label: "Custom range" },
]
const calendarDate = (value: string) =>
    validDay(value) ? parseISO(value) : undefined

export function TransactionExportDialog({
    accountId,
    filters,
    onOpenChange,
    returnFocus,
}: {
    accountId: string
    filters: TransactionFilters
    onOpenChange: (open: boolean) => void
    returnFocus: RefObject<HTMLButtonElement | null>
}) {
    const [today] = useState(() => new Date().toISOString().slice(0, 10))
    const [range, setRange] = useState<ExportRange>(() =>
        exportPresetRange("month", today)
    )
    const [preset, setPreset] = useState<ExportPreset>("month")
    const [month, setMonth] = useState(() => parseISO(range.from))
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [touched, setTouched] = useState(false)
    const request = useRef<AbortController | null>(null)
    const rangeRequest = useRef<AbortController | null>(null)
    const [loadingRange, setLoadingRange] = useState(false)
    const [allTimeLoaded, setAllTimeLoaded] = useState(false)
    const [emptyAccount, setEmptyAccount] = useState(false)
    useEffect(
        () => () => {
            request.current?.abort()
            rangeRequest.current?.abort()
        },
        []
    )
    const validation = preset === "all" ? null : exportRangeError(range)
    const from = calendarDate(range.from),
        to = calendarDate(range.to)
    const filtered = [
        filters.q,
        filters.wallet,
        filters.category,
        filters.type,
        filters.status,
    ].some(Boolean)
    async function choosePreset(value: ExportPreset) {
        rangeRequest.current?.abort()
        setPreset(value)
        setTouched(false)
        setError(null)
        setLoadingRange(false)
        if (value === "all") {
            setAllTimeLoaded(false)
            setLoadingRange(true)
            const controller = new AbortController()
            rangeRequest.current = controller
            try {
                const response = await fetch(
                    `/dashboard/accounts/${accountId}/transactions/export/range`,
                    {
                        signal: controller.signal,
                        redirect: "error",
                        cache: "no-store",
                    }
                )
                if (!response.ok) throw new Error("range")
                const result = (await response.json()) as {
                    range: ExportRange | null
                }
                if (controller.signal.aborted) return
                if (result.range && exportRangeError(result.range))
                    throw new Error("range")
                setRange(result.range ?? { from: "", to: "" })
                setEmptyAccount(!result.range)
                if (result.range) setMonth(parseISO(result.range.from))
                setAllTimeLoaded(true)
            } catch {
                if (!controller.signal.aborted)
                    setError(
                        "Couldn’t load your transaction dates. Choose All time again to retry, or select a custom range."
                    )
            } finally {
                if (!controller.signal.aborted) setLoadingRange(false)
            }
        } else if (value !== "custom") {
            const next = exportPresetRange(value, today)
            setRange(next)
            setMonth(parseISO(next.from))
        }
    }
    function changeDate(key: keyof ExportRange, value: string) {
        setPreset("custom")
        setTouched(true)
        setError(null)
        setRange((previous) => ({ ...previous, [key]: value }))
        const date = calendarDate(value)
        if (date) setMonth(date)
    }
    async function download() {
        setTouched(true)
        if (
            validation ||
            pending ||
            loadingRange ||
            (preset === "all" && !allTimeLoaded)
        )
            return
        setPending(true)
        setError(null)
        const controller = new AbortController()
        request.current = controller
        try {
            const response = await fetch(
                `/dashboard/accounts/${accountId}/transactions/export?${exportSearch(filters, preset === "all" ? "all" : range)}`,
                {
                    signal: controller.signal,
                    redirect: "error",
                    cache: "no-store",
                }
            )
            if (
                !response.ok ||
                !response.headers.get("Content-Type")?.includes("text/csv")
            )
                throw new Error("export")
            const blob = await response.blob()
            if (controller.signal.aborted) return
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `centscope-transactions-${preset === "all" ? "all-time" : `${range.from}-${range.to}`}.csv`
            document.body.append(link)
            link.click()
            link.remove()
            setTimeout(() => URL.revokeObjectURL(url), 30_000)
            onOpenChange(false)
        } catch {
            if (!controller.signal.aborted)
                setError(
                    "Couldn’t export transactions. Check your connection or sign in again, then retry."
                )
        } finally {
            if (!controller.signal.aborted) setPending(false)
        }
    }
    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent
                finalFocus={returnFocus}
                className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
            >
                <DialogHeader>
                    <DialogTitle>Export transactions</DialogTitle>
                    <DialogDescription>
                        Choose a date range for your CSV. This is separate from
                        the period you’re viewing.
                    </DialogDescription>
                </DialogHeader>
                <form
                    aria-busy={pending}
                    className="flex flex-col gap-4"
                    onSubmit={(event) => {
                        event.preventDefault()
                        void download()
                    }}
                >
                    <fieldset
                        disabled={pending}
                        className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                        <FieldGroup className="gap-4">
                            <Field>
                                <FieldLabel htmlFor="export-preset">
                                    Time period
                                </FieldLabel>
                                <Select
                                    items={presets}
                                    value={preset}
                                    onValueChange={(value) => {
                                        if (value)
                                            void choosePreset(
                                                value as ExportPreset
                                            )
                                    }}
                                >
                                    <SelectTrigger
                                        id="export-preset"
                                        className="h-10 w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent
                                        align="start"
                                        alignItemWithTrigger={false}
                                    >
                                        <SelectGroup>
                                            {presets.map((item) => (
                                                <SelectItem
                                                    key={item.value}
                                                    value={item.value}
                                                >
                                                    {item.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                                {(["from", "to"] as const).map((key) => (
                                    <Field
                                        key={key}
                                        data-invalid={touched && !!validation}
                                    >
                                        <FieldLabel htmlFor={`export-${key}`}>
                                            {key === "from"
                                                ? "Start date"
                                                : "End date"}
                                        </FieldLabel>
                                        <Input
                                            id={`export-${key}`}
                                            className="h-10"
                                            value={
                                                loadingRange ? "" : range[key]
                                            }
                                            disabled={
                                                loadingRange ||
                                                (preset === "all" &&
                                                    (!allTimeLoaded ||
                                                        emptyAccount))
                                            }
                                            placeholder="YYYY-MM-DD"
                                            maxLength={10}
                                            autoComplete="off"
                                            aria-invalid={
                                                touched && !!validation
                                            }
                                            aria-describedby={
                                                touched && validation
                                                    ? "export-date-error"
                                                    : "export-calendar-help"
                                            }
                                            onChange={(event) =>
                                                changeDate(
                                                    key,
                                                    event.target.value
                                                )
                                            }
                                            onFocus={() => {
                                                const date = calendarDate(
                                                    range[key]
                                                )
                                                if (date) setMonth(date)
                                            }}
                                        />
                                    </Field>
                                ))}
                            </div>
                            <FieldDescription id="export-calendar-help">
                                Jump to a month and year on the calendar, then
                                select a start and end day. Or type dates as
                                YYYY-MM-DD.
                            </FieldDescription>
                        </FieldGroup>
                        <div className="flex min-w-0 flex-col gap-2">
                            <Calendar
                                mode="range"
                                resetOnSelect
                                selected={
                                    from
                                        ? {
                                              from,
                                              to:
                                                  to && from <= to
                                                      ? to
                                                      : undefined,
                                          }
                                        : undefined
                                }
                                month={month}
                                onMonthChange={setMonth}
                                captionLayout="dropdown"
                                startMonth={parseISO(
                                    `${Math.min(
                                        1900,
                                        from?.getFullYear() ?? 1900,
                                        month.getFullYear()
                                    )
                                        .toString()
                                        .padStart(4, "0")}-01-01`
                                )}
                                endMonth={parseISO(
                                    `${Math.min(9998, Math.max(Number(today.slice(0, 4)) + 20, to?.getFullYear() ?? 0, month.getFullYear()))}-12-01`
                                )}
                                disabled={
                                    pending ||
                                    loadingRange ||
                                    (preset === "all" &&
                                        (!allTimeLoaded || emptyAccount))
                                }
                                className="mx-auto rounded-lg border [--cell-size:--spacing(8)] min-[375px]:[--cell-size:--spacing(9)]"
                                classNames={{
                                    month_caption:
                                        "flex h-9 w-full items-center justify-center px-9",
                                    dropdown_root:
                                        "relative rounded-md border border-input px-2 py-1 focus-within:ring-2 focus-within:ring-ring",
                                }}
                                onSelect={(selected) => {
                                    setPreset("custom")
                                    setTouched(false)
                                    setError(null)
                                    setRange({
                                        from: selected?.from
                                            ? format(
                                                  selected.from,
                                                  "yyyy-MM-dd"
                                              )
                                            : "",
                                        to: selected?.to
                                            ? format(selected.to, "yyyy-MM-dd")
                                            : "",
                                    })
                                }}
                            />
                            <p
                                aria-live="polite"
                                className="text-center text-xs text-muted-foreground"
                            >
                                {loadingRange
                                    ? "Finding your first and last transactions…"
                                    : preset === "all"
                                      ? emptyAccount
                                          ? "No transactions yet. Your CSV will contain column headers."
                                          : allTimeLoaded
                                            ? "From your first transaction to your last."
                                            : "Select All time again to retry."
                                      : from && !to
                                        ? "Now choose the end date."
                                        : "Select two dates to set your range."}
                            </p>
                        </div>
                    </fieldset>
                    {touched && validation && (
                        <FieldError id="export-date-error" role="alert">
                            {validation}
                        </FieldError>
                    )}
                    {error && <FieldError role="alert">{error}</FieldError>}
                    {error &&
                        preset === "all" &&
                        !allTimeLoaded &&
                        !loadingRange && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void choosePreset("all")}
                            >
                                Retry loading dates
                            </Button>
                        )}
                    <p className="text-xs text-muted-foreground">
                        {filtered
                            ? "Your search and other transaction filters still apply. "
                            : "All wallets and transaction types are included. "}
                        Both dates are included.
                    </p>
                    <DialogFooter>
                        <DialogClose
                            render={<Button type="button" variant="outline" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={
                                pending ||
                                loadingRange ||
                                !!validation ||
                                (preset === "all" && !allTimeLoaded)
                            }
                        >
                            {pending ? (
                                <LoaderCircle
                                    className="animate-spin"
                                    data-icon="inline-start"
                                />
                            ) : (
                                <Download data-icon="inline-start" />
                            )}
                            {pending ? "Preparing CSV…" : "Download CSV"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
