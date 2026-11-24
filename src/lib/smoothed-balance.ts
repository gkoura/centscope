import {
    centsMoney,
    moneyCents,
    shiftMonth,
    type ExpenseSpread,
} from "./expense-spread.ts"
import { trendMonths } from "./monthly-trends.ts"

export type BalanceEntry = {
    type: string
    status: string
    amount: string
    currency: string
    date: string
    spread: ExpenseSpread | null
}
const monthIndex = (month: string) =>
    Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1

export const BALANCE_HISTORY_MONTHS = 11

/** Expense schedules replace the cash payment, while other posted movements retain their date. */
export function smoothedBalanceHistory(
    entries: BalanceEntry[],
    endMonth: string,
    currencies: string[],
    startMonth = shiftMonth(endMonth, 1 - BALANCE_HISTORY_MONTHS)
) {
    const months = trendMonths(endMonth, startMonth)
    return [...new Set(currencies)].map((currency) => ({
        currency,
        points: months.map((month) => {
            let balance = BigInt(0)
            for (const entry of entries) {
                if (entry.currency !== currency || entry.status !== "POSTED")
                    continue
                const amount = moneyCents(entry.amount)
                if (entry.type === "EXPENSE" && entry.spread) {
                    const elapsed = Math.max(
                        0,
                        Math.min(
                            entry.spread.monthCount,
                            monthIndex(month) -
                                monthIndex(entry.spread.startMonth) +
                                1
                        )
                    )
                    const total = amount < BigInt(0) ? -amount : amount
                    const count = BigInt(entry.spread.monthCount),
                        elapsedCount = BigInt(elapsed),
                        remainder = total % count
                    balance -=
                        (total / count) * elapsedCount +
                        (elapsedCount < remainder ? elapsedCount : remainder)
                } else if (entry.date.slice(0, 7) <= month) balance += amount
            }
            return { month, balance: centsMoney(balance) }
        }),
    }))
}
