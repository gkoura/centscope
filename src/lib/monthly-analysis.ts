import {
    centsMoney,
    moneyCents,
    monthlyShare,
    type ExpenseSpread,
} from "./expense-spread.ts"

export type AnalysisExpense = {
    id: string
    name: string
    amount: string
    date: string
    currency: string
    category: string
    walletName: string
    spread: ExpenseSpread | null
}
export function analyzeMonth(
    expenses: AnalysisExpense[],
    month: string,
    mode: "smoothed" | "actual",
    today: string
) {
    let total = BigInt(0),
        planned = BigInt(0)
    const categories = new Map<string, bigint>()
    const rows: (AnalysisExpense & {
        share: string
        planned: boolean
        allocated: boolean
    })[] = []
    for (const expense of expenses) {
        const allocated = mode === "smoothed" && Boolean(expense.spread)
        const share = allocated
            ? monthlyShare(expense.amount, expense.spread!, month)
            : expense.date.slice(0, 7) === month
              ? expense.amount
              : "0.00"
        const cents = moneyCents(share)
        if (cents === BigInt(0)) continue
        const isPlanned = month > today.slice(0, 7) || expense.date > today
        if (isPlanned) planned += cents
        else {
            total += cents
            categories.set(
                expense.category,
                (categories.get(expense.category) ?? BigInt(0)) + cents
            )
        }
        rows.push({ ...expense, share, planned: isPlanned, allocated })
    }
    return {
        total: centsMoney(total),
        planned: centsMoney(planned),
        rows,
        categories: [...categories]
            .sort((a, b) =>
                a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : a[0].localeCompare(b[0])
            )
            .map(([name, amount]) => ({ name, amount: centsMoney(amount) })),
    }
}
