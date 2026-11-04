"use server"

import {
    createImportPlan,
    verifyImportBatch,
    type ImportPlan,
} from "@/lib/transaction-import-plan"
import { getOwnedFinancialAccount } from "@/lib/financial-accounts"
import { listOwnedAccountWallets } from "@/lib/wallets"
import { listOwnedAccountCategories } from "@/lib/categories"
import {
    MAX_IMPORT_BYTES,
    previewTransactionImport,
} from "@/lib/transaction-import"
import {
    updateOwnedTransaction,
    importOwnedTransactions,
} from "@/lib/transactions"
import { RecurrenceError } from "@/lib/recurrence-engine"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireVerifiedSession } from "@/lib/auth/session"
import {
    validateTransactionReference,
    validateStatusInput,
    validateTransactionInput,
    type TransactionFormState,
} from "@/lib/transaction-input"
import {
    deleteOwnedTransaction,
    createOwnedTransaction,
    changeOwnedTransactionStatus,
    TransactionWriteError,
} from "@/lib/transactions"

export async function createTransaction(
    _state: TransactionFormState,
    form: FormData
): Promise<TransactionFormState> {
    await requireVerifiedSession()
    const result = validateTransactionInput(form)
    if (!result.data) return { errors: result.errors }
    try {
        await createOwnedTransaction(result.data)
    } catch (error) {
        return {
            message:
                error instanceof TransactionWriteError ||
                error instanceof RecurrenceError
                    ? error.message
                    : "We couldn’t save your transaction. Please try again.",
        }
    }
    const path = `/dashboard/accounts/${result.data.financialAccountId}`
    revalidatePath(path, "layout")
    redirect(`${path}/transactions`)
}

export async function changeTransactionStatus(
    _state: TransactionFormState,
    form: FormData
): Promise<TransactionFormState> {
    await requireVerifiedSession()
    const input = validateStatusInput(form)
    if (!input) return { message: "Reload this page and try again." }
    try {
        await changeOwnedTransactionStatus(input)
    } catch (error) {
        return {
            message:
                error instanceof TransactionWriteError ||
                error instanceof RecurrenceError
                    ? error.message
                    : "We couldn’t change the status. Please try again.",
        }
    }
    revalidatePath(`/dashboard/accounts/${input.financialAccountId}`, "layout")
    return {}
}

function importSecret() {
    const secret = process.env.BETTER_AUTH_SECRET
    if (!secret) throw new Error("Import configuration is unavailable.")
    return secret
}

export async function prepareTransactionImport(input: {
    financialAccountId: string
    csv: string
}): Promise<{ plan?: ImportPlan; message?: string }> {
    const { user } = await requireVerifiedSession()
    if (!input || typeof input !== "object")
        return { message: "Choose a valid account and CSV file." }
    // An object keeps large CSV strings outside React's positional-array budget.
    const { financialAccountId, csv } = input
    if (
        typeof financialAccountId !== "string" ||
        !financialAccountId ||
        financialAccountId.length > 128 ||
        typeof csv !== "string" ||
        new TextEncoder().encode(csv).length > MAX_IMPORT_BYTES
    )
        return {
            message: "Choose a valid account and a CSV smaller than 2 MB.",
        }
    const [wallets, categories] = await Promise.all([
        listOwnedAccountWallets(financialAccountId),
        listOwnedAccountCategories(financialAccountId),
    ])
    const preview = previewTransactionImport(
        csv,
        financialAccountId,
        wallets,
        categories
    )
    if (preview.errors.length)
        return { message: preview.errors.slice(0, 5).join(" ") }
    return {
        plan: createImportPlan(
            csv,
            financialAccountId,
            user.id,
            preview.rows,
            importSecret()
        ),
    }
}

export async function importTransactionBatch(
    token: string
): Promise<{ imported?: number; skipped?: number; message?: string }> {
    const { user } = await requireVerifiedSession()
    let batch
    try {
        batch = verifyImportBatch(token, user.id, importSecret())
    } catch {
        return {
            message:
                "This import session is invalid or expired. Upload the same file again to resume safely.",
        }
    }
    try {
        return await importOwnedTransactions(batch.rows, batch.start)
    } catch (error) {
        // Log only an error code, never CSV contents or private financial details.
        const code =
            error && typeof error === "object" && "code" in error
                ? String(error.code)
                : "UNKNOWN"
        if (!(
            error instanceof TransactionWriteError ||
            error instanceof RecurrenceError
        ))
            console.error("Transaction import batch failed", {
                start: batch.start,
                code,
            })
        return {
            message:
                error instanceof TransactionWriteError ||
                error instanceof RecurrenceError
                    ? error.message
                    : `Rows ${batch.start + 2}–${batch.start + batch.rows.length + 1} could not be confirmed. Retry to safely check and continue. Earlier batches remain saved.`,
        }
    }
}

export async function finishTransactionImport(financialAccountId: string) {
    await requireVerifiedSession()
    if (
        typeof financialAccountId === "string" &&
        financialAccountId.length <= 128 &&
        (await getOwnedFinancialAccount(financialAccountId))
    )
        revalidatePath(`/dashboard/accounts/${financialAccountId}`, "layout")
}

export async function updateTransaction(
    _state: TransactionFormState,
    form: FormData
): Promise<TransactionFormState> {
    await requireVerifiedSession()
    const result = validateTransactionInput(form)
    const target = validateStatusInput(form)
    if (!result.data) return { errors: result.errors }
    if (!target) return { message: "Reload this transaction before saving." }
    try {
        await updateOwnedTransaction(
            result.data,
            target.transactionId,
            target.expectedVersion
        )
    } catch (error) {
        return {
            message:
                error instanceof TransactionWriteError ||
                error instanceof RecurrenceError
                    ? error.message
                    : "We couldn’t save your changes. Reload to check the transaction before retrying.",
        }
    }
    const path = `/dashboard/accounts/${result.data.financialAccountId}`
    revalidatePath(path, "layout")
    redirect(`${path}/transactions`)
}

export async function deleteTransaction(
    _state: TransactionFormState,
    form: FormData
): Promise<TransactionFormState> {
    await requireVerifiedSession()
    const input = validateTransactionReference(form)
    if (!input)
        return { message: "Reload this page before deleting a transaction." }
    try {
        await deleteOwnedTransaction(input)
    } catch (error) {
        return {
            message:
                error instanceof TransactionWriteError ||
                error instanceof RecurrenceError
                    ? error.message
                    : "We couldn’t confirm deletion. Retry safely or refresh to check the transaction.",
        }
    }
    revalidatePath(`/dashboard/accounts/${input.financialAccountId}`, "layout")
    return {}
}
