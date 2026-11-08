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
export function trendMonths(
    endMonth: string,
    startMonth = shiftMonth(endMonth, -11)
) {
    const length =
        (Number(endMonth.slice(0, 4)) - Number(startMonth.slice(0, 4))) * 12 +
        Number(endMonth.slice(5)) -
        Number(startMonth.slice(5)) +
        1
    return Array.from({ length: Math.max(0, length) }, (_, index) =>
        shiftMonth(startMonth, index)
    )
}
/** Both payment months and allocated months belong in an all-time comparison. */
export function trendBounds(entries: TrendEntry[], fallback: string) {
    let startMonth: string | undefined, endMonth: string | undefined
    for (const entry of entries) {
        const months = [entry.month]
        if (entry.type === "EXPENSE" && entry.spread)
            months.push(
                entry.spread.startMonth,
                shiftMonth(entry.spread.startMonth, entry.spread.monthCount - 1)
            )
        for (const month of months) {
            if (!startMonth || month < startMonth) startMonth = month
            if (!endMonth || month > endMonth) endMonth = month
        }
    }
    return {
        startMonth: startMonth ?? fallback,
        endMonth: endMonth ?? fallback,
    }
}

/** Rolling comparisons use complete months so a partial current month cannot distort the trend. */
export function trendEndMonth(range: string, today: string) {
    return range === "rolling"
        ? shiftMonth(today.slice(0, 7), -1)
        : `${range}-12`
}

/** Keep exact cents throughout allocation and aggregation; chart coordinates alone use numbers. */
export function monthlyTrendBuckets(
    entries: TrendEntry[],
    endMonth: string,
    startMonth = shiftMonth(endMonth, -11)
): TrendBucket[] {
    const buckets = new Map<string, TrendBucket>()
    for (const entry of entries) {
        const amount = moneyCents(entry.amount)
        const absolute = centsMoney(amount < BigInt(0) ? -amount : amount)
        // Visit only the payment and at most 120 allocated months per entry,
        // rather than rescanning the entire account lifetime for every payment.
        const months = new Set([entry.month])
        if (entry.type === "EXPENSE" && entry.spread)
            for (let index = 0; index < entry.spread.monthCount; index++)
                months.add(shiftMonth(entry.spread.startMonth, index))
        for (const month of months) {
            if (month < startMonth || month > endMonth) continue
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
    selectedIds: string[] | null,
    startMonth = shiftMonth(endMonth, -11)
) {
    const selected = selectedIds === null ? null : new Set(selectedIds)
    const totals = new Map<string, bigint>()
    for (const bucket of buckets) {
        if (
            bucket.month < startMonth ||
            bucket.month > endMonth ||
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
    const points = trendMonths(endMonth, startMonth).map((month) => ({
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
        average: centsMoney(
            (total + BigInt(Math.floor(points.length / 2))) /
                BigInt(Math.max(1, points.length))
        ),
    }
}
