export type WalletDeletionReference = {
    financialAccountId: string
    accountWalletId: string
}
export type WalletDeletionInput = WalletDeletionReference & {
    expectedSnapshot: string
}
export type WalletDeletionPreview = {
    name: string
    accounts: { id: string; name: string; archived: boolean }[]
    transactionCount: number
    postedCount: number
    pendingCount: number
    openingCount: number
    expectedSnapshot: string
}
export function validateWalletDeletionReference(
    raw: unknown
): WalletDeletionReference | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
    const value = raw as Record<string, unknown>
    const id = (key: string) =>
        typeof value[key] === "string" ? value[key].trim() : ""
    const financialAccountId = id("financialAccountId"),
        accountWalletId = id("accountWalletId")
    if (
        !financialAccountId ||
        financialAccountId.length > 128 ||
        !accountWalletId ||
        accountWalletId.length > 128
    )
        return null
    return { financialAccountId, accountWalletId }
}
export function validateWalletDeletionInput(
    raw: unknown
): WalletDeletionInput | null {
    const reference = validateWalletDeletionReference(raw)
    if (!reference) return null
    const expectedSnapshot = (raw as Record<string, unknown>).expectedSnapshot
    if (
        typeof expectedSnapshot !== "string" ||
        !/^[a-f0-9]{64}$/.test(expectedSnapshot)
    )
        return null
    return { ...reference, expectedSnapshot }
}
