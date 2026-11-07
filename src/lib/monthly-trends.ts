import {
    centsMoney,
    moneyCents,
    monthlyShare,
    shiftMonth,
    type ExpenseSpread,
} from "./expense-spread.ts"

export type TrendCategory = {
    id: string
    name: string
    parentId: string | null
    type: string
    sortOrder: number
}
export type TrendEntry = {
    type: "INCOME" | "EXPENSE"
    amount: string
    currency: string
    month: string
    categoryId: string | null
    spread: ExpenseSpread | null
}
export type TrendBucket = {
    month: string
    currency: string
    categoryId: string
    type: "INCOME" | "EXPENSE"
    actual: string
    smoothed: string
}
export const UNCATEGORIZED = "__uncategorized__"
export const trendMonths = (endMonth: string) =>
    Array.from({ length: 12 }, (_, index) => shiftMonth(endMonth, index - 11))

/** Rolling comparisons use complete months so a partial current month cannot distort the trend. */
export function trendEndMonth(range: string, today: string) {
    return range === "rolling"
        ? shiftMonth(today.slice(0, 7), -1)
        : `${range}-12`
}

/** Keep exact cents throughout allocation and aggregation; chart coordinates alone use numbers. */
export function monthlyTrendBuckets(
    entries: TrendEntry[],
    endMonth: string
): TrendBucket[] {
    const months = trendMonths(endMonth)
    const buckets = new Map<string, TrendBucket>()
    for (const entry of entries) {
        const amount = moneyCents(entry.amount)
        const absolute = centsMoney(amount < BigInt(0) ? -amount : amount)
        for (const month of months) {
            const actual =
                entry.month === month ? moneyCents(absolute) : BigInt(0)
            const smoothed =
                entry.type === "EXPENSE" && entry.spread
                    ? moneyCents(monthlyShare(absolute, entry.spread, month))
                    : actual
            if (!actual && !smoothed) continue
            const categoryId = entry.categoryId ?? UNCATEGORIZED
            const key = JSON.stringify([
                month,
                entry.currency,
                entry.type,
                categoryId,
            ])
            const bucket = buckets.get(key) ?? {
                month,
                currency: entry.currency,
                type: entry.type,
                categoryId,
                actual: "0.00",
                smoothed: "0.00",
            }
            bucket.actual = centsMoney(moneyCents(bucket.actual) + actual)
            bucket.smoothed = centsMoney(moneyCents(bucket.smoothed) + smoothed)
            buckets.set(key, bucket)
        }
    }
    return [...buckets.values()]
}

/** Parent selection expands to exact sibling IDs, so a parent and its children never double count. */
export function categoryGroupIds(
    category: TrendCategory,
    categories: TrendCategory[]
) {
    return [
        category.id,
        ...categories
            .filter((item) => item.parentId === category.id)
            .map((item) => item.id),
    ]
}

export function monthlyTrendSeries(
    buckets: TrendBucket[],
    endMonth: string,
    type: "INCOME" | "EXPENSE",
    currency: string,
    mode: "actual" | "smoothed",
    selectedIds: string[] | null
) {
    const selected = selectedIds === null ? null : new Set(selectedIds)
    const totals = new Map<string, bigint>()
    for (const bucket of buckets) {
        if (
            bucket.type !== type ||
            bucket.currency !== currency ||
            (selected && !selected.has(bucket.categoryId))
        )
            continue
        totals.set(
            bucket.month,
            (totals.get(bucket.month) ?? BigInt(0)) +
                moneyCents(bucket[type === "INCOME" ? "actual" : mode])
        )
    }
    const points = trendMonths(endMonth).map((month) => ({
        month,
        amount: centsMoney(totals.get(month) ?? BigInt(0)),
    }))
    const total = [...totals.values()].reduce(
        (sum, value) => sum + value,
        BigInt(0)
    )
    return {
        points,
        total: centsMoney(total),
        average: centsMoney((total + BigInt(6)) / BigInt(12)),
    }
}
