import { validDay } from "./account-period.ts"
import { shiftMonth } from "./expense-spread.ts"

export const budgetCadences = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const
export type BudgetCadence = (typeof budgetCadences)[number]
export const budgetCadenceLabels: Record<BudgetCadence, string> = {
    DAILY: "Daily",
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    YEARLY: "Yearly",
}
export function isBudgetCadence(value: unknown): value is BudgetCadence {
    return budgetCadences.includes(value as BudgetCadence)
}
export function validBudgetDay(value: string) {
    return validDay(value) && value >= "1900-01-01" && value <= "9998-12-31"
}
const day = (date: Date) => date.toISOString().slice(0, 10)
function addDays(value: string, days: number) {
    const date = new Date(`${value}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + days)
    return day(date)
}
export function budgetPeriod(cadence: BudgetCadence, value: string) {
    if (!validBudgetDay(value)) throw new Error("Invalid budget date")
    let from = value,
        until = addDays(value, 1)
    if (cadence === "WEEKLY") {
        const weekday = new Date(`${value}T00:00:00Z`).getUTCDay()
        from = addDays(value, -((weekday + 6) % 7))
        until = addDays(from, 7)
    } else if (cadence === "MONTHLY") {
        from = `${value.slice(0, 7)}-01`
        until = `${shiftMonth(value.slice(0, 7), 1)}-01`
    } else if (cadence === "YEARLY") {
        from = `${value.slice(0, 4)}-01-01`
        until = `${Number(value.slice(0, 4)) + 1}-01-01`
    }
    const format = (date: string, options: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat("en", { timeZone: "UTC", ...options }).format(
            new Date(`${date}T00:00:00Z`)
        )
    const weekEnd = addDays(until, -1)
    const number = (date: string) => String(Number(date.slice(8, 10)))
    const month = (date: string) => format(date, { month: "short" })
    const weeklyLabel =
        from.slice(0, 7) === weekEnd.slice(0, 7)
            ? `${number(from)}–${number(weekEnd)} ${month(from)} ${from.slice(0, 4)}`
            : from.slice(0, 4) === weekEnd.slice(0, 4)
              ? `${number(from)} ${month(from)}–${number(weekEnd)} ${month(weekEnd)} ${from.slice(0, 4)}`
              : `${number(from)} ${month(from)} ${from.slice(0, 4)}–${number(weekEnd)} ${month(weekEnd)} ${weekEnd.slice(0, 4)}`
    const label =
        cadence === "YEARLY"
            ? from.slice(0, 4)
            : cadence === "MONTHLY"
              ? format(from, { month: "long", year: "numeric" })
              : cadence === "WEEKLY"
                ? weeklyLabel
                : format(from, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                  })
    return { from, until, label }
}
export function moveBudgetPeriod(
    cadence: BudgetCadence,
    value: string,
    direction: number
) {
    const { from } = budgetPeriod(cadence, value)
    const next =
        cadence === "MONTHLY"
            ? `${shiftMonth(from.slice(0, 7), direction)}-01`
            : cadence === "YEARLY"
              ? `${Number(from.slice(0, 4)) + direction}-01-01`
              : addDays(from, direction * (cadence === "WEEKLY" ? 7 : 1))
    return validBudgetDay(next) ? next : null
}
export function budgetPeriodKey(cadence: BudgetCadence) {
    return cadence.toLowerCase()
}
