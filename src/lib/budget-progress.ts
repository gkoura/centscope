import {
    matchesCategorySelection,
    type CategorySelection,
} from "./category-selection.ts"
import { moneyCents, centsMoney } from "./expense-spread.ts"
import { type BudgetSpendingGroup } from "./budget-input.ts"

/** Calculate each overlapping limit independently, without currency conversion. */
export function budgetProgress(
    limit: string,
    currency: string,
    categorySelection: CategorySelection,
    groups: BudgetSpendingGroup[]
) {
    const ceiling = moneyCents(limit)
    if (ceiling <= BigInt(0)) throw new Error("Budget limit must be positive")
    const spent = groups.reduce(
        (sum, entry) =>
            entry.currency === currency &&
            matchesCategorySelection(
                categorySelection,
                entry.categoryId,
                entry.parentId
            )
                ? sum - moneyCents(entry.amount)
                : sum,
        BigInt(0)
    )
    return {
        spent: centsMoney(spent),
        remaining: centsMoney(ceiling - spent),
        percentage: Number((spent * BigInt(10000)) / ceiling) / 100,
    }
}
