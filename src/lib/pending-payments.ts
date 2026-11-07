import { centsMoney, moneyCents } from "./expense-spread.ts"

export type PendingPayment = {
    id: string
    transactionId: string
    name: string
    date: string
    amount: string
    currency: string
    walletName: string
    recurring: boolean
}

export function paymentDue(date: string, today: string) {
    const days = Math.round(
        (new Date(`${date}T00:00:00Z`).getTime() -
            new Date(`${today}T00:00:00Z`).getTime()) /
            86_400_000
    )
    return days < 0
        ? {
              state: "overdue" as const,
              label: `${-days} ${days === -1 ? "day" : "days"} overdue`,
          }
        : days === 0
          ? { state: "today" as const, label: "Due today" }
          : days === 1
            ? { state: "upcoming" as const, label: "Due tomorrow" }
            : { state: "upcoming" as const, label: `Due in ${days} days` }
}

export function summarizePendingPayments(
    payments: PendingPayment[],
    today: string
) {
    const sorted = [...payments].sort(
        (a, b) =>
            a.date.localeCompare(b.date) ||
            a.name.localeCompare(b.name) ||
            a.id.localeCompare(b.id)
    )
    const amounts = new Map<string, bigint>()
    let overdue = 0,
        dueToday = 0
    for (const payment of sorted) {
        if (payment.date < today) overdue++
        else if (payment.date === today) dueToday++
        const amount = moneyCents(payment.amount)
        amounts.set(
            payment.currency,
            (amounts.get(payment.currency) ?? BigInt(0)) +
                (amount < BigInt(0) ? -amount : amount)
        )
    }
    return {
        count: sorted.length,
        overdue,
        dueToday,
        totals: [...amounts].map(([currency, amount]) => ({
            currency,
            amount: centsMoney(amount),
        })),
        items: sorted
            .slice(0, 6)
            .map((item) => ({ ...item, due: paymentDue(item.date, today) })),
        from: sorted[0]?.date,
        to: sorted.at(-1)?.date,
    }
}

export function pendingPaymentsHref(
    accountId: string,
    range: { from?: string; to?: string }
) {
    const query = new URLSearchParams({ status: "PENDING", type: "EXPENSE" })
    if (range.from && range.to) {
        query.set("view", "custom")
        query.set("from", range.from)
        query.set("to", range.to)
    }
    return `/dashboard/accounts/${accountId}/transactions?${query}`
}
