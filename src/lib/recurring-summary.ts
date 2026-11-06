import { scheduleDate, type RepeatInput } from "./recurrence-input.ts"

export type RecurringSummaryItem = {
    id: string
    name: string
    type: "EXPENSE" | "INCOME" | "TRANSFER"
    amount: string
    currency: string
    frequency: RepeatInput["frequency"]
    interval: number
    startsOn: string
    endsOn: string | null
    endAfter: number | null
    paused: boolean
}

export function recurringSummaryDescription(
    rule: Pick<
        RecurringSummaryItem,
        "frequency" | "interval" | "startsOn" | "endsOn" | "endAfter" | "paused"
    >
): string {
    const units = {
        DAILY: ["Daily", "days"],
        WEEKLY: ["Weekly", "weeks"],
        MONTHLY: ["Monthly", "months"],
        YEARLY: ["Yearly", "years"],
    } as const
    const cadence =
        rule.interval === 1
            ? units[rule.frequency][0]
            : `Every ${rule.interval} ${units[rule.frequency][1]}`
    const endsOn =
        rule.endsOn ??
        (rule.endAfter && rule.endAfter > 0
            ? scheduleDate(
                  rule.startsOn,
                  rule.frequency,
                  rule.interval,
                  rule.endAfter - 1
              )
            : null)
    const end = endsOn ? ` until ${endsOn.split("-").reverse().join("/")}` : ""
    return `${cadence}${end}${rule.paused ? " · Paused" : ""}`
}
