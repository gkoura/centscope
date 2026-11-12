import { centsMoney, moneyCents } from "./expense-spread.ts"

export type GroupableBudgetTransaction = {
    id: string
    paidOn: string
    contribution: string
    categoryGroup: { id: string; name: string }
    subcategory: { id: string; name: string } | null
}
/** First occurrence orders groups by their newest transaction; stable IDs keep equal labels separate. */
export function groupBudgetTransactions<T extends GroupableBudgetTransaction>(
    rows: T[]
) {
    const groups = new Map<
        string,
        {
            id: string
            name: string
            total: string
            subgroups: { id: string; name: string; total: string; rows: T[] }[]
        }
    >()
    const sorted = [...rows].sort((a, b) => b.paidOn.localeCompare(a.paidOn))
    for (const row of sorted) {
        let group = groups.get(row.categoryGroup.id)
        if (!group) {
            group = { ...row.categoryGroup, total: "0.00", subgroups: [] }
            groups.set(group.id, group)
        }
        const id = row.subcategory?.id ?? "__direct__"
        let subgroup = group.subgroups.find((s) => s.id === id)
        if (!subgroup) {
            subgroup = {
                id,
                name:
                    row.subcategory?.name ??
                    (group.id === "__uncategorized__"
                        ? "Uncategorized"
                        : "Without subcategory"),
                total: "0.00",
                rows: [],
            }
            group.subgroups.push(subgroup)
        }
        subgroup.rows.push(row)
        subgroup.total = centsMoney(
            moneyCents(subgroup.total) + moneyCents(row.contribution)
        )
        group.total = centsMoney(
            moneyCents(group.total) + moneyCents(row.contribution)
        )
    }
    return [...groups.values()]
}
