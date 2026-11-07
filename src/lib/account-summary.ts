import { moneyCents, centsMoney } from "./expense-spread.ts"
export type ActivityEntry = {
    transactionId: string
    type: string
    status: string
    amount: string
    walletId: string
    walletName: string
    currency: string
    category: string | null
    parentCategory?: string | null
}
export function summarizeActivity(
    entries: ActivityEntry[],
    status: "POSTED" | "PENDING" = "POSTED"
) {
    const currencies = new Map<
        string,
        { income: bigint; expenses: bigint; pending: bigint }
    >()
    const wallets = new Map<
        string,
        { name: string; currency: string; income: bigint; expenses: bigint }
    >()
    const categories = new Map<
        string,
        { name: string; currency: string; amount: bigint }
    >()
    const incomeCategories = new Map<
        string,
        { name: string; currency: string; amount: bigint }
    >()
    const ids = new Set<string>(),
        pendingIds = new Set<string>()
    for (const entry of entries) {
        ids.add(entry.transactionId)
        if (entry.status === "PENDING") pendingIds.add(entry.transactionId)
        const total = currencies.get(entry.currency) ?? {
            income: BigInt(0),
            expenses: BigInt(0),
            pending: BigInt(0),
        }
        const wallet = wallets.get(entry.walletId) ?? {
            name: entry.walletName,
            currency: entry.currency,
            income: BigInt(0),
            expenses: BigInt(0),
        }
        const amount = moneyCents(entry.amount)
        if (entry.type === "INCOME" || entry.type === "EXPENSE") {
            if (entry.status === "PENDING") total.pending += amount
            if (entry.status === status && entry.type === "INCOME") {
                total.income += amount
                wallet.income += amount
            } else if (entry.status === status && entry.type === "EXPENSE") {
                total.expenses -= amount
                wallet.expenses -= amount
            }
            if (entry.status === status) {
                const categoryTotals =
                    entry.type === "INCOME" ? incomeCategories : categories
                const name =
                        entry.parentCategory ??
                        entry.category ??
                        "Uncategorized",
                    key = JSON.stringify([entry.currency, name])
                const category = categoryTotals.get(key) ?? {
                    name,
                    currency: entry.currency,
                    amount: BigInt(0),
                }
                category.amount += entry.type === "INCOME" ? amount : -amount
                categoryTotals.set(key, category)
            }
        }
        currencies.set(entry.currency, total)
        wallets.set(entry.walletId, wallet)
    }
    return {
        count: ids.size,
        pendingCount: pendingIds.size,
        postedCount: ids.size - pendingIds.size,
        status,
        currencies: [...currencies].map(([currency, total]) => ({
            currency,
            income: centsMoney(total.income),
            expenses: centsMoney(total.expenses),
            net: centsMoney(total.income - total.expenses),
            pending: centsMoney(total.pending),
        })),
        wallets: [...wallets].map(([id, wallet]) => ({
            id,
            name: wallet.name,
            currency: wallet.currency,
            income: centsMoney(wallet.income),
            expenses: centsMoney(wallet.expenses),
        })),
        categories: [...categories.values()]
            .sort((a, b) =>
                a.amount > b.amount
                    ? -1
                    : a.amount < b.amount
                      ? 1
                      : a.name.localeCompare(b.name)
            )
            .map((item) => ({ ...item, amount: centsMoney(item.amount) })),
        incomeCategories: [...incomeCategories.values()]
            .sort((a, b) =>
                a.amount > b.amount
                    ? -1
                    : a.amount < b.amount
                      ? 1
                      : a.name.localeCompare(b.name)
            )
            .map((item) => ({ ...item, amount: centsMoney(item.amount) })),
    }
}
export function balanceTotals(
    wallets: { currency: string; balance: string }[]
) {
    const totals = new Map<string, bigint>()
    for (const wallet of wallets)
        totals.set(
            wallet.currency,
            (totals.get(wallet.currency) ?? BigInt(0)) +
                moneyCents(wallet.balance)
        )
    return [...totals].map(([currency, amount]) => ({
        currency,
        amount: centsMoney(amount),
    }))
}
