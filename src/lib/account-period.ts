import { validMonth, shiftMonth } from "./expense-spread.ts"
import type { TransactionQuery } from "./transaction-filters.ts"

export type AccountPeriod = {
    view: "month" | "year" | "custom" | "all"
    month: string
    year: string
    from: string
    to: string
    label: string
    notice?: string
}
export function validDay(value: string) {
    if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00Z`)
    return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    )
}
export function nextDay(value: string) {
    const date = new Date(`${value}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + 1)
    return date
}
export function periodForMonth(month: string): AccountPeriod {
    const from = `${month}-01`
    const end = new Date(`${shiftMonth(month, 1)}-01T00:00:00Z`)
    end.setUTCDate(end.getUTCDate() - 1)
    return {
        view: "month",
        month,
        year: month.slice(0, 4),
        from,
        to: end.toISOString().slice(0, 10),
        label: new Intl.DateTimeFormat("en", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
        }).format(new Date(`${from}T00:00:00Z`)),
    }
}
export function resolveAccountPeriod(
    query: TransactionQuery,
    today: string
): AccountPeriod {
    const value = (key: string) =>
        typeof query[key] === "string" ? (query[key] as string) : ""
    const fallback = periodForMonth(today.slice(0, 7))
    const view =
        value("view") || (value("from") || value("to") ? "custom" : "month")
    if (view === "all")
        return { ...fallback, view, from: "", to: "", label: "All time" }
    if (view === "custom") {
        const from = value("from"),
            to = value("to")
        if (
            validDay(from) &&
            validDay(to) &&
            from <= to &&
            from >= "0002-01-01" &&
            to <= "9998-12-31"
        )
            return {
                ...fallback,
                view,
                month: from.slice(0, 7),
                year: from.slice(0, 4),
                from,
                to,
                label: `${from} – ${to}`,
            }
        return {
            ...fallback,
            notice: "Choose a valid start and end date. Showing the current month.",
        }
    }
    if (view === "year") {
        const year = value("year") || today.slice(0, 4)
        if (/^\d{4}$/.test(year) && year >= "0002" && year <= "9998")
            return {
                ...fallback,
                view,
                year,
                from: `${year}-01-01`,
                to: `${year}-12-31`,
                label: year,
            }
        return {
            ...fallback,
            notice: "Choose a valid year. Showing the current month.",
        }
    }
    const month = value("month") || fallback.month
    if (validMonth(month) && month >= "0002-01" && month <= "9998-12")
        return periodForMonth(month)
    return {
        ...fallback,
        notice: "Choose a valid month. Showing the current month.",
    }
}
export function periodQuery(period: AccountPeriod): Record<string, string> {
    if (period.view === "all") return { view: "all" }
    return period.view === "month"
        ? { view: "month", month: period.month }
        : period.view === "year"
          ? { view: "year", year: period.year }
          : { view: "custom", from: period.from, to: period.to }
}
export function adjacentPeriod(
    period: AccountPeriod,
    offset: number
): Record<string, string> | null {
    if (period.view === "custom" || period.view === "all") return null
    if (period.view === "month") {
        const month = shiftMonth(period.month, offset)
        return validMonth(month) && month >= "0002-01" && month <= "9998-12"
            ? { view: "month", month }
            : null
    }
    const year = String(Number(period.year) + offset).padStart(4, "0")
    return year >= "0002" && year <= "9998" ? { view: "year", year } : null
}

/** Keep the chosen period when moving between account views, without carrying filters. */
export function accountViewSearch(
    query: Pick<URLSearchParams, "get">,
    overview = false
) {
    const params = new URLSearchParams()
    if (query.get("view") === "all") return "?view=all"
    if (overview) {
        const month =
            query.get("month") ||
            (query.get("view") === "custom"
                ? query.get("from")?.slice(0, 7)
                : query.get("year")
                  ? `${query.get("year")}-01`
                  : "")
        if (month && validMonth(month)) params.set("month", month)
    } else {
        for (const key of ["view", "month", "year", "from", "to"]) {
            const value = query.get(key)
            if (value) params.set(key, value)
        }
    }
    return params.size ? `?${params}` : ""
}
