export type TransactionQuery = Record<string, string | string[] | undefined>
export type TransactionFilters = {
    q?: string
    type?: "EXPENSE" | "INCOME" | "OPENING_BALANCE"
    status?: "POSTED" | "PENDING"
    wallet?: string
    category?: string
    from?: string
    to?: string
}

export function parseTransactionFilters(
    query: TransactionQuery
): TransactionFilters {
    const get = (key: string, limit = 128) =>
        typeof query[key] === "string"
            ? query[key].trim().slice(0, limit)
            : undefined
    const date = (key: string) => {
        const value = get(key, 10)
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
        const parsed = new Date(`${value}T00:00:00.000Z`)
        return Number.isFinite(parsed.getTime()) &&
            parsed.getUTCFullYear() > 0 &&
            parsed.toISOString().slice(0, 10) === value
            ? value
            : undefined
    }
    const type = get("type"),
        status = get("status")
    return {
        q: get("q", 120),
        type:
            type === "EXPENSE" ||
            type === "INCOME" ||
            type === "OPENING_BALANCE"
                ? type
                : undefined,
        status:
            status === "POSTED" || status === "PENDING" ? status : undefined,
        wallet: get("wallet"),
        category: get("category"),
        from: date("from"),
        to: date("to"),
    }
}
