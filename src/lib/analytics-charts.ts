import { centsMoney, moneyCents, shiftMonth } from "./expense-spread.ts"
import {
    trendMonths,
    UNCATEGORIZED,
    type TrendBucket,
    type TrendCategory,
} from "./monthly-trends.ts"
import { budgetPeriod, type BudgetCadence } from "./budget-period.ts"
import { budgetContribution, type BudgetMode } from "./budget-contribution.ts"
import {
    matchesCategorySelection,
    type CategorySelection,
} from "./category-selection.ts"

export function categorySpending(
    buckets: TrendBucket[],
    categories: TrendCategory[],
    endMonth: string,
    currency: string,
    mode: BudgetMode
) {
    const expenses = categories.filter((c) => c.type === "EXPENSE")
    const byId = new Map(expenses.map((c) => [c.id, c]))
    const groupId = (id: string) => byId.get(id)?.parentId ?? id
    const groups = [
        ...new Set([...expenses.map((c) => groupId(c.id)), UNCATEGORIZED]),
    ].map((id, index) => ({
        id,
        key: `category${index}`,
        name: byId.get(id)?.name ?? "Uncategorized",
        color: `var(--chart-${(index % 5) + 1})`,
    }))
    const points = trendMonths(endMonth).map((month) => {
        const amounts: Record<string, string> = {}
        const breakdown: Record<
            string,
            { id: string; name: string; amount: string }[]
        > = {}
        for (const group of groups) {
            const children = new Map<string, bigint>()
            for (const bucket of buckets) {
                if (
                    bucket.type !== "EXPENSE" ||
                    bucket.currency !== currency ||
                    bucket.month !== month ||
                    groupId(bucket.categoryId) !== group.id
                )
                    continue
                children.set(
                    bucket.categoryId,
                    (children.get(bucket.categoryId) ?? BigInt(0)) +
                        moneyCents(bucket[mode])
                )
            }
            breakdown[group.key] = [...children].map(([id, amount]) => ({
                id,
                name:
                    id === group.id && id !== UNCATEGORIZED
                        ? "Direct category spending"
                        : (byId.get(id)?.name ?? "Uncategorized"),
                amount: centsMoney(amount),
            }))
            amounts[group.key] = centsMoney(
                [...children.values()].reduce((a, b) => a + b, BigInt(0))
            )
        }
        return {
            month,
            amounts,
            breakdown,
            total: centsMoney(
                Object.values(amounts).reduce(
                    (sum, a) => sum + moneyCents(a),
                    BigInt(0)
                )
            ),
            ...Object.fromEntries(
                Object.entries(amounts).map(([key, a]) => [key, Number(a)])
            ),
        }
    })
    return { groups, points }
}
export type ChartBudget = {
    id: string
    name: string
    currency: string
    recurrence: BudgetCadence
    spendingLimit: string
    categorySelection: CategorySelection
    categoryLabel?: string
}
export type BudgetChartEntry = {
    amount: string
    paidOn: string
    categoryId: string | null
    parentId: string | null
    currency: string
    spread: { startMonth: string; monthCount: number } | null
}
const days = (from: string, until: string) =>
    Math.round(
        (Date.parse(until + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) /
            86400000
    )
/** Allocate a repeating limit without inventing historical definitions. Keep remainder cents in earlier months/days. */
export function monthlyBudgetAmount(plan: ChartBudget, month: string) {
    const limit = moneyCents(plan.spendingLimit)
    if (plan.recurrence === "MONTHLY") return plan.spendingLimit
    if (plan.recurrence === "YEARLY")
        return centsMoney(
            limit / BigInt(12) +
                (BigInt(Number(month.slice(5)) - 1) < limit % BigInt(12)
                    ? BigInt(1)
                    : BigInt(0))
        )
    const from = month + "-01",
        until = shiftMonth(month, 1) + "-01"
    let sum = BigInt(0)
    for (let cursor = from; cursor < until;) {
        const period = budgetPeriod(plan.recurrence, cursor)
        const end = period.until < until ? period.until : until
        const length = days(period.from, period.until),
            first = days(period.from, cursor),
            last = days(period.from, end)
        const remainder = Number(limit % BigInt(length))
        sum +=
            (limit / BigInt(length)) * BigInt(last - first) +
            BigInt(
                Math.max(
                    0,
                    Math.min(last, remainder) - Math.min(first, remainder)
                )
            )
        cursor = end
    }
    return centsMoney(sum)
}
export function budgetComparison(
    plans: ChartBudget[],
    entries: BudgetChartEntry[],
    endMonth: string,
    mode: BudgetMode
) {
    return plans.map((plan) => ({
        ...plan,
        points: trendMonths(endMonth).map((month) => {
            const period = {
                from: month + "-01",
                until: shiftMonth(month, 1) + "-01",
            }
            const spent = entries.reduce(
                (sum, entry) =>
                    entry.currency === plan.currency &&
                    matchesCategorySelection(
                        plan.categorySelection,
                        entry.categoryId,
                        entry.parentId
                    )
                        ? sum +
                          moneyCents(
                              budgetContribution(
                                  entry.amount,
                                  entry.paidOn,
                                  entry.spread,
                                  period,
                                  mode
                              ).amount
                          )
                        : sum,
                BigInt(0)
            )
            const budget = monthlyBudgetAmount(plan, month)
            return {
                month,
                spent: centsMoney(spent),
                budget,
                remaining: centsMoney(moneyCents(budget) - spent),
            }
        }),
    }))
}
