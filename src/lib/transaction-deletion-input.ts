export type DeleteScope = "ONLY" | "FUTURE" | "ALL"
export type TransactionDeletionReference = {
    financialAccountId: string
    transactionId: string
    expectedVersion: number
    scope: DeleteScope
}
export type RecurringDeletionPreview = {
    snapshot: string
    count: number
    postedCount: number
    pendingCount: number
    scheduledFor: string
    balanceChanges: {
        wallet: string
        account?: string
        currency: string
        amount: string
    }[]
}
export function validateDeletionReference(
    raw: unknown
): TransactionDeletionReference | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
    const v = raw as Record<string, unknown>
    if (
        typeof v.financialAccountId !== "string" ||
        !v.financialAccountId ||
        v.financialAccountId.length > 128 ||
        typeof v.transactionId !== "string" ||
        !v.transactionId ||
        v.transactionId.length > 128 ||
        !Number.isInteger(v.expectedVersion) ||
        Number(v.expectedVersion) < 1 ||
        Number(v.expectedVersion) > 2147483646 ||
        typeof v.scope !== "string" ||
        !["ONLY", "FUTURE", "ALL"].includes(v.scope)
    )
        return null
    return {
        financialAccountId: v.financialAccountId,
        transactionId: v.transactionId,
        expectedVersion: Number(v.expectedVersion),
        scope: v.scope as DeleteScope,
    }
}
export function validDeletionSnapshot(value: unknown): value is string {
    return typeof value === "string" && /^[a-f0-9]{64}$/.test(value)
}
