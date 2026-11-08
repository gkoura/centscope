import { periodForMonth, validDay } from "./account-period.ts"
import { shiftMonth } from "./expense-spread.ts"
import type { TransactionFilters } from "./transaction-filters.ts"

export type ExportRange = { from: string; to: string }
export type ExportPreset = "month" | "last-month" | "year" | "all" | "custom"
export function exportRangeError({ from, to }: ExportRange) {
    if (!validDay(from) || !validDay(to))
        return "Enter both dates as YYYY-MM-DD, or select them on the calendar."
    if (from < "0002-01-01" || to > "9998-12-31")
        return "Choose dates between years 0002 and 9998."
    if (from > to) return "The end date must be on or after the start date."
    return null
}
export function exportPresetRange(
    preset: Exclude<ExportPreset, "custom" | "all">,
    today: string
): ExportRange {
    if (preset === "year")
        return {
            from: `${today.slice(0, 4)}-01-01`,
            to: `${today.slice(0, 4)}-12-31`,
        }
    const month =
        preset === "last-month"
            ? shiftMonth(today.slice(0, 7), -1)
            : today.slice(0, 7)
    const { from, to } = periodForMonth(month)
    return { from, to }
}
/** Export owns its dates; never carry the page's period or pagination. */
export function exportSearch(
    filters: TransactionFilters,
    range: ExportRange | "all"
) {
    const search = new URLSearchParams(
        range === "all" ? { period: "all" } : range
    )
    for (const key of ["q", "wallet", "category", "type", "status"] as const) {
        if (filters[key]) search.set(key, filters[key])
    }
    return search
}
