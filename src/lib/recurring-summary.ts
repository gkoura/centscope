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
    >,
    t: (message: string, values?: Record<string, string | number>) => string = (
        message,
        values
    ) =>
        values
            ? message.replace(/\{(\w+)\}/g, (match, key) =>
                  String(values[key] ?? match)
              )
            : message
): string {
    const units = {
        DAILY: ["Daily", "days"],
        WEEKLY: ["Weekly", "weeks"],
        MONTHLY: ["Monthly", "months"],
        YEARLY: ["Yearly", "years"],
    } as const
    const cadence =
        rule.interval === 1
            ? t(units[rule.frequency][0])
            : t("Every {count} {unit}", {
                  count: rule.interval,
                  unit: t(units[rule.frequency][1]),
              })
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
    const end = endsOn
        ? t(" until {date}", { date: endsOn.split("-").reverse().join("/") })
        : ""
    return `${cadence}${end}${rule.paused ? t(" · Paused") : ""}`
}
