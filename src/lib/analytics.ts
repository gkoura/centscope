import type { TransactionQuery } from "./transaction-filters.ts"
import { moneyCents } from "./expense-spread.ts"

// Analytics follows the selected period, never hidden transaction-list filters.
export function analyticsPeriodInput(
    query: TransactionQuery
): TransactionQuery {
    if (query.view === "all") return { view: "all" }
    return Object.fromEntries(
        ["view", "month", "year", "from", "to"]
            .filter((key) => typeof query[key] === "string")
            .map((key) => [key, query[key]])
    )
}

export function categorySpendingGroups(
    categories: { name: string; currency: string; amount: string }[]
) {
    return [...new Set(categories.map((category) => category.currency))].map(
        (currency) => {
            const items = categories.filter(
                (category) => category.currency === currency
            )
            const total = items.reduce(
                (sum, item) => sum + moneyCents(item.amount),
                BigInt(0)
            )
            return {
                currency,
                categories: items.map((item) => ({
                    ...item,
                    // Only the bounded percentage becomes a Number; money stays exact.
                    percentage:
                        total > BigInt(0)
                            ? Number(
                                  (moneyCents(item.amount) * BigInt(10000) +
                                      total / BigInt(2)) /
                                      total
                              ) / 100
                            : 0,
                })),
            }
        }
    )
}
