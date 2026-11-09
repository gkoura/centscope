"use server"
import { parseBulkInput } from "@/lib/bulk-transaction-input"
import {
    BulkError,
    previewBulkTransactions,
    applyBulkTransactions,
} from "@/lib/bulk-transactions"
import { TransferError } from "@/lib/transfer-core"
import { requireVerifiedSession } from "@/lib/auth/session"
import { revalidateWorkspacePath } from "@/lib/workspace-cache-invalidation"
export async function prepareBulkAction(raw: unknown) {
    await requireVerifiedSession()
    let input
    try {
        input = parseBulkInput(raw)
    } catch (error) {
        return { message: (error as Error).message }
    }
    try {
        return { preview: await previewBulkTransactions(input) }
    } catch (error) {
        return {
            message:
                error instanceof BulkError || error instanceof TransferError
                    ? error.message
                    : "Couldn’t prepare these changes. Refresh your selection and retry.",
        }
    }
}
export async function commitBulkAction(
    raw: unknown,
    snapshot: string,
    confirmed: boolean,
    fxConfirmed: boolean
) {
    await requireVerifiedSession()
    let input
    try {
        input = parseBulkInput(raw)
    } catch (error) {
        return { message: (error as Error).message, reviewRequired: true }
    }
    try {
        const result = await applyBulkTransactions(
            input,
            snapshot,
            confirmed === true,
            fxConfirmed === true
        )
        await revalidateWorkspacePath(
            `/dashboard/accounts/${input.accountId}`,
            "layout"
        )
        return { success: true, count: result.count }
    } catch (error) {
        return {
            reviewRequired:
                error instanceof BulkError || error instanceof TransferError,
            message:
                error instanceof BulkError || error instanceof TransferError
                    ? error.message
                    : "Couldn’t confirm these changes. Retry the same confirmation safely, or refresh your selection.",
        }
    }
}
