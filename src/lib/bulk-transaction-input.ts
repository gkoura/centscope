import { positiveTransferMoney } from "./transfer-input.ts"
export const MAX_BULK_SELECTED = 2_000
export const MAX_BULK_AFFECTED = 10_000
export type BulkScope = "ONLY" | "FUTURE" | "ALL"
export type BulkOperation =
    "POSTED" | "PENDING" | "CATEGORY" | "WALLET" | "DELETE"
export type BulkInput = {
    accountId: string
    requestId: string
    selected: { id: string; version: number }[]
    operation: BulkOperation
    scope: BulkScope
    targetId: string
    fx: { id: string; sent: string; received: string }[]
}
export type BulkPreview = {
    snapshot: string
    count: number
    changedCount: number
    postedCount: number
    historicalCount: number
    seriesCount: number
    balances: { id: string; wallet: string; currency: string; amount: string }[]
    fx: {
        id: string
        name: string
        date: string
        sent: string
        received: string
        sourceCurrency: string
        destinationCurrency: string
    }[]
}
const id = (v: unknown): v is string =>
    typeof v === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(v)
export function parseBulkInput(raw: unknown): BulkInput {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new Error("Choose transactions and a bulk action.")
    const v = raw as Record<string, unknown>
    if (
        !id(v.accountId) ||
        typeof v.requestId !== "string" ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
            v.requestId
        ) ||
        !["POSTED", "PENDING", "CATEGORY", "WALLET", "DELETE"].includes(
            String(v.operation)
        ) ||
        !["ONLY", "FUTURE", "ALL"].includes(String(v.scope))
    )
        throw new Error("Choose a valid bulk action and scope.")
    if (
        !Array.isArray(v.selected) ||
        !v.selected.length ||
        v.selected.length > MAX_BULK_SELECTED
    )
        throw new Error(
            `Select between 1 and ${MAX_BULK_SELECTED.toLocaleString("en")} transactions.`
        )
    const selected = v.selected
        .map((row: unknown) => {
            if (!row || typeof row !== "object")
                throw new Error("Refresh your selection.")
            const r = row as Record<string, unknown>
            if (
                !id(r.id) ||
                !Number.isInteger(r.version) ||
                Number(r.version) < 1 ||
                Number(r.version) > 2147483646
            )
                throw new Error("Refresh your selection.")
            return { id: r.id, version: Number(r.version) }
        })
        .sort((a, b) => a.id.localeCompare(b.id))
    if (new Set(selected.map((r) => r.id)).size !== selected.length)
        throw new Error("Select each transaction once.")
    if (
        (v.operation === "CATEGORY" || v.operation === "WALLET") &&
        !id(v.targetId)
    )
        throw new Error("Choose the replacement category or wallet.")
    if (
        v.fx !== undefined &&
        (!Array.isArray(v.fx) || v.fx.length > MAX_BULK_AFFECTED)
    )
        throw new Error("Review the FX amounts again.")
    const fx = ((v.fx ?? []) as unknown[])
        .map((row) => {
            if (!row || typeof row !== "object")
                throw new Error("Enter valid actual FX amounts.")
            const r = row as Record<string, unknown>,
                sent =
                    typeof r.sent === "string"
                        ? positiveTransferMoney(r.sent)
                        : null,
                received =
                    typeof r.received === "string"
                        ? positiveTransferMoney(r.received)
                        : null
            if (!id(r.id) || !sent || !received)
                throw new Error(
                    "Enter positive sent and received amounts with at most two decimal places."
                )
            return { id: r.id, sent, received }
        })
        .sort((a, b) => a.id.localeCompare(b.id))
    if (new Set(fx.map((r) => r.id)).size !== fx.length)
        throw new Error("Review each FX transfer once.")
    return {
        accountId: v.accountId,
        requestId: v.requestId,
        selected,
        operation: v.operation as BulkOperation,
        scope: v.scope as BulkScope,
        targetId:
            v.operation === "CATEGORY" || v.operation === "WALLET"
                ? String(v.targetId)
                : "",
        fx,
    }
}
