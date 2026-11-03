import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import type { TransactionInput } from "./transaction-input.ts"

export const IMPORT_BATCH_SIZE = 50
const DOMAIN = "fintrack:transaction-import:v1:"
const PLAN_LIFETIME = 24 * 60 * 60 * 1000
export type ImportBatch = { start: number; rows: TransactionInput[] }
export type ImportPlan = { batches: string[]; total: number }

function signature(payload: string, secret: string) {
    return createHmac("sha256", secret)
        .update(DOMAIN)
        .update(payload)
        .digest("base64url")
}

export function createImportPlan(
    csv: string,
    accountId: string,
    userId: string,
    rows: TransactionInput[],
    secret: string,
    now = Date.now()
): ImportPlan {
    const fileKey = createHash("sha256")
        .update(accountId)
        .update("\0")
        .update(csv)
        .digest("hex")
    const normalized = rows.map((row, index) => {
        const hex = createHash("sha256")
            .update(`${fileKey}:${index}`)
            .digest("hex")
        return {
            ...row,
            requestId: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`,
        }
    })
    const batches: string[] = []
    for (let start = 0; start < normalized.length; start += IMPORT_BATCH_SIZE) {
        const payload = Buffer.from(
            JSON.stringify({
                userId,
                accountId,
                expiresAt: now + PLAN_LIFETIME,
                start,
                rows: normalized.slice(start, start + IMPORT_BATCH_SIZE),
            })
        ).toString("base64url")
        batches.push(`${payload}.${signature(payload, secret)}`)
    }
    return { batches, total: rows.length }
}

export function verifyImportBatch(
    token: unknown,
    userId: string,
    secret: string,
    now = Date.now()
): ImportBatch {
    const invalid = () =>
        new Error(
            "This import session is invalid or expired. Upload the same file again to resume safely."
        )
    if (typeof token !== "string" || token.length > 900_000) throw invalid()
    const parts = token.split(".")
    if (parts.length !== 2) throw invalid()
    const [payload, supplied] = parts
    const expected = signature(payload, secret)
    const a = Buffer.from(supplied),
        b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw invalid()
    let data
    try {
        data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    } catch {
        throw invalid()
    }
    if (
        data.userId !== userId ||
        typeof data.expiresAt !== "number" ||
        data.expiresAt <= now ||
        !Number.isInteger(data.start) ||
        data.start < 0 ||
        data.start >= 2000 ||
        !Array.isArray(data.rows) ||
        !data.rows.length ||
        data.rows.length > IMPORT_BATCH_SIZE ||
        data.start + data.rows.length > 2000 ||
        data.rows.some(
            (row: TransactionInput) => row.financialAccountId !== data.accountId
        )
    )
        throw invalid()
    return { start: data.start, rows: data.rows }
}
