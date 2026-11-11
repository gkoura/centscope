import {
    centsMoney,
    moneyCents,
    monthlyShare,
    shiftMonth,
    type ExpenseSpread,
} from "./expense-spread.ts"
export type BudgetMode = "actual" | "smoothed"
export type AllocationPart = {
    month: string
    monthlyAmount: string
    contribution: string
    from: string
    until: string
}

/** Smoothed months match Analytics; partial months distribute remainder cents to earlier days. */
export function budgetContribution(
    amount: string,
    paidOn: string,
    spread: ExpenseSpread | null,
    period: { from: string; until: string },
    mode: BudgetMode
): { amount: string; allocations: AllocationPart[] } {
    if (mode === "actual" || !spread)
        return {
            amount:
                paidOn >= period.from && paidOn < period.until
                    ? amount
                    : "0.00",
            allocations: [],
        }
    let sum = BigInt(0)
    const allocations: AllocationPart[] = []
    for (let offset = 0; offset < spread.monthCount; offset++) {
        const month = shiftMonth(spread.startMonth, offset),
            start = `${month}-01`,
            end = `${shiftMonth(month, 1)}-01`
        if (start >= period.until || end <= period.from) continue
        const from = start > period.from ? start : period.from,
            until = end < period.until ? end : period.until
        const total = moneyCents(monthlyShare(amount, spread, month))
        const days = Math.round(
            (Date.parse(`${end}T00:00:00Z`) -
                Date.parse(`${start}T00:00:00Z`)) /
                86400000
        )
        const first = Math.round(
            (Date.parse(`${from}T00:00:00Z`) -
                Date.parse(`${start}T00:00:00Z`)) /
                86400000
        )
        const last = Math.round(
            (Date.parse(`${until}T00:00:00Z`) -
                Date.parse(`${start}T00:00:00Z`)) /
                86400000
        )
        const remainder = Number(total % BigInt(days))
        const cents =
            (total / BigInt(days)) * BigInt(last - first) +
            BigInt(
                Math.max(
                    0,
                    Math.min(last, remainder) - Math.min(first, remainder)
                )
            )
        if (cents > BigInt(0))
            allocations.push({
                month,
                monthlyAmount: centsMoney(total),
                contribution: centsMoney(cents),
                from,
                until,
            })
        sum += cents
    }
    return { amount: centsMoney(sum), allocations }
}
