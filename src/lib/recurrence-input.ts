export type RepeatInput = {
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
    interval: number
    timezone: string
    endsOn: string | null
    endAfter: number | null
    occurrenceStatus: "PENDING"
}
export type EditScope = "ONLY" | "FUTURE" | "ALL"
export function validDate(value: string): boolean {
    const date = new Date(`${value}T00:00:00.000Z`)
    return (
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !value.startsWith("0000") &&
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    )
}
export function validRepeat(value: RepeatInput, start: string): boolean {
    try {
        new Intl.DateTimeFormat("en", { timeZone: value.timezone }).format()
    } catch {
        return false
    }
    return (
        ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(value.frequency) &&
        Number.isInteger(value.interval) &&
        value.interval >= 1 &&
        value.interval <= 120 &&
        value.occurrenceStatus === "PENDING" &&
        (value.endsOn === null ||
            (validDate(value.endsOn) && value.endsOn >= start)) &&
        (value.endAfter === null ||
            (Number.isInteger(value.endAfter) &&
                value.endAfter >= 1 &&
                value.endAfter <= 10000 &&
                scheduleDate(
                    start,
                    value.frequency,
                    value.interval,
                    value.endAfter - 1
                ) !== null)) &&
        (!value.endsOn ||
            firstIndexAfter(start, value, value.endsOn) <= 10000) &&
        !(value.endsOn && value.endAfter !== null)
    )
}
export function readRepeat(form: FormData): RepeatInput | null {
    if (form.get("repeatEnabled") !== "on") return null
    const get = (key: string) => String(form.get(key) ?? "").trim()
    const end = get("repeatEnd")
    return {
        frequency: get("repeatFrequency") as RepeatInput["frequency"],
        interval: Number(get("repeatInterval")),
        timezone: get("repeatTimezone"),
        endsOn:
            end === "date"
                ? get("repeatEndsOn")
                : end === "never" || end === "count"
                  ? null
                  : "",
        endAfter: end === "count" ? Number(get("repeatEndAfter")) : null,
        occurrenceStatus: "PENDING",
    }
}
export function scheduleDate(
    start: string,
    frequency: RepeatInput["frequency"],
    interval: number,
    index: number
): string | null {
    const original = new Date(`${start}T00:00:00.000Z`)
    if (frequency === "DAILY" || frequency === "WEEKLY")
        original.setUTCDate(
            original.getUTCDate() +
                index * interval * (frequency === "WEEKLY" ? 7 : 1)
        )
    else {
        const day = original.getUTCDate()
        original.setUTCDate(1)
        original.setUTCMonth(
            original.getUTCMonth() +
                index * interval * (frequency === "YEARLY" ? 12 : 1)
        )
        const last = new Date(original)
        last.setUTCMonth(last.getUTCMonth() + 1)
        last.setUTCDate(0)
        original.setUTCDate(Math.min(day, last.getUTCDate()))
    }
    return Number.isFinite(original.getTime()) &&
        original.getUTCFullYear() <= 9999
        ? original.toISOString().slice(0, 10)
        : null
}
export function localToday(timezone: string, now = new Date()): string {
    const parts = new Intl.DateTimeFormat("en", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now)
    const part = (type: string) => parts.find((p) => p.type === type)!.value
    return `${part("year")}-${part("month")}-${part("day")}`
}
export function nextSlot(
    start: string,
    rule: RepeatInput,
    index: number
): string | null {
    if (rule.endAfter !== null && index >= rule.endAfter) return null
    const date = scheduleDate(start, rule.frequency, rule.interval, index)
    return date && (!rule.endsOn || date <= rule.endsOn) ? date : null
}

// Binary search avoids scanning years of past dates when editing a cadence.
export function firstIndexAfter(
    start: string,
    settings: RepeatInput,
    threshold: string
): number {
    let low = 1,
        high = 4_000_000
    while (low < high) {
        const middle = Math.floor((low + high) / 2)
        const date = scheduleDate(
            start,
            settings.frequency,
            settings.interval,
            middle
        )
        if (date && date <= threshold) low = middle + 1
        else high = middle
    }
    return low
}

// Finite schedules materialize completely; endless schedules keep a rolling year.
export function creationHorizon(
    start: string,
    settings: RepeatInput,
    today: string
): string {
    if (settings.endsOn) return settings.endsOn
    if (settings.endAfter !== null)
        return (
            scheduleDate(
                start,
                settings.frequency,
                settings.interval,
                settings.endAfter - 1
            ) ?? "9999-12-31"
        )
    const anchor = start > today ? start : today
    return scheduleDate(anchor, "YEARLY", 1, 1) ?? "9999-12-31"
}
